import { Logger } from '@nestjs/common';
import type { HydratedDocument, Model, QueryFilter, SortOrder, UpdateQuery } from 'mongoose';
import { BaseAggregateRoot } from '../../domain/aggregates/base-aggregate.js';
import { Page } from '../../application/pagination/page.js';
import { ConflictError, NotFoundError } from '../../domain/errors/errors.js';
import { RsqlParser } from './rsql-parser.js';

/** The fields every stored aggregate has: its id and the version of optimistic concurrency. */
export type StoredDocument = { _id: unknown; version?: number };

/**
 * Persistence of an aggregate E in a Mongo collection of documents D. Subclasses map a document to the aggregate;
 * the base handles the version: documents written before spec 020 have none and count as version 0.
 */
export abstract class MongoBaseRepository<E extends BaseAggregateRoot<{ id: string }>, D extends StoredDocument> {
  private readonly logger = new Logger(MongoBaseRepository.name);

  constructor(
    protected model: Model<D>,
    protected rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<E | null> {
    const doc = await this.model.findById(id);
    return doc ? this.toEntity(doc) : null;
  }

  async findByRsql(
    rsql: string | undefined,
    page: number,
    size: number,
    filter?: QueryFilter<D>,
    sort?: Record<string, SortOrder>,
  ): Promise<Page<E>> {
    const skip = page * size;
    const rsqlParsed = this.rsqlParser.parse(rsql) as QueryFilter<D>;

    let mongoQuery: QueryFilter<D>;
    if (!rsqlParsed || Object.keys(rsqlParsed).length === 0) {
      mongoQuery = filter || {};
    } else if (!filter || Object.keys(filter).length === 0) {
      mongoQuery = rsqlParsed;
    } else {
      mongoQuery = { $and: [rsqlParsed, filter] };
    }

    this.logger.verbose(`Executing MongoDB query: ${JSON.stringify(mongoQuery)} with pagination: page=${page}, size=${size}`);

    const [docs, totalElements] = await Promise.all([
      this.model
        .find(mongoQuery)
        .skip(skip)
        .limit(size)
        .sort(sort || { _id: 1 }),
      this.model.countDocuments(mongoQuery),
    ]);
    return new Page<E>(
      docs.map(doc => this.toEntity(doc)),
      page,
      size,
      totalElements,
    );
  }

  async save(entity: E): Promise<E> {
    const { id, ...rest } = entity.getProps();
    const doc = new this.model({ ...rest, _id: id, version: 0 });
    try {
      await doc.save();
    } catch (error) {
      if (isDuplicateKey(error)) throw new ConflictError(`${id} already exists`, 'duplicate-key');
      throw error;
    }
    return this.toEntity(doc);
  }

  /**
   * Writes the aggregate, provided the stored document is still at the version it was loaded with (otherwise a
   * `version-conflict` ConflictError). Fields that are now undefined are removed.
   */
  async update(entity: E): Promise<E> {
    const { id, ...rest } = entity.getProps();
    const entries = Object.entries(rest);
    // An undefined field was cleared: $unset removes it instead of leaving the old value.
    const $set = Object.fromEntries(entries.filter(([, value]) => value !== undefined));
    const cleared = entries.filter(([, value]) => value === undefined).map(([key]) => key);
    const update: UpdateQuery<D> = { $set, $inc: { version: 1 } } as UpdateQuery<D>;
    if (cleared.length > 0) update.$unset = Object.fromEntries(cleared.map(key => [key, 1])) as UpdateQuery<D>['$unset'];
    // Version 0 also matches the documents stored before versions existed.
    const version = entity.version === 0 ? { $in: [0, null] } : entity.version;
    const filter = { _id: id, version } as QueryFilter<D>;
    const updated = await this.model.findOneAndUpdate(filter, update, { returnDocument: 'after' });
    if (updated) {
      // The caller may keep writing the same aggregate (a round that updates the game twice): it moves to the new version.
      entity.restoreVersion(updated.version ?? 0);
      return this.toEntity(updated);
    }
    if (await this.existsById(id)) {
      throw new ConflictError(`${id} was changed by someone else since version ${entity.version}`, 'version-conflict');
    }
    throw new NotFoundError('Entity', id);
  }

  async deleteById(id: string): Promise<E | null> {
    const result = await this.model.findByIdAndDelete(id);
    return result ? this.toEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.model.exists({ _id: id });
    return exists !== null;
  }

  /** The aggregate of a document, with its version: custom finders of the subclasses use it too. */
  protected toEntity(doc: HydratedDocument<D>): E {
    return this.mapToEntity(doc).restoreVersion(doc.version ?? 0);
  }

  protected abstract mapToEntity(doc: HydratedDocument<D>): E;
}

function isDuplicateKey(error: unknown): boolean {
  return error instanceof Error && error.name === 'MongoServerError' && (error as { code?: number }).code === 11000;
}

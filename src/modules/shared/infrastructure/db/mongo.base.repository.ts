/* eslint-disable @typescript-eslint/no-unsafe-argument */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
import { Logger } from '@nestjs/common';
import { FilterQuery, Model } from 'mongoose';
import { BaseAggregateRoot } from '../../domain/aggregates/base-aggregate';
import { Page } from '../../domain/entities/page.entity';
import { NotFoundError } from '../../domain/errors';
import { RsqlParser } from './rsql-parser';

export abstract class MongoBaseRepository<E extends BaseAggregateRoot<any>, D> {
  private readonly logger = new Logger(MongoBaseRepository.name);

  constructor(
    protected model: Model<D>,
    protected rsqlParser: RsqlParser,
  ) {}

  async findById(id: string): Promise<E | null> {
    const readed = await this.model.findById(id);
    return readed ? this.mapToEntity(readed) : null;
  }
  async findByRsql(rsql: string, page: number, size: number, filter?: FilterQuery<any>, sort?: any): Promise<Page<E>> {
    const skip = page * size;
    const rsqlParsed = this.rsqlParser.parse(rsql);

    let mongoQuery: FilterQuery<any>;
    if (!rsqlParsed || Object.keys(rsqlParsed).length === 0) {
      mongoQuery = filter || {};
    } else if (!filter || Object.keys(filter).length === 0) {
      mongoQuery = rsqlParsed;
    } else {
      mongoQuery = { $and: [rsqlParsed, filter] };
    }

    this.logger.debug(`Executing MongoDB query: ${JSON.stringify(mongoQuery)} with pagination: page=${page}, size=${size}`);

    const [docs, totalElements] = await Promise.all([
      this.model
        .find(mongoQuery)
        .skip(skip)
        .limit(size)
        .sort(sort || { _id: 1 }),
      this.model.countDocuments(mongoQuery),
    ]);
    const content = docs.map((doc) => this.mapToEntity(doc));
    return new Page<E>(content, page, size, totalElements);
  }

  async save(entity: E): Promise<E> {
    const props = entity.getProps();
    const { id, ...rest } = props;
    const model = new this.model({ ...rest, _id: id });
    await model.save();
    return this.mapToEntity(model);
  }

  async update(entityId: string, partialEntity: Partial<E>): Promise<E> {
    const props = partialEntity.getProps ? partialEntity.getProps() : partialEntity;
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id, ...rest } = props;
    const update = { $set: rest } as any;
    const updatedEntity = await this.model.findByIdAndUpdate(entityId, update, { new: true });
    if (!updatedEntity) throw new NotFoundError('Entity', entityId);
    return this.mapToEntity(updatedEntity);
  }

  async deleteById(id: string): Promise<E | null> {
    const result = await this.model.findByIdAndDelete(id);
    return result ? this.mapToEntity(result) : null;
  }

  async existsById(id: string): Promise<boolean> {
    const exists = await this.model.exists({ _id: id });
    return exists !== null;
  }

  protected abstract mapToEntity(doc: D): E;
}

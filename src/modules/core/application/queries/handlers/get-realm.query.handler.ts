import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import * as realmRepository from '../../ports/outbound/realm-repository';
import { Realm } from 'src/modules/core/domain/entities/realm';
import { GetRealmQuery } from '../get-realm.query';
import { NotFoundError } from 'src/modules/core/domain/errors/errors';

@QueryHandler(GetRealmQuery)
export class GetRealmQueryHandler implements IQueryHandler<GetRealmQuery, Realm> {
  constructor(@Inject('RealmRepository') private readonly realmRepository: realmRepository.RealmRepository) {}

  async execute(query: GetRealmQuery): Promise<Realm> {
    const data = await this.realmRepository.findById(query.id);
    if (!data) {
      throw new NotFoundError('Realm', query.id);
    }
    return data;
  }
}

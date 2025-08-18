import { IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import { Inject } from '@nestjs/common';

import * as realmRepository_1 from '../../ports/outbound/realm-repository';
import { Realm } from 'src/modules/core/domain/entities/realm';
import { GetRealmsQuery } from '../get-realms.query';
import { Page } from 'src/modules/core/domain/entities/page';

@QueryHandler(GetRealmsQuery)
export class GetRealmsQueryHandler implements IQueryHandler<GetRealmsQuery, Page<Realm>> {
  constructor(@Inject('RealmRepository') private readonly realmRepository: realmRepository_1.RealmRepository) {}

  async execute(query: GetRealmsQuery): Promise<Page<Realm>> {
    return await this.realmRepository.findByRsql(query.rsql, query.page, query.size);
  }
}

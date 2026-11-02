import { RsqlParser } from '../../../../src/modules/shared/infrastructure/db/rsql-parser.js';
import { InvalidSearchExpression } from '../../../../src/modules/shared/domain/errors/errors.js';

describe('RsqlParser', () => {
  const parser = new RsqlParser();

  it('answers an empty query to an empty or missing expression', () => {
    expect(parser.parse(undefined)).toEqual({});
    expect(parser.parse('')).toEqual({});
  });

  it('maps id to _id and numeric values to numbers, as the handlers query by round', () => {
    expect(parser.parse('id==g-1;round==2')).toEqual({ $and: [{ _id: 'g-1' }, { round: 2 }] });
  });

  it('maps =in= to $in, as the attack handlers query the actors of a round', () => {
    expect(parser.parse('actorId=in=(aragorn,lurtz)')).toEqual({ actorId: { $in: ['aragorn', 'lurtz'] } });
  });

  it('searches =re= as case-insensitive text, not as a pattern', () => {
    expect(parser.parse('name=re=a.b')).toEqual({ name: { $regex: 'a\\.b', $options: 'i' } });
  });

  it('rejects a selector with a Mongo operator', () => {
    expect(() => parser.parse('$where==1')).toThrow(InvalidSearchExpression);
  });
});

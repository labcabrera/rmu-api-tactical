import { Injectable, Logger } from '@nestjs/common';
import { parse } from '@rsql/parser';
import { InvalidSearchExpression } from '../../domain/errors/errors.js';

type MongoQuery = Record<string, unknown>;
type MongoValue = string | number | null;

// @rsql/ast is only a transitive dependency, so its node types are derived from parse().
type ExpressionNode = ReturnType<typeof parse>;
type ComparisonNode = Extract<ExpressionNode, { type: 'COMPARISON' }>;

/** Plain field paths only: no `$` operators, so a selector cannot inject a Mongo operator. */
const SELECTOR_PATTERN = /^[A-Za-z_][A-Za-z0-9_.]*$/;
const MAX_REGEX_LENGTH = 100;

@Injectable()
export class RsqlParser {
  private readonly logger = new Logger(RsqlParser.name);

  public parse(rsql: string | undefined): MongoQuery {
    if (!rsql || rsql.trim() === '') {
      return {};
    }
    this.logger.verbose(`Converting RSQL to MongoDB query: ${rsql}`);
    let node: ExpressionNode;
    try {
      node = parse(rsql);
    } catch (error) {
      throw new InvalidSearchExpression(`Invalid RSQL query: ${rsql}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
    const result = this.processNode(node);
    this.logger.verbose(`Converted MongoDB query: ${JSON.stringify(result)}`);
    return result;
  }

  private processNode(node: ExpressionNode): MongoQuery {
    if (node.type === 'COMPARISON') return this.processComparison(node);
    switch (node.operator) {
      case ';':
        return { $and: [this.processNode(node.left), this.processNode(node.right)] };
      case ',':
        return { $or: [this.processNode(node.left), this.processNode(node.right)] };
      default:
        throw new InvalidSearchExpression(`Unsupported logic operator: ${node.operator}`);
    }
  }

  private processComparison(node: ComparisonNode): MongoQuery {
    let field = node.left.selector;
    if (!SELECTOR_PATTERN.test(field) || field.split('.').some(part => part === '')) {
      throw new InvalidSearchExpression(`Invalid field selector: ${field}`);
    }
    if (field === 'id') field = '_id';
    const raw = node.right.value;
    const value = coerce(Array.isArray(raw) ? raw[0] : raw);

    switch (node.operator) {
      case '==':
        return { [field]: value };
      case '!=':
        // For null, require field exists and is not null (inverse of == null)
        if (value === null) return { [field]: { $ne: null, $exists: true } };
        return { [field]: { $ne: value } };
      case '>':
        return { [field]: { $gt: value } };
      case '>=':
        return { [field]: { $gte: value } };
      case '<':
        return { [field]: { $lt: value } };
      case '<=':
        return { [field]: { $lte: value } };
      case '=in=':
        return { [field]: { $in: toArray(raw).map(coerce) } };
      case '=out=':
        return { [field]: { $nin: toArray(raw).map(coerce) } };
      case '=re=': {
        if (value === null) throw new InvalidSearchExpression('Regex operator cannot be applied to null');
        const text = String(value);
        if (text.length > MAX_REGEX_LENGTH) {
          throw new InvalidSearchExpression(`Regex value longer than ${MAX_REGEX_LENGTH} characters`);
        }
        // Case-insensitive substring match: the value is text, not a pattern.
        return { [field]: { $regex: escapeRegex(text), $options: 'i' } };
      }
      default:
        throw new InvalidSearchExpression(`Unsupported operator: ${node.operator}`);
    }
  }
}

const toArray = (raw: string | string[]): string[] => (Array.isArray(raw) ? raw : [raw]);

/** `null` (any case) becomes null and numeric strings become numbers; anything else stays a string. */
function coerce(raw: string | undefined): MongoValue {
  if (raw === undefined) throw new InvalidSearchExpression('Missing comparison value');
  if (raw.trim().toLowerCase() === 'null') return null;
  if (raw.trim() !== '') {
    const num = Number(raw);
    if (Number.isFinite(num)) return num;
  }
  return raw;
}

function escapeRegex(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

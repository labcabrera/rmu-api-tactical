import { InvalidSearchExpression } from '@domain/errors/errors';
import { parse } from '@rsql/parser';

type MongoQuery = Record<string, any>;

export function toMongoQuery(rsql: string): MongoQuery {
  if (!rsql || rsql.trim() === '') {
    return {};
  }
  try {
    const node: any = parse(rsql);
    return processNode(node);
  } catch (error) {
    throw new InvalidSearchExpression(
      `Invalid RSQL query: ${rsql}. ${error instanceof Error ? error.message : 'Unknown error'}`
    );
  }
}

function processNode(node: any): MongoQuery {
  switch (node.type) {
    case 'LOGIC':
      if (node.operator === ';') {
        if (!node.left || !node.right) {
          throw new InvalidSearchExpression('AND operator requires two operands');
        }
        return { $and: [processNode(node.left), processNode(node.right)] };
      } else if (node.operator === ',') {
        if (!node.left || !node.right) {
          throw new InvalidSearchExpression('OR operator requires two operands');
        }
        return { $or: [processNode(node.left), processNode(node.right)] };
      } else {
        throw new InvalidSearchExpression(`Unsupported logic operator: ${node.operator}`);
      }
    case 'AND':
      if (!node.args || node.args.length === 0) {
        throw new InvalidSearchExpression('AND operator requires at least one argument');
      }
      return { $and: node.args.map(processNode) };
    case 'OR':
      if (!node.args || node.args.length === 0) {
        throw new InvalidSearchExpression('OR operator requires at least one argument');
      }
      return { $or: node.args.map(processNode) };
    case 'COMPARISON': {
      // Handle different possible structures for comparison nodes
      const field = node.left?.selector || node.selector;
      const op = node.operator || node.comparison;
      const value = node.right?.value || (node.arguments ? node.arguments[0] : undefined);

      if (!field) {
        throw new InvalidSearchExpression(`Missing field selector in comparison`);
      }
      if (!op) {
        throw new InvalidSearchExpression(`Missing operator in comparison for field ${field}`);
      }
      if (value === undefined) {
        throw new InvalidSearchExpression(`Missing value for comparison operator ${op} on field ${field}`);
      }

      let processedValue = value;
      if (typeof value === 'string' && !isNaN(Number(value)) && value.trim() !== '') {
        const numValue = Number(value);
        if (Number.isFinite(numValue)) {
          processedValue = numValue;
        }
      }
      switch (op) {
        case '==':
          return { [field]: processedValue };
        case '!=':
          return { [field]: { $ne: processedValue } };
        case '>':
          return { [field]: { $gt: processedValue } };
        case '>=':
          return { [field]: { $gte: processedValue } };
        case '<':
          return { [field]: { $lt: processedValue } };
        case '<=':
          return { [field]: { $lte: processedValue } };
        case '=in=': {
          // For 'in' operations, we need to handle array values
          const values = Array.isArray(value) ? value : [value];
          const inValues = values.map((arg: any) => {
            if (typeof arg === 'string' && !isNaN(Number(arg)) && arg.trim() !== '') {
              const numValue = Number(arg);
              return Number.isFinite(numValue) ? numValue : arg;
            }
            return arg;
          });
          return { [field]: { $in: inValues } };
        }
        case '=out=': {
          // For 'not in' operations, we need to handle array values
          const values = Array.isArray(value) ? value : [value];
          const outValues = values.map((arg: any) => {
            if (typeof arg === 'string' && !isNaN(Number(arg)) && arg.trim() !== '') {
              const numValue = Number(arg);
              return Number.isFinite(numValue) ? numValue : arg;
            }
            return arg;
          });
          return { [field]: { $nin: outValues } };
        }
        case '=re=':
          return { [field]: { $regex: processedValue, $options: 'i' } };
        default:
          throw new Error(`Unsupported operator: ${op}`);
      }
    }
    default:
      throw new Error(`Unsupported node type: ${node.type}`);
  }
}

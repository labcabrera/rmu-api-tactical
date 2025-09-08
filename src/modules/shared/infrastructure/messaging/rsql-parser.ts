/* eslint-disable @typescript-eslint/no-unsafe-return */
/* eslint-disable @typescript-eslint/unbound-method */
/* eslint-disable @typescript-eslint/no-unsafe-call */
/* eslint-disable @typescript-eslint/no-unsafe-assignment */
/* eslint-disable @typescript-eslint/no-unsafe-member-access */

import { Injectable, Logger } from '@nestjs/common';
import { parse } from '@rsql/parser';
import { InvalidSearchExpression } from '../../domain/errors';

type MongoQuery = Record<string, any>;

@Injectable()
export class RsqlParser {
  private readonly logger = new Logger(RsqlParser.name);

  public parse(rsql: string): MongoQuery {
    if (!rsql || rsql.trim() === '') {
      return {};
    }
    this.logger.debug(`Converting RSQL to MongoDB query: ${rsql}`);
    try {
      const node: any = parse(rsql);
      const result = this.processNode(node);
      this.logger.debug(`Converted MongoDB query: ${JSON.stringify(result)}`);
      return result;
    } catch (error) {
      throw new InvalidSearchExpression(`Invalid RSQL query: ${rsql}. ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }

  private processNode(node: any): MongoQuery {
    if (node.left === 'id') {
      node.left = '_id';
    }

    switch (node.type) {
      case 'LOGIC':
        if (node.operator === ';') {
          if (!node.left || !node.right) {
            throw new InvalidSearchExpression('AND operator requires two operands');
          }
          return { $and: [this.processNode(node.left), this.processNode(node.right)] };
        } else if (node.operator === ',') {
          if (!node.left || !node.right) {
            throw new InvalidSearchExpression('OR operator requires two operands');
          }
          return { $or: [this.processNode(node.left), this.processNode(node.right)] };
        } else {
          throw new InvalidSearchExpression(`Unsupported logic operator: ${node.operator}`);
        }
      case 'AND':
        if (!node.args || node.args.length === 0) {
          throw new InvalidSearchExpression('AND operator requires at least one argument');
        }
        return { $and: node.args.map(this.processNode) };
      case 'OR':
        if (!node.args || node.args.length === 0) {
          throw new InvalidSearchExpression('OR operator requires at least one argument');
        }
        return { $or: node.args.map(this.processNode) };
      case 'COMPARISON': {
        // Handle different possible structures for comparison nodes
        let field = node.left?.selector || node.selector;
        // If the field is 'id', convert it to '_id' for MongoDB compatibility
        if (field === 'id') {
          field = '_id';
        }
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
}

import type { Model, PipelineStage } from 'mongoose';
import { type CollectionStats, lastMonths } from '../../domain/collection-stats.js';

type Bucket = { _id: string | null; n: number };
type Facets = { total: { n: number }[]; byStatus?: Bucket[]; byMonth: Bucket[] };

/** Total, count by `statusField` and creations of the last months of a collection, in one aggregation. */
export async function readCollectionStats<T>(model: Model<T>, now: Date, statusField?: string): Promise<CollectionStats> {
  const months = lastMonths(now);
  const facets: Record<string, PipelineStage.FacetPipelineStage[]> = {
    total: [{ $count: 'n' }],
    byMonth: [
      { $match: { createdAt: { $gte: new Date(`${months[0]}-01T00:00:00.000Z`) } } },
      { $group: { _id: { $dateToString: { format: '%Y-%m', date: '$createdAt' } }, n: { $sum: 1 } } },
    ],
  };
  if (statusField) facets.byStatus = [{ $group: { _id: `$${statusField}`, n: { $sum: 1 } } }];
  const [result] = await model.aggregate<Facets>([{ $facet: facets }]);
  const byMonth = new Map(result.byMonth.map(bucket => [bucket._id, bucket.n]));
  return {
    total: result.total[0]?.n ?? 0,
    ...(result.byStatus && { byStatus: Object.fromEntries(result.byStatus.map(bucket => [bucket._id ?? 'unknown', bucket.n])) }),
    createdByMonth: months.map(month => ({ month, count: byMonth.get(month) ?? 0 })),
  };
}

export const GAME_SORT_FIELDS = ['name', 'createdAt'] as const;
export type GameSortField = (typeof GAME_SORT_FIELDS)[number];

/** Accepted values of the `sort` parameter of the game list: a field, descending with a leading `-`. */
export const GAME_SORTS = GAME_SORT_FIELDS.flatMap(field => [field, `-${field}`]);

/** Mongo sort of a `sort` parameter (`name`, `-createdAt`...), with the id as tiebreak. Unknown values keep the default order. */
export const toGameMongoSort = (sort: string | undefined): Record<string, 1 | -1> | undefined => {
  if (!sort) return undefined;
  const descending = sort.startsWith('-');
  const field = descending ? sort.slice(1) : sort;
  if (!GAME_SORT_FIELDS.includes(field as GameSortField)) return undefined;
  return { [field]: descending ? -1 : 1, _id: 1 };
};

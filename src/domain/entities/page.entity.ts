//TODO encapsulate pagination fields

export interface Page<T = any> {
  content: T[];
  page: number;
  size: number;
  total: number;
  totalPages: number;
}

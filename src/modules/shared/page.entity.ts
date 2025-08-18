export interface Page<T = any> {
  content: T[];
  pagination: Pagination;
}

export interface Pagination {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

export class Page<T> {
  public readonly pagination: Pagination;
  constructor(
    public readonly content: T[],
    page: number,
    size: number,
    totalElements: number,
  ) {
    this.pagination = new Pagination(page, size, totalElements, Math.ceil(totalElements / size));
  }
}

export class Pagination {
  constructor(
    public readonly page: number,
    public readonly size: number,
    public readonly totalElements: number,
    public readonly totalPages: number,
  ) {}
}

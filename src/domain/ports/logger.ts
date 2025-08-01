export interface Logger {
  info(msg: string): void;

  error(msg: string): void;

  debug(msg: string): void;
}

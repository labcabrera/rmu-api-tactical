export interface AuthenticatedCommand {
  readonly username: string;
  readonly roles?: string[];
}

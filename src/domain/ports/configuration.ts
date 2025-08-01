export interface Configuration {
  getPort(): number;
  getMongoUri(): string;
  getApiCoreUrl(): string;
  getLogLevel(): string;
  getEnvironment(): string;
  getCorsCorsOrigin(): string;
  getNodeEnv(): string;
}

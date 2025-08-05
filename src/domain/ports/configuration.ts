export interface Configuration {
  getPort(): number;
  getMongoUri(): string;
  getApiCoreUrl(): string;
  getLogLevel(): string;
  getEnvironment(): string;
  getCorsCorsOrigin(): string;
  getNodeEnv(): string;
  getOAuth2ClientId(): string;
  getOAuth2ClientSecret(): string;
  getOAuth2TokenUrl(): string;
  getOAuth2Scope(): string | undefined;
}

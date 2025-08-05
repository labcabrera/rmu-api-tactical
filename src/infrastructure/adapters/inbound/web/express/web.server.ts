import { config } from '@infrastructure/config/config';
import { ExpressApp } from "./express.app";

export class WebServer {
  private port: number;
  private expressApp: ExpressApp;

  constructor() {
    this.port = config.port;
    this.expressApp = new ExpressApp();
  }

  public start(): void {
    this.expressApp.getApp().listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

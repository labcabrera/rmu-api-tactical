import { DependencyContainer } from '@infrastructure/dependency-container';
import { ExpressApp } from "./express.app";

export class WebServer {
  private port: number;
  private expressApp: ExpressApp;

  constructor() {
    const container = DependencyContainer.getInstance();
    this.port = container.configuration.getPort();
    this.expressApp = new ExpressApp();
  }

  public start(): void {
    this.expressApp.getApp().listen(this.port, () => {
      console.log(`Server running on port ${this.port}`);
    });
  }
}

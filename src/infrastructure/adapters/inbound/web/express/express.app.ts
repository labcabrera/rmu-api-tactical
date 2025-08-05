import cors from "cors";
import express, { Application, NextFunction, Request, Response } from "express";
import fs from "fs";
import mongoose from "mongoose";
import path from "path";
import swaggerUi from "swagger-ui-express";
import yaml from "yaml";

import { DependencyContainer } from '@infrastructure/dependency-container';
import { ApiRoutes } from "../routes";

export class ExpressApp {
  private app: Application;
  private apiRoutes: ApiRoutes;

  constructor() {
    this.app = express();
    this.apiRoutes = new ApiRoutes();
    this.initializeMiddleware();
    this.initializeDatabase();
    this.initializeRoutes();
    //TODO update spec and fix
    // this.initializeSwagger();
    this.initializeErrorHandling();
  }

  private initializeMiddleware(): void {
    this.app.use(express.json());
    this.app.use(cors());
  }

  private initializeDatabase(): void {
    const container = DependencyContainer.getInstance();
    const mongoUri = container.configuration.getMongoUri();

    mongoose
      .connect(mongoUri)
      .then(() => console.log("Connected to " + mongoUri))
      .catch((err: Error) =>
        console.log("Error connecting to " + mongoUri, err),
      );
  }

  private initializeRoutes(): void {
    this.app.use("/v1", this.apiRoutes.getRouter());
    this.app.get("/", (req: Request, res: Response) => {
      res.redirect("/api-docs");
    });
  }

  private initializeSwagger(): void {
    try {
      const openapiFilePath: string = path.join(
        __dirname,
        "../../../../../openapi.yaml",
      );
      console.log("Loading OpenAPI documentation...");
      const openapiFile: string = fs.readFileSync(openapiFilePath, "utf8");
      const swaggerDocument = yaml.parse(openapiFile);

      this.app.use(
        "/api-docs",
        swaggerUi.serve,
        swaggerUi.setup(swaggerDocument),
      );
    } catch (error) {
      console.warn("Could not load OpenAPI documentation:", error);
    }
  }

  private initializeErrorHandling(): void {
    this.app.use((req: Request, res: Response, next: NextFunction) => {
      res.status(404).json({
        code: "404",
        message: "Invalid path",
        timestamp: new Date().toISOString(),
      });
    });
  }

  public getApp(): Application {
    return this.app;
  }
}

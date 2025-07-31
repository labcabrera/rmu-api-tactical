import { Response } from "express";

//TODO map errors to specific HTTP status codes

export class ErrorHandler {
  static sendErrorResponse(res: Response, error: Error): void {
    console.error("Error:", error.message);
    console.error("Stack:", error.stack);

    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message,
    });
  }
}

import winston from "winston";
import { Logger } from "../../domain/ports/Logger";

export class WinstonLogger implements Logger {
    private logger = winston.createLogger({
        level: "info",
        format: winston.format.combine(
            winston.format.timestamp(),
            winston.format.printf(({ timestamp, level, message }) => {
                return `[${timestamp}] ${level.toUpperCase()}: ${message}`;
            })
        ),
        transports: [new winston.transports.Console()]
    });

    info(msg: string) {
        this.logger.info(msg);
    }

    error(msg: string) {
        this.logger.error(msg);
    }

    debug(msg: string) {
        this.logger.debug(msg);
    }
}
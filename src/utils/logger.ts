import winston from "winston";

const createLogger = () => {
  if (process.env.NODE_ENV === "test") {
    // Use a silent logger for tests
    return winston.createLogger({ silent: true });
  }

  const logFormat = winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json(),
    winston.format.printf(({ timestamp, level, message, ...meta }) => {
      return JSON.stringify({
        timestamp,
        level,
        message,
        ...meta,
      });
    }),
  );

  const logger = winston.createLogger({
    level: process.env.LOG_LEVEL || "info",
    format: logFormat,
    defaultMeta: { service: "lendsqr-wallet" },
    transports: [
      new winston.transports.File({ filename: "logs/error.log", level: "error" }),
      new winston.transports.File({ filename: "logs/combined.log" }),
    ],
  });

  if (process.env.NODE_ENV !== "production") {
    logger.add(
      new winston.transports.Console({
        format: winston.format.combine(winston.format.colorize(), winston.format.simple()),
      }),
    );
  }

  return logger;
};

export const logger = createLogger();
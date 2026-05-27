import pino from "pino";
import { env } from "./env";

const transport = env.NODE_ENV === "development"
  ? { target: "pino-pretty", options: { colorize: true, translateTime: "HH:MM:ss" } }
  : undefined;

export const logger = pino({
  level: env.NODE_ENV === "production" ? "info" : "debug",
  transport,
  redact: ["req.headers.authorization", "req.headers.cookie", "body.password", "body.secret"],
  serializers: {
    req: (req) => ({
      method: req.method,
      url: req.url,
      requestId: req.headers?.["x-request-id"],
    }),
    res: (res) => ({
      statusCode: res.statusCode,
    }),
    err: pino.stdSerializers.err,
  },
});

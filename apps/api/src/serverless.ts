import { createServer } from "http";
import { createApp } from "./app";

let appPromise: ReturnType<typeof createApp> | null = null;

const getApp = () => {
  if (!appPromise) {
    appPromise = createApp();
  }
  return appPromise;
};

export default async function handler(req: any, res: any) {
  const app = getApp();
  const server = createServer(app);
  server.emit("request", req, res);
}

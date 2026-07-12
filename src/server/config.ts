import path from "node:path";

export type AppConfig = {
  host: string;
  port: number;
  dictionaryPath: string;
};

export function loadConfig(): AppConfig {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number.parseInt(process.env.PORT || "3100", 10);
  const dictionaryPath = path.resolve(process.env.DICTIONARY_PATH || "./data/dictionary.json");

  return {
    host,
    port: Number.isFinite(port) ? port : 3100,
    dictionaryPath
  };
}

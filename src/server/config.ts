import path from "node:path";

export type AppConfig = {
  host: string;
  port: number;
  dictionaryPath: string;
  leakDetection: LeakDetectionConfig;
};

export type LeakDetectionConfig = {
  enabled: boolean;
  provider: string;
  presidioAnalyzerUrl: string;
  defaultLanguage: string;
  supportedLanguages: string[];
  scoreThreshold: number;
  ignoredEntities: string[];
};

export function loadConfig(): AppConfig {
  const host = process.env.HOST || "127.0.0.1";
  const port = Number.parseInt(process.env.PORT || "3100", 10);
  const dictionaryPath = path.resolve(process.env.DICTIONARY_PATH || "./data/dictionaries.json");
  const provider = (process.env.LEAK_DETECTION_PROVIDER || "presidio").trim().toLocaleLowerCase();
  const defaultLanguage = normalizeLanguage(process.env.PRESIDIO_DEFAULT_LANGUAGE) || "en";
  const supportedLanguages = parseLanguages(process.env.PRESIDIO_SUPPORTED_LANGUAGES || "en", defaultLanguage);
  const scoreThreshold = parseScoreThreshold(process.env.PRESIDIO_SCORE_THRESHOLD);
  const ignoredEntities = parseEntityTypes(process.env.PRESIDIO_IGNORED_ENTITIES);

  return {
    host,
    port: Number.isFinite(port) ? port : 3100,
    dictionaryPath,
    leakDetection: {
      enabled: parseBoolean(process.env.LEAK_DETECTION_ENABLED, false) && provider !== "disabled",
      provider,
      presidioAnalyzerUrl: (process.env.PRESIDIO_ANALYZER_URL || "http://127.0.0.1:5002").replace(/\/+$/, ""),
      defaultLanguage,
      supportedLanguages,
      scoreThreshold,
      ignoredEntities
    }
  };
}

function parseBoolean(value: string | undefined, fallback: boolean): boolean {
  if (value === undefined) {
    return fallback;
  }

  return ["1", "true", "yes", "on"].includes(value.trim().toLocaleLowerCase());
}

function parseScoreThreshold(value: string | undefined): number {
  const parsed = Number.parseFloat(value || "0.5");
  return Number.isFinite(parsed) && parsed >= 0 && parsed <= 1 ? parsed : 0.5;
}

function parseLanguages(value: string, defaultLanguage: string): string[] {
  const languages = value
    .split(",")
    .map(normalizeLanguage)
    .filter((language): language is string => Boolean(language));

  return [...new Set([defaultLanguage, ...languages])];
}

function parseEntityTypes(value: string | undefined): string[] {
  return [...new Set((value ?? "DATE_TIME")
    .split(",")
    .map((entity) => entity.trim().toUpperCase())
    .filter(Boolean))];
}

function normalizeLanguage(value: string | undefined): string | undefined {
  const normalized = value?.trim().toLocaleLowerCase();
  return normalized && /^[a-z]{2,3}(?:-[a-z0-9]+)*$/.test(normalized) ? normalized : undefined;
}

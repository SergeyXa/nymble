import path from "node:path";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import Fastify from "fastify";
import fastifyCompress from "@fastify/compress";
import fastifyStatic from "@fastify/static";
import { loadConfig } from "./config.js";
import { JsonDictionaryStore, DictionaryValidationError } from "./dictionaryStore.js";
import { composerPage, dictionariesPage } from "./pages.js";
import { depersonalize, personalize } from "./transform.js";
import type { SaveDictionary, TransformDirection } from "./types.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const sourceRoot = path.resolve(__dirname, "..");
const projectRoot = path.resolve(sourceRoot, "..");
const staticRoot = existsSync(path.join(projectRoot, "dist", "static"))
  ? path.join(projectRoot, "dist", "static")
  : path.join(projectRoot, "src", "static");
const mediaRoot = existsSync(path.join(projectRoot, "dist", "media"))
  ? path.join(projectRoot, "dist", "media")
  : path.join(projectRoot, "media");

const config = loadConfig();
const dictionaryStore = new JsonDictionaryStore(config.dictionaryPath);

const app = Fastify({
  logger: {
    level: "info",
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          hostname: request.hostname,
          remoteAddress: request.ip
        };
      }
    }
  }
});

await app.register(fastifyCompress, {
  encodings: ["br", "gzip", "deflate"]
});

await app.register(fastifyStatic, {
  root: staticRoot,
  prefix: "/static/"
});

await app.register(fastifyStatic, {
  root: mediaRoot,
  prefix: "/media/",
  decorateReply: false
});

app.get("/apple-touch-icon.png", async (_request, reply) => {
  return reply.sendFile("ios/apple-touch-icon-180x180.png", mediaRoot);
});

app.get("/", async (_request, reply) => {
  return reply.type("text/html").send(composerPage());
});

app.get("/dictionaries", async (_request, reply) => {
  return reply.type("text/html").send(dictionariesPage());
});

app.get("/api/health", async () => ({ ok: true }));

app.get("/api/dictionaries", async () => dictionaryStore.getDictionary());

app.put<{ Body: { dictionaries?: SaveDictionary[] } }>("/api/dictionaries", async (request, reply) => {
  try {
    return await dictionaryStore.saveDictionary(request.body.dictionaries || []);
  } catch (error) {
    if (error instanceof DictionaryValidationError) {
      return reply.code(400).send({ error: error.message });
    }
    throw error;
  }
});

app.post<{ Body: { direction?: TransformDirection; dictionaryId?: string; text?: string } }>(
  "/api/transform",
  async (request, reply) => {
  const direction = request.body.direction;
  const dictionaryId = request.body.dictionaryId;
  const text = request.body.text || "";

  if (direction !== "depersonalize" && direction !== "personalize") {
    return reply.code(400).send({ error: "Unknown transform direction" });
  }

  if (!dictionaryId) {
    return reply.code(400).send({ error: "dictionaryId is required" });
  }

  const dictionaries = await dictionaryStore.getDictionary();
  const dictionary = dictionaries.dictionaries.find((item) => item.id === dictionaryId);
  if (!dictionary) {
    return reply.code(404).send({ error: "Dictionary not found" });
  }

  return direction === "depersonalize"
    ? depersonalize(text, dictionary.entries)
    : personalize(text, dictionary.entries);
  }
);

try {
  await app.listen({ host: config.host, port: config.port });
} catch (error) {
  app.log.error(error);
  process.exit(1);
}

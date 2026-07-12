import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const templatesRoot = path.join(path.dirname(fileURLToPath(import.meta.url)), "templates");
const documentTemplate = readTemplate("document.html");

export function composerPage(): string {
  return renderPage("Nymble", "composer.html");
}

export function dictionariesPage(): string {
  return renderPage("Nymble: Dictionaries", "dictionaries.html");
}

function renderPage(title: string, contentTemplate: string): string {
  return documentTemplate.replace("{{title}}", title).replace("{{content}}", readTemplate(contentTemplate));
}

function readTemplate(name: string): string {
  return readFileSync(path.join(templatesRoot, name), "utf8");
}

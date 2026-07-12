# Nymble MVP Summary

## 1. Назначение проекта

Nymble — self-hosted web composer для быстрой деперсонализации текста перед отправкой в AI-инструменты и обратной персонализации ответа после просмотра.

Базовая идея:

```text
real text -> semantic placeholders
semantic placeholders -> real text
```

Пример:

```text
John Smith wrote to Acme Ltd.
```

becomes:

```text
{CEO} wrote to {T company}.
```

И обратно:

```text
Ask {CEO} about {T company}.
```

becomes:

```text
Ask John Smith about Acme Ltd.
```

Главная ценность MVP — максимально быстрый, легкий и понятный composer в стиле Google Translate.

## 2. Текущее важное решение

Текущую реализацию нужно пересоздать проще.

Не использовать пока:

- Vite;
- React;
- MUI;
- сложную панель управления;
- сложную модель словаря;
- Docker;
- Presidio;
- deployment-oriented setup.

Причина: сервер ограничен по ресурсам, Vite dev-server может создавать слишком большой memory pressure. MVP должен запускаться сразу через Fastify и быть легким визуально и технически.

## 3. Source and runtime paths

Source code:

```text
/srv/code/nymble
```

На первом этапе приложение запускается прямо из папки кода.

Runtime data в будущем:

```text
/srv/nymble
```

Но для начальной dev-версии допустимо хранить SQLite в:

```text
./data/app.sqlite
```

Реальные словари, `.env`, SQLite database, logs и backups не должны попадать в git.

## 4. Stack for the rewritten MVP

Use:

```text
Node.js 24+
TypeScript
Fastify
SQLite
Plain HTML/CSS/JS served by Fastify
```

Frontend должен быть простым статическим интерфейсом, который Fastify отдает напрямую.

Допустимо:

- один небольшой CSS file;
- один небольшой browser JS file;
- native browser APIs;
- no bundler.

Не требуется:

- SPA framework;
- frontend build step;
- component library;
- client-side routing framework.

## 5. Pages

В MVP должно быть ровно две страницы.

### 5.1 Main composer page

Route:

```text
GET /
```

Главная страница должна быть предельно легковесной и похожей по структуре на Google Translate после удаления нерелевантных для Nymble элементов.

На странице:

```text
[source mode]       [destination mode]
[left text area]    [right text area]
```

Modes:

```text
Real text
Placeholders
```

There are only two meaningful directions:

```text
Real text -> Placeholders
Placeholders -> Real text
```

UX requirements:

- two large text areas side by side on desktop;
- stacked vertically on mobile;
- mode labels above the text areas;
- a swap direction button;
- a copy result button;
- a clear button;
- optional paste button if implemented cleanly;
- a small edit dictionary button/link on the main page;
- no visible dictionary management UI on the main page;
- no heavy cards, dense forms, sidebars, dashboards, or admin panels.

The main page should feel like a focused writing tool, not like a settings console.

### 5.2 Dictionary edit page

Route:

```text
GET /dictionary
```

This page is only for editing the replacement dictionary.

There should be one obvious way back to the main composer:

```text
Back to composer
```

The main page should link here through a small edit button.

## 6. Dictionary design

The dictionary model must be as simple as possible.

MVP dictionary concept:

```text
placeholder -> many values
```

Example:

```text
{CEO}
  John Smith
  John
  Mr. Smith

{T company}
  Acme Ltd
  Acme
```

Do not include in MVP:

- entity type;
- display name;
- notes;
- enabled/disabled flags;
- multiple dictionaries;
- dictionary descriptions;
- aliases as a separate concept from values;
- match mode UI;
- case sensitivity UI;
- archive state;
- audit/history.

Terminology:

- `placeholder` is the semantic placeholder such as `{CEO}`;
- `value` is any real-world string that should map to that placeholder;
- the first value for a placeholder is the primary value used for personalization.

## 7. Minimal database model

SQLite file:

```text
./data/app.sqlite
```

Initial tables:

### placeholders

```text
id
placeholder
created_at
updated_at
```

Constraints:

- `placeholder` is unique;
- placeholder should look like `{CEO}` or `{T company}`;
- placeholders may contain spaces;
- placeholders should not contain nested braces or newlines.

### placeholder_values

```text
id
placeholder_id
value
position
created_at
updated_at
```

Constraints:

- one placeholder has many values;
- values are ordered by `position`;
- first value by position is the primary personalization value;
- empty values are not stored.

No real sensitive values should be committed to source control.

## 8. Dictionary editor UX

The dictionary editor should be visually and technically simple.

Suggested layout:

```text
[Back to composer]

Placeholder        Values
{CEO}              John Smith
                   John
                   Mr. Smith

{T company}        Acme Ltd
                   Acme
```

Editing can be implemented as either:

- one row/form per placeholder;
- or a very simple list where each placeholder has a textarea with one value per line.

Required actions:

- add placeholder;
- edit placeholder text;
- edit values as newline-separated strings;
- delete placeholder;
- save.

Avoid modal-heavy UI unless it is simpler than inline editing.

No entity metadata in MVP.

## 9. Transformation logic

The system supports two directions.

### 9.1 Real text -> Placeholders

Rules:

1. Load all placeholders and their values.
2. Build replacement candidates from all values.
3. Sort candidates by descending value length.
4. Replace longest matches first.
5. Do not replace text inside existing `{placeholder}` blocks.
6. Use case-insensitive matching by default.
7. Preserve placeholder text exactly as configured.
8. Return transformed text and basic replacement metadata.

Example:

```text
John Smith wrote to Acme Ltd.
```

becomes:

```text
{CEO} wrote to {T company}.
```

Longer match wins:

```text
Acme Ltd
```

must be replaced before:

```text
Acme
```

### 9.2 Placeholders -> Real text

Rules:

1. Load all placeholders.
2. Replace each placeholder with its first value by position.
3. Unknown placeholders remain unchanged.
4. Unknown placeholders are reported as warnings.

Example:

```text
Ask {CEO} about {T company}.
```

becomes:

```text
Ask John Smith about Acme Ltd.
```

Unknown:

```text
Ask {unknown person}.
```

stays unchanged and produces a warning.

## 10. API

Fastify should serve both pages and JSON API.

### Health

```http
GET /api/health
```

Response:

```json
{ "ok": true }
```

### Get dictionary

```http
GET /api/dictionary
```

Response shape:

```json
{
  "entries": [
    {
      "id": "placeholder-id",
      "placeholder": "{CEO}",
      "values": [
        { "id": "value-id", "value": "John Smith", "position": 0 },
        { "id": "value-id", "value": "John", "position": 1 }
      ]
    }
  ]
}
```

### Save dictionary

For MVP, prefer one simple bulk save endpoint instead of many CRUD endpoints.

```http
PUT /api/dictionary
```

Request:

```json
{
  "entries": [
    {
      "placeholder": "{CEO}",
      "values": ["John Smith", "John"]
    }
  ]
}
```

Behavior:

- validate placeholders;
- remove empty placeholders;
- remove empty values;
- replace current dictionary with submitted dictionary in one transaction;
- return saved dictionary.

### Transform

```http
POST /api/transform
```

Request:

```json
{
  "direction": "depersonalize",
  "text": "John Smith wrote to Acme Ltd."
}
```

Direction values:

```text
depersonalize
personalize
```

Response:

```json
{
  "resultText": "{CEO} wrote to {T company}.",
  "replacements": [
    {
      "sourceText": "John Smith",
      "replacementText": "{CEO}",
      "placeholder": "{CEO}",
      "start": 0,
      "end": 10
    }
  ],
  "warnings": [],
  "unresolvedPlaceholders": []
}
```

## 11. Clipboard behavior

Main page should include:

- copy result;
- clear input/output;
- optional paste input.

Clipboard API can fail depending on browser, HTTPS, permissions, or mobile behavior.

If clipboard access fails:

- show a small clear message;
- keep text selectable manually;
- do not break the workflow.

## 12. Security requirements

Nymble processes sensitive text.

Do not log:

- input text;
- output text;
- dictionary values;
- request bodies for transform/dictionary endpoints.

Source repository must not contain:

- real dictionary data;
- `.env`;
- SQLite database;
- private certificates;
- production logs;
- backups.

The app should bind to localhost by default:

```text
127.0.0.1:3100
```

External access, if needed, should go through nginx/mTLS.

## 13. Resource constraints

The server may have limited RAM and may not have swap.

Avoid dev tooling that performs heavy optimization or file watching.

Do not use Vite for this MVP.

Prefer:

- Fastify serving static files;
- small browser JS;
- simple CSS;
- no heavy client dependencies.

If a dev watcher is used, it should be optional. The app should be runnable with a plain Node command after TypeScript compilation, or with a lightweight TypeScript runner during development.

## 14. Suggested source structure

```text
/srv/code/nymble/
  README.md
  package.json
  .gitignore
  .env.example
  Summary.md

  src/
    server/
      index.ts
      config.ts
      db.ts
      dictionaryStore.ts
      transform.ts
      routes/
        pages.ts
        api.ts

    public/
      app.css
      composer.js
      dictionary.js
```

Alternative small structures are acceptable if the implementation remains easy to read.

## 15. First demo flow

1. Start Fastify.
2. Open `/`.
3. Click edit dictionary.
4. Add placeholder:

```text
{CEO}
```

with values:

```text
John Smith
John
```

5. Add placeholder:

```text
{T company}
```

with values:

```text
Acme Ltd
Acme
```

6. Return to composer.
7. Select/keep direction:

```text
Real text -> Placeholders
```

8. Input:

```text
John Smith wrote to Acme Ltd yesterday.
```

9. Output:

```text
{CEO} wrote to {T company} yesterday.
```

10. Swap direction.
11. Input:

```text
I suggest asking {CEO} about {T company}.
```

12. Output:

```text
I suggest asking John Smith about Acme Ltd.
```

13. Unknown placeholder:

```text
Please ask {unknown person}.
```

should stay unchanged and show a warning.

## 16. Non-goals for MVP

Do not implement now:

- Vite;
- React;
- MUI;
- browser extension;
- Android overlay;
- Presidio;
- NER/PII detection;
- multiple dictionaries;
- import/export;
- user accounts;
- Docker;
- production deployment;
- encrypted storage.

## 17. Future roadmap

After the lightweight MVP works:

1. Improve visual highlighting of replacements.
2. Add import/export.
3. Add multiple dictionaries with precedence order.
4. Add Presidio or another detector for possible leaks.
5. Add custom recognizers for money, domains, URLs, percentages, internal codes.
6. Add “create dictionary entry from warning”.
7. Add production service setup and `/srv/nymble` runtime directory.
8. Add Android companion app only after the web workflow is genuinely useful.

## 18. Implementation principle

The MVP should be boring, small, and useful.

The main page is the product.

The dictionary page is only a simple editor for:

```text
placeholder -> values
```

Anything that does not directly support that flow should wait.

export function composerPage(): string {
  return html("Nymble", `
    <main class="container composer-page py-4 py-lg-5">
      <header class="d-flex align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-1">Nymble</h1>
          <p class="text-secondary mb-0">Depersonalize text before sharing it with AI tools.</p>
        </div>
        <div class="d-flex flex-wrap justify-content-end gap-2">
          <button id="clearButton" class="btn btn-primary btn-sm icon-button" type="button" aria-label="Clear" title="Clear">
            <i class="bi bi-x-lg" aria-hidden="true"></i>
          </button>
          <a class="btn btn-outline-secondary btn-sm" href="/dictionary">Edit dictionary</a>
        </div>
      </header>

      <section class="composer-shell border rounded-3 bg-white shadow-sm">
        <div class="composer-grid">
          <div class="pane-header pane-header-left">
            <div id="sourceTabs" class="nav nav-tabs nav-tabs-compact" role="tablist" aria-label="Source"></div>
            <button id="pasteButton" class="btn btn-outline-primary btn-sm icon-button" type="button" aria-label="Paste" title="Paste">
              <i class="bi bi-box-arrow-in-down-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="source-editor editor-cell">
            <textarea id="sourceText" class="form-control composer-textarea" autofocus spellcheck="true" placeholder="Paste text here"></textarea>
          </div>
          <div class="swap-cell">
            <button id="swapButton" class="btn btn-secondary btn-sm icon-button" type="button" aria-label="Swap direction" title="Swap direction">
              <i class="bi bi-arrow-left-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="pane-header pane-header-right">
            <div id="targetTabs" class="nav nav-tabs nav-tabs-compact" role="tablist" aria-label="Target"></div>
            <button id="copyButton" class="btn btn-outline-primary btn-sm icon-button" type="button" aria-label="Copy" title="Copy">
              <i class="bi bi-box-arrow-up-right" aria-hidden="true"></i>
            </button>
          </div>
          <div class="target-editor editor-cell">
            <textarea id="resultText" class="form-control composer-textarea" readonly placeholder="Result appears here"></textarea>
          </div>
        </div>
      </section>

      <section class="mt-3 d-flex flex-column flex-lg-row gap-2 justify-content-between">
        <div id="warnings"></div>
        <span id="status" class="small text-secondary" role="status"></span>
      </section>
    </main>
    <script src="/static/composer.js"></script>
  `);
}

export function dictionaryPage(): string {
  return html("Dictionary - Nymble", `
    <main class="container py-4 py-lg-5">
      <header class="dictionary-header d-flex align-items-center justify-content-between gap-3 mb-4">
        <div>
          <h1 class="h3 mb-1">Dictionary</h1>
          <p class="text-secondary mb-0">Each dictionary has a short name and placeholder values.</p>
        </div>
        <div class="d-flex flex-wrap justify-content-end gap-2">
          <button class="btn btn-primary btn-sm" type="submit" form="dictionaryForm">Save</button>
          <a class="btn btn-outline-secondary btn-sm icon-button" href="/" aria-label="Back to composer" title="Back to composer">
            <i class="bi bi-arrow-left" aria-hidden="true"></i>
          </a>
        </div>
      </header>

      <form id="dictionaryForm" class="vstack gap-3">
        <div id="dictionaries" class="vstack gap-4"></div>
        <div class="d-flex flex-wrap gap-2">
          <button id="addDictionaryButton" class="btn btn-outline-primary" type="button">Add dictionary</button>
          <span id="status" class="small text-secondary align-self-center" role="status"></span>
        </div>
      </form>
    </main>

    <template id="dictionaryTemplate">
      <section class="dictionary-block border rounded-3 bg-white shadow-sm p-3">
        <div class="dictionary-block-header d-flex flex-column flex-lg-row align-items-lg-end gap-3 mb-3">
          <div class="flex-grow-1">
            <label class="form-label">Dictionary name</label>
            <input class="form-control dictionary-name-input" maxlength="32" placeholder="Client A" />
          </div>
          <div class="d-flex gap-2">
            <button class="btn btn-outline-danger delete-dictionary-button icon-button" type="button" aria-label="Delete dictionary" title="Delete dictionary">
              <i class="bi bi-trash" aria-hidden="true"></i>
            </button>
          </div>
        </div>
        <div class="entries vstack gap-3"></div>
        <div class="d-flex justify-content-end mt-3">
          <button class="btn btn-outline-primary add-entry-button icon-button" type="button" aria-label="Add placeholder" title="Add placeholder">
            <i class="bi bi-plus-lg" aria-hidden="true"></i>
          </button>
        </div>
      </section>
    </template>

    <template id="entryTemplate">
      <section class="dictionary-entry border rounded-3 p-3">
        <div class="row g-3">
          <div class="col-lg-4">
            <label class="form-label">Placeholder</label>
            <input class="form-control placeholder-input" placeholder="{CEO}" />
          </div>
          <div class="col-lg-8">
            <label class="form-label">Values</label>
            <textarea class="form-control values-input" rows="4" placeholder="John Smith&#10;John"></textarea>
          </div>
        </div>
        <div class="text-end mt-3">
          <button class="btn btn-outline-danger btn-sm delete-entry-button icon-button" type="button" aria-label="Delete placeholder" title="Delete placeholder">
            <i class="bi bi-trash" aria-hidden="true"></i>
          </button>
        </div>
      </section>
    </template>

    <script src="/static/dictionary.js"></script>
  `);
}

function html(title: string, body: string): string {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${title}</title>
    <link rel="icon" href="/static/nymble-icon.svg" type="image/svg+xml" />
    <link rel="stylesheet" href="/vendor/bootstrap/css/bootstrap.min.css" />
    <link rel="stylesheet" href="/vendor/bootstrap-icons/bootstrap-icons.css" />
    <link rel="stylesheet" href="/static/app.css" />
  </head>
  <body>
    ${body}
  </body>
</html>`;
}

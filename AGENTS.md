# AGENTS.md

Static vanilla-JS wedding gift-list site (pt-BR). No build step, no package
manager, no tests, no linter — don't add tooling.

## Run

- Serve locally (avoids CORS/file:// issues): `./serve.sh` (port arg optional,
  default 8000, opens browser). Equivalent: `python3 -m http.server 8000`.

## Architecture

- `app.js` is the only logic. The backend is a **Google Apps Script web app**
  (`code.gs` in this repo is the source; paste to the Apps Script editor and
  Create new deployment). `API_URL` (app.js:1) is the deployed macro URL —
  don't change it unless you also redeploy the Apps Script.
- Backend reads/writes a Google Spreadsheet with two tabs (`CONFIG` in code.gs):
  - **Presentes** (columns): `id` | `categoria` | `nome` | `valor` | `unidades_total` | `unidades_disponiveis` | `url_imagem`
  - **Reservas** (columns): `id` | `presente_id` | `nome` | `contato` | `data`
  - Gifts are NOT hardcoded — filter/dedup if you change the tab's values;
    `tipo_contato` sent by the frontend is **ignored** (not stored), only
    `reservar` writes, one row per guest in Reservas.
- Cards/messages are rendered by building `innerHTML` strings. Always escape
  data-derived values with `escapeHtml()` (app.js:406).
- Guest identity persists in `localStorage` under the key `convidado`.

## Frontend-backend contract

- GET `?action=presentes` → `{ success, presentes: [{ id, nome, categoria, valor, unidades_total, unidades_disponiveis, url_imagem }] }`
- GET `?action=minha-reserva&contato=...` → `{ success, reservas: [...], error? }`
- POST reservation: `Content-Type: text/plain;charset=utf-8`, body JSON
  `{ action: 'reservar', presente_id, nome, contato, tipo_contato }`
  where `tipo_contato` is `'email'` if contato contains `@`, else `'telefone'`.
- All responses use a `{ success, error }` envelope; `data.error` is the
  user-facing message shown directly to guests.

## Conventions

- All UI copy, comments, errors, and currency formatting are Brazilian
  Portuguese (`Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' })`).
- Match existing style: 4-space indent, semicolons, `// ===` section banners,
  blank line after `{` in function bodies.

## Visual identity

- Brand palette (CSS variables in `style.css`, `:root`):
  `--burgundy #6D0101`, `--burgundy-dark #580000`, `--green #002C22`,
  `--sage #54634A`, `--background #FAFAFA`. Use the variables, never raw hex.
- Google Fonts, loaded in `index.html` head: **Aboreto** for headings
  (`h1/h2/h3`), **Outfit** for body and UI. Keep both loaded and don't
  replace them without approval.
- Burgundy = primary (buttons, prices, header title). Deep green = secondary
  (active category, labels, secondary button). Sage = muted text.
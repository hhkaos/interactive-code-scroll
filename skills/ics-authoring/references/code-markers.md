# Code markers

Markers are comments in the files under `code/`. They tell the code panel what to highlight and what readers can edit, and are stripped from everything readers see or download. The files stay valid and runnable without this tool.

## Regions

Wrap the lines a step highlights, in the file's own comment syntax:

```js
// #region config
const title = "Checkout";
// #endregion config
```

```html
<!-- #region app -->
<main id="app"></main>
<!-- #endregion app -->
```

```css
/* #region layout */
main { display: grid; }
/* #endregion layout */
```

```sh
# #region setup
npm install
# #endregion setup
```

Native styles, only in their own file types:

| Files | Style |
|---|---|
| `.cs` | `#region id` / `#endregion` |
| `.py` | `# region id` / `# endregion` |
| `.sql`, `.lua` | `-- #region id` / `-- #endregion` |

Rules: ids unique per file; regions may nest; empty regions fail; a closing id, when given, must match. With variants, the same region id in every variant (in whichever file) is the contract, and within a variant an id lives in one file only.

## JSON regions

JSON has no comments. The step's `region` is a JSON Pointer to the member to highlight, and `file` is required:

```mdx
<Step id="install" file="package.json" region="/dependencies">
<Step id="meta" file="package.json" region="/name../scripts">
```

- Highlights from the key line to the end of its value; `/keywords/0` highlights an array item.
- `first..last` highlights sibling members in file order (split at the first `../`).
- Escape `/` and `~` in keys as `~1` / `~0`.
- YAML, TOML, INI and `.env` take `# #region` comments instead.

## Variables (`@var`)

Put `@var <name>` in a comment on the line of a string, number or boolean literal. The literal is the default; a `<VarField name="…">` lets readers change it in the code, the Preview, the ZIP and requests.

```js
const clientId = "YOUR_CLIENT_ID"; // @var clientId
```

```python
MAX_RESULTS = 10  # @var maxResults
VERBOSE = False  # @var verbose
```

```html
<arcgis-map item-id="abc123"></arcgis-map> <!-- @var webmap -->
```

- Targets the first string literal on the line; without one, the first number or boolean. `@var name:string|number|boolean` picks the type.
- One `@var` per line; names unique per file.
- The same name in several files (or variants) is one field: same type and default everywhere (booleans compare case-insensitively: `true` = `True`).
- `""` is a valid default for optional values.
- Values are escaped for the file type and quote (JS/Python/JSON backslashes, Kotlin `\$`, shell, PowerShell, SQL doubling, HTML entities).
- Not allowed: Python f-strings, raw or triple-quoted strings, TOML literal strings. Use a plain string.
- Numbers: `30`, `-1.5`, `2e3` (not `30L`, `0x1F`). Booleans keep each file's spelling (`true`, `True`, `TRUE`, `$true`).
- A file with `@var` must be shown in tabs.
- SQL and Lua also accept `-- @var name`.

## JSON variables

No `@var` in JSON: the field names the value with a pointer, and the file stays valid JSON:

```json
{ "title": "My API key", "expiration": { "days": 30 }, "generateToken1": true }
```

```mdx
<VarField name="keyTitle" label="Key name" json="key-config.json#/title" />
<VarField name="days" label="Expiration (days)" json="key-config.json#/expiration/days" />
<VarField name="days" label="Days" json={["js/config.json#/days", "py/config.json#/days"]} />
```

The value must be a string, number or boolean (not arrays, objects or `null`). Putting `@var` comments in a `.json` file fails ("comments are not allowed").

## `.http` file variables

In `.http` files (in `code/` or `requests/`), every `@name = value` line is a variable; no marker needed:

```http
@accessToken = YOUR_ACCESS_TOKEN

GET https://example.com/search?token={{accessToken}}
```

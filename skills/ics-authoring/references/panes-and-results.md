# Preview, Console, Result pane and requests

Under the code panel there is one lower pane: the **Preview** for web code, or the **Result pane** for everything else.

- **Web code**: `code/index.html` exists (with variants, per variant folder). It runs in the Preview.
- **Non-web code** (scripts, native apps, REST): shows captured `output/` files and runs `.http` requests in the Result pane, which appears only when some step has `output=` or `request=`.

## Preview

Every file under `code/` is published next to the Preview page with markers stripped, so relative URLs (`./main.js`, `./oauth-callback.html`) work. Form values reach imported modules, fetched files and other HTML pages (an OAuth callback in a popup). Workers, `XMLHttpRequest` and CSS `@import` get code defaults.

| `preview` | Reader gets |
|---|---|
| `both` (default) | Embedded Preview and open-in-tab button |
| `iframe` | Embedded Preview only |
| `tab` | Open-in-tab button only |
| `off` | No Preview; `index.html` not required |

Form changes reload the Preview after a short debounce.

## Console

`console: true` (with `preview: iframe` or `both`) adds Preview / Console tabs that capture the app's `console.log/info/warn/error` live, as expandable snapshots with source file and line. Selecting a step does **not** run its code: the log appears when the reader interacts with the app.

## Controlling the pane from a step (or `<Intro>`)

| Prop | Effect |
|---|---|
| `view="preview"` / `"console"` / `"result"` | Select that view and open the pane. |
| `collapsed` | Fold the pane (keeps the view). `collapsed={false}` opens it without switching. |
| `panelHeight={30}` | Pane height, 15–85 % of the right column, on each entry. Does not open the pane by itself. |
| `maximize="panel"` / `"code"` / `"none"` | Fill the window with the pane or the code/media; `none` restores. |
| omitted | Keep the reader's current state. |

```mdx
<Intro collapsed>…</Intro>
<Step id="run" file="main.js" region="sign-in" view="preview">…</Step>
<Step id="inspect" file="main.js" region="get-self" view="console" panelHeight={30}>…</Step>
<Step id="big" view="console" maximize="panel">…</Step>
<Step id="back" view="preview" maximize="none">…</Step>
```

Errors: `view` with `collapsed` (true); `maximize="panel"` with `collapsed`; `maximize="panel"` with no pane (`preview: off`/`tab` and no `output`/`request` step).

## Result pane: captured outputs

```mdx
<Step id="request" region="request" output="geocode.json">
```

- `output="name"` resolves `output/<variant id>/name`, then `output/name`; it must exist for every non-web variant the step covers.
- `.json`: collapsible tree. `.txt`, `.log`: terminal style (prompt lines `$ cmd`, `>>> cmd`, ANSI colors). `.png`, `.jpg`, `.jpeg`, `.gif`, `.webp`, `.svg`: image. Other types fail.
- Steps without `output` keep the nearest earlier result.
- Outputs are published (not zipped). Replace real tokens with the var default; the build warns when an output looks like it holds a credential.
- `output=` in web code is an error.

## HTTP requests

`.http` files in `requests/` (VS Code REST Client / JetBrains syntax) feed the **Run request** button and are zipped as `requests/` with form values applied.

```http
@serviceUrl = https://geocode-api.arcgis.com/arcgis/rest/services/World/GeocodeServer
@accessToken = YOUR_ACCESS_TOKEN

# @name geocode-get
GET {{serviceUrl}}/findAddressCandidates
  ?singleLine=380 New York St, Redlands
  &f=json
  &token={{accessToken}}

###

# @name geocode-post
POST {{serviceUrl}}/findAddressCandidates
Content-Type: application/x-www-form-urlencoded
X-Esri-Authorization: Bearer {{accessToken}}

singleLine=380 New York St, Redlands&f=json
```

```mdx
<Step id="geocode" region="geocode" output="geocode.json" request="geocode-get geocode-post">
```

- Supported: `###` separators, `# @name x` / `// @name x`, file variables `@x = value` and `{{x}}`, `GET POST PUT PATCH DELETE HEAD OPTIONS`, query continuation lines starting with `?`/`&`, headers, blank line, body, `#`/`//` comments.
- Not supported (errors): request/system variables (`{{name.response…}}`, `{{$guid}}`), `< file` bodies, handler scripts, undefined `{{x}}`, duplicate names, `request=` in web code, binary files in `requests/`.
- Nothing is sent until the reader presses Run. `{{x}}` takes the `<VarField>` value, else the default. Query values are URL-encoded. `secret` values are masked in the request line.
- Requests use `fetch` from the reader's browser: the service must allow CORS. Timeout 30 s; on failure the step's `output` is shown.
- Offer several requests in one step only when its code shows them.

### Service errors (`requests/errors.json`)

For APIs that answer HTTP 200 with an error body:

```json
{
  "object": "error",
  "code": "error.code",
  "message": "error.message",
  "help": { "498": { "text": "The token is expired, revoked or mistyped.", "link": "https://…/error-codes#498" } },
  "fallbackLink": "https://…/error-codes"
}
```

`object`, `code`, `message` are required dot paths from the response root; `help` and `fallbackLink` are optional; links must be `http(s)`.

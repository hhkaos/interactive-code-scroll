# Features

What InteractiveCodeScroll can do, in one page. Each section links to the reference that shows how to use it. For the file formats and every option, see [Authoring and API Reference](authoring.md); for commands, see [CLI Reference](cli.md).

A tutorial is a folder with `tutorial.mdx` (the explanations), `code/` (the final, runnable project) and `images/`. The build turns it into a static site: explanations on the left, code on the right, kept in sync as the reader moves through the steps.

## Reading a tutorial

- **Side-by-side layout**: explanations on the left, code on the right. Both splitters (explanations/code, code/Preview) can be dragged, and their sizes are remembered. A handle on the splitter hides or shows the explanations.
- **Steps drive the code panel**: when a step becomes active, it can switch file, focus a region (the rest of the file turns gray and the region scrolls into view) or show images instead of code. A text-only step keeps the current file and clears the focus.
- **Several ways to move**: scrolling (the step crossing the middle of the panel becomes active), clicking a step, arrow keys and PageUp/PageDown (presentation clickers work too, even while the focus is in a field or the Result pane).
- **Numbered steps, progress bar and deep links**: every step heading carries its number; `#step-id` links open the tutorial at that step.
- **Optional introduction**: content before the first step that is not numbered and does not focus any code.
- **Light and dark**: follows the OS by default; the author can set a default and the reader's toggle wins. The code panel and the Preview follow the page.
- **Readable at high zoom**, with line numbers and optional wrapping of long lines. The Result pane header turns long labels into icons instead of clipping them, and a short pane scrolls as a whole.

See [Components](authoring.md#components).

## Code

- **Final code, highlighted**: every file is shown in its final version; steps only focus parts of it. Highlighting happens at build time for JavaScript/TypeScript, HTML, CSS, JSON, Markdown, shell, YAML, Python, Kotlin, Swift, C#, Java, C++, Dart, SQL, `.http` and more, and can be overridden per extension.
- **Regions and variables as comments**: `#region id` / `#endregion` marks what a step focuses; `@var name` marks a literal a form field can change. The source stays valid and runnable; markers never reach the reader or the downloads.
- **Large projects**: the `files` list picks which files get tabs. Everything else, including binary files such as a Gradle wrapper jar, still goes into the ZIP.
- **Code variants**: the same steps in several languages (for example cURL, Python and Node.js) with a language switcher, deep links such as `?variant=curl`, steps that apply to only some languages, a Preview for web variants and a ZIP per variant. See [Code Variants](authoring.md#code-variants).

See [Code Markers](authoring.md#code-markers) and [Files Not Shown in Tabs](authoring.md#files-not-shown-in-tabs).

## Forms that edit the code

- `<VarField>` inputs in the explanations update the code as the reader types (client ID, API key, portal URL…). The literal in the code is the default.
- **Secret fields** are masked in the form and in the code, with a reveal toggle.
- **Persisted fields** are remembered per site, so a credential typed once fills every tutorial on the same site.
- Values are escaped for each language and quote style, and are included in Preview and downloads.

See [`<VarField>`](authoring.md#varfield) and [Variables](authoring.md#variables).

## Preview

- Runs the tutorial's web code (`code/index.html`) from a real page of the site: embedded, in a new tab, or both.
- Refreshes after form changes, or with Run. A step can expand or collapse it.
- OAuth sign-in works from the embedded Preview through a popup, and in the new tab through a normal redirect.

See [Preview](authoring.md#preview).

## Result pane

- Takes the Preview's place for code that cannot run in the browser (scripts, native apps): a step with `output="geocode.json"` shows a captured result from `output/`, with per-language overrides in `output/<variant>/`.
- JSON is shown as a collapsible, colored tree (keyboard navigable, long lists paged by 100), text in terminal style (colored prompt lines and ANSI colors), images as images. Steps without an output keep the last result. Works offline.
- The build warns when a captured output looks like it contains a real credential.
- HTTP requests live in `.http` files under `requests/` (VS Code REST Client / JetBrains syntax): steps bind them with `request="geocode-get geocode-post"`, the build validates the supported syntax and names, and every ZIP includes `requests/` with form values applied.
- A Run request button sends the step's request live from the browser with the reader's form values (a "Run as" picker when the step offers several, e.g. GET and POST), shows the status, time and response body, masks secrets in the request line (with a "Show secrets" toggle), gives up after 30 s and falls back to the captured output when the network or CORS fails. Readers can keep a live response for the session; Show captured returns to the captured one.
- Live responses have Body and Headers tabs: JSON as a tree, images as images, long text cut at 200 KB with "Show all"; Headers lists what the server exposes through CORS.
- Service errors inside responses (e.g. ArcGIS REST answering HTTP 200 with an `error` object) are shown as failures, with the code, message and a help link from `requests/errors.json`.
- Example: [examples/rest-geocode](../examples/rest-geocode) geocodes an address with the ArcGIS REST API in cURL, Python and JavaScript, with a GET step and a POST step (token in a header), captured outputs and the ArcGIS error rule.

See [Result Pane](authoring.md#result-pane).

## Images

- A step can show one image or a carousel instead of code. Step keys page through the images first; clicking an image opens a full-screen viewer.

See [`<Step>`](authoring.md#step).

## Downloads

- Copy the current file, download it, or download the whole project as a ZIP with the reader's form values applied, ready to run locally. The ZIP button shows how many files it contains.

## Presenting

- **Presentation mode** hides the header; the explanations can be hidden too. Step keys and clickers keep working, including while the focus is inside the Preview, a form field or the Result pane.
- **Maximize a pane**: the code, the Preview or the Result pane fills the window from its header icon or from a step (`maximize=`); the icon or Esc restores the layout. Step keys keep working.
- **Serve locally** with the CLI when the venue's network is unreliable.

See [Presenting a tutorial](authoring.md#presenting-a-tutorial) and [CLI Reference](cli.md).

## Writing tutorials

- Markdown notes (blockquotes) and `<Hint>` popovers for short clarifications.
- **Strict validation**: a wrong file, region, variable, image, variant or frontmatter value fails the build with the MDX file, line and column. In dev mode the error appears as a browser overlay and validation re-runs when code or images change.
- **Generic CLI**: `dev`, `build`, `serve`, `doctor` and `init-scripts` for any tutorial folder or series site (`--tutorials`, or detected from `tutorials/`; `--index` for a custom index page).
- **Series sites**: several tutorials published as one site, each under its own URL, with an index of cards (description, level, duration, tags), a tag filter and an "All tutorials" link in each tutorial's header. An optional `index.mdx` adds a title, description, logo, prose and sections (`<TutorialList tags=… level=…>`) and places the filter (`<TutorialFilter />`); a custom Astro page (`index` option) can replace the index and reuse the tutorial list and components from `interactive-code-scroll/series`. See [Series Sites](authoring.md#series-sites).

See [Validation](authoring.md#validation).

## In progress

These are specified and being built; see `SPEC.md` and `TODO.md`:

- Sibling tutorials per language.
- Custom result views through renderer plugins (e.g. "Preview on map", "Show as table"): write or install a renderer, register it, and choose per step in the MDX which views appear and with what label. A plugin guide will explain how to create, install and use them.

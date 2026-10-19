# Common problems and fixes

Messages follow the location (`tutorial/tutorial.mdx:12:1 …` or `code/main.js:4: …`). Match on the message text.

## Steps and the intro

| Message | Fix |
|---|---|
| `<Step> file "x" not found in code/` | `file` is relative to `code/` (to the variant folder with variants). Check path and extension. |
| `<Step> region "x" not found in code/main.js` | Add `#region x` / `#endregion x` (in the file's comment syntax) around the lines, or fix the id. |
| `<Step> region "x" requires a "file"` | Without variants a region needs `file`; a JSON region always does. |
| `<Step> region "/x" not found in code/package.json` | Fix the JSON Pointer: case-sensitive keys separated by `/`. |
| `<Step> region "/x" is a JSON Pointer, but … is not a .json file` | `/…` regions work only in `.json` files; use `#region` comments elsewhere. |
| `<Step> region "/a../b": … must be in the same object or array` / `… must come after …` | Ranges join sibling members, written in file order. |
| `<Step> region "x" not found in variant "y" (code/y/); add it or set "only"` | Add the region to that variant, or limit the step with `only="…"`. |
| `<Step> file "x" is not shown in tabs; add it to frontmatter "files"` | Add it to `files` (or the variant's `files`). |
| `<Step> file "x" is gitignored (by …) and not published` | Point at a published file, or add it to frontmatter `include`. |
| `<Step> "images" must be a static array of strings, e.g. images={["a.png"]}` | Write the array in place, in braces. |
| `<Step> image "x" not found in images/` | Paths are relative to `images/`. |
| `<Step> embed "x" not found in embeds/ (a folder needs an index.html)` | Path relative to `embeds/`; a folder needs `index.html`. |
| `<Step> embed "x" must be an https:// URL or a path in embeds/` | Use `https://`, or a relative path without `..` or a leading `/`. |
| `"embed" and "images" cannot be combined` | Split the step in two (on `<Intro>`, keep one). |
| `<Intro> "file" and "images" cannot be combined` | The intro shows a file or media; move the other to the first step. |
| `<Intro> "x" is not available on <Intro> (only view, collapsed, panelHeight, maximize, file, images, embed, outline)` | Move `region`, `output`, `request` or `only` to the first step. |
| `<Step> output "x" not found in output/` | Add the file to `output/` (or `output/<variant id>/`). |
| `<Step> output "x" has no effect: code/index.html makes the tutorial web code` | Web code shows the Preview: remove `output` (or `index.html`). |
| `<Step> request "x" not found in requests/ (# @name x)` | Add `# @name x` before a request in a `.http` file under `requests/`. |
| `<Step> maximize="panel" has no pane to maximize` | Enable the iframe Preview or give some step an `output`/`request`. |
| `<Step> duplicate id "x"` | Step ids are unique per tutorial. |
| `<Step> "outline" takes no value` | Write `<Step outline>`. |
| `<Step> "outline" and "file" cannot be combined` | The outline replaces the code: drop `file`/`region`/`images`/`embed` or use another step. |
| `<Outro> must come after the last <Step>` | Move it to the end. |

## Variables and fields

| Message | Fix |
|---|---|
| `<VarField> no "@var x" found in code/` | Add `// @var x` (file's comment syntax) on the literal's line, or fix `name`. |
| `@var "x" must have the same default in every file` | Same literal everywhere `x` is marked. |
| `@var "x" must have the same type in every file` | Same kind of literal (string, number, boolean) everywhere. |
| `@var x has no string, number or boolean literal on its line` | Put the marker on the literal's line. |
| `code/x: @var "y" is in a file not shown in tabs` | Show the file in tabs or remove the marker. |
| `<VarField> json …: pointer "/a" not found` | Fix the pointer (`/key/0`). |
| `invalid JSON: comments are not allowed` | Remove `@var` comments from JSON; use `<VarField json="file.json#/pointer">`. |
| `<VarField> the code default "x" is not one of the options` | Add the default to `options` or change the literal. |
| `<VarField> options file "x.json" not found in field-options/` | Create `field-options/x.json` or fix the name. |

## Code markers

| Message | Fix |
|---|---|
| `#region "x" is empty` | Put lines inside or remove the markers. |
| `unclosed #region "x"` | Add `#endregion x`. |
| `#endregion "a" closes #region "b"` | Close regions in reverse order of opening. |
| `code/x: file is outside every variant folder` | With variants, move every code file into a variant folder. |

## Frontmatter and files

| Message | Fix |
|---|---|
| `frontmatter logo "x" not found in images/ (or use an https:// URL)` | Add the image or use an `https://` URL (same for `variants[n].logo` and `tagGroups` logos in `tutorials/images/`). |
| `frontmatter preview "both" needs code/index.html (or set preview: off)` | Add `code/index.html`, or `preview: off` for non-web code. |
| `frontmatter include "x" matches no path in code/ starting with "." or gitignored` | Fix the glob (relative to `code/`); other paths are published anyway. |
| `"x" must be a boolean` / `must be one of …` | Use the documented values, unquoted booleans. |
| `"files" cannot be used with "variants"` | Move `files` into each variant. |
| `tutorials/x: "next" tutorial "y" is not in the series` | Use another tutorial's folder name, or `next: false`. |
| `frontmatter tagGroups: no tutorial has the tag(s) "x"` | Fix the tag or add it to a tutorial's `tags` (variant labels count). |
| `sibling tutorials: … use the same familyLabel` | Labels must be unique within a family. |

## Warnings

| Message | Meaning |
|---|---|
| `code/.x/ is not published (paths starting with "." are skipped)` | Add `".x/**"` to `include` if readers need it. |
| `frontmatter include "x" publishes code/…, which … excludes` | A gitignored file will be public: make sure it holds no secrets. |
| `output/x looks like it contains a credential` | Replace the real value with the var's default. |
| `<summary> is rendered inside a paragraph` | Blank line after `<summary>` and before `</details>`. |
| `frontmatter "family"`/`"next" has no effect outside a series site` | Remove it, or move the tutorial into a series. |
| `tutorial "x" is the only one in family "y"` | Add the sibling or remove `family`. |
| `skipped …: no tutorial.mdx` | A folder under `tutorials/` without `tutorial.mdx`; prefix it with `_` to silence. |

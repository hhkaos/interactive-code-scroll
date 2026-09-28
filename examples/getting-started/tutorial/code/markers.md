# Authoring Markers

# #region regions
Use native comments to mark stable regions. The framework strips these comments from the rendered code and downloads.

```html
<!-- #region preview-card -->
<main class="demo-card">
  <h1 id="title">My first tutorial</h1>
</main>
<!-- #endregion preview-card -->
```

```js
// #region action
button.addEventListener("click", runDemo);
// #endregion action
```
# #endregion regions

# #region variables
Place `@var` on the same line as the string literal that should become editable.

```html
<h1 id="title">My first tutorial</h1>
<script>
  const demoTitle = "My first tutorial"; // @var demoTitle
  document.querySelector("#title").textContent = demoTitle;
</script>
```

Then add the matching field in `tutorial.mdx`.

```mdx
<VarField name="demoTitle" label="Demo title" placeholder="My first tutorial" persist />
```
# #endregion variables

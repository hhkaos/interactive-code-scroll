# Show the weather on a page in 4 steps

Open-Meteo has a free forecast API that needs no key. In this post we build a page that shows the current temperature for any place.

## 1. Create the page

Start with an HTML page with a heading and an empty paragraph for the result:

```html
<!doctype html>
<html lang="en">
  <body>
    <h1>Weather</h1>
    <p id="result">Loading…</p>
    <script type="module" src="./main.js"></script>
  </body>
</html>
```

## 2. Pick a place

Set the coordinates of your city. Replace them with your own:

```js
const latitude = 40.4168;
const longitude = -3.7038;
```

## 3. Ask for the forecast

Call the forecast endpoint with `current=temperature_2m`:

```js
const url = `https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m`;
const response = await fetch(url);
const data = await response.json();
```

## 4. Show it

Write the temperature into the paragraph:

```js
document.querySelector("#result").textContent = `${data.current.temperature_2m} °C`;
```

That's it: open the page and you will see the current temperature.

// Where the project website is published. The Pages workflow overrides both with
// actions/configure-pages outputs or the ICS_SITE / ICS_BASE repository variables.
export const site = process.env.ICS_SITE || "https://www.rauljimenez.info";
export const base = process.env.ICS_BASE || "/interactive-code-scroll/";

/** Real tutorials published under <base>showcase/<name>/ and embedded or linked from the landing page. */
export const showcase = [
  { name: "rest-geocode", filter: "example-rest-geocode" },
  { name: "oauth-pkce", filter: "example-oauth-pkce" },
];

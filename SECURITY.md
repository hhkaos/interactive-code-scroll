# Security Policy

## Supported versions

InteractiveCodeScroll is in beta. Security fixes land in the latest published version only.

| Version | Supported |
|---|---|
| latest `0.x` (npm `latest` tag) | ✅ |
| older versions and `alpha` builds | ❌ |

## Reporting a vulnerability

**Please do not open a public issue.** Report it privately through [GitHub's private vulnerability reporting](https://github.com/hhkaos/interactive-code-scroll/security/advisories/new).

Include the affected version, the steps to reproduce, and the impact you see. You will get an acknowledgement as soon as possible, and a fix or mitigation plan once the report is confirmed.

## Scope notes

Generated tutorials are static sites, but they can hold sensitive data in the reader's browser:

- Values readers type into fields (for example API keys) are kept in `localStorage` when the author uses `persist`, and are applied to code, Preview and downloads.
- The request runner sends requests from the reader's browser with those values.

Issues that could leak these values (to other origins, URLs, logs or downloads the reader did not ask for) are in scope.

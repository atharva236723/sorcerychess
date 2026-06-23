# Contributing to Sorcery Chess

Thanks for your interest! Here is how to contribute.

## Before you start

Open an issue first and describe what you want to change. This avoids duplicate work and makes sure the change fits the project direction.

## Ground rules

- No dependencies, no build step. The project must stay pure HTML/CSS/JS and open from `file://`.
- No `import`/`export`. All scripts share one global scope and are loaded in order via `<script src>` tags.
- One feature, one file. New features go in a new `js/` file (and `css/` if needed), then wired in `index.html`.
- Keep the visual language: strict black & white board, `--magic` blue for spellcaster UI, glassmorphism panels.

## How to run locally

```bash
python -m http.server 8123
# open http://localhost:8123
```

## Submitting a pull request

1. Fork the repo
2. Create a branch: `git checkout -b feature/your-feature-name`
3. Make your changes
4. Open a pull request with a clear description of what changed and why

## Reporting bugs

Use the [Bug Report](.github/ISSUE_TEMPLATE/bug_report.md) issue template.

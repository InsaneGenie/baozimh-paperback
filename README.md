# Baozimh for Paperback 0.8

A third-party Paperback 0.8 source extension for Baozimh (包子漫畫).

## Features

- Search by manga title or author
- Manga details, cover, author, status, description, and genres
- Complete chapter list
- Chapter page extraction with vertical-reader support
- GitHub Actions publishing to `gh-pages`

## Build locally

Install Node.js 18, then run:

```bash
npm install
npm run bundle -- --folder=main
```

The generated repository files are written to `bundles/main`.

## Publish from GitHub

1. Replace every `YOUR_USERNAME` in `package.json` and `src/Baozimh/Baozimh.ts`.
2. Push the repository to GitHub using the `main` branch.
3. In **Settings → Actions → General**, give workflows read/write permission.
4. Wait for the **Bundle and publish source** workflow to finish.
5. Add the resulting GitHub Pages repository URL to Paperback 0.8.

Typical URL:

```text
https://YOUR_USERNAME.github.io/baozimh-paperback/main
```

## Notes

This is an unofficial source. Baozimh can change its markup or domains at any time, which may require selector updates. Use it only for content you are legally permitted to access. The extension does not bypass authentication, paywalls, or access controls.

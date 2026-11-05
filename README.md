# Baozimh for Paperback

A third-party Paperback source extension for Baozimh (包子漫畫), built for both Paperback 0.8 and Paperback 0.9.

## Install

Add the repository that matches your Paperback version:

| Paperback | Repository URL |
| --- | --- |
| 0.8 | `https://insanegenie.github.io/baozimh-paperback/main` |
| 0.9 | `https://insanegenie.github.io/baozimh-paperback/0.9` |

Baozimh shows a "verifying your browser" check before its pages. On 0.8, open the source's settings and use the Cloudflare/browser bypass button. On 0.9, a verification banner appears at the top of the screen when the check is needed; tap it, wait for the Baozimh home page to load in the in-app browser, then go back and refresh.

## Features

- Search by manga title or author
- Discover rows from the Baozimh home page, plus genre browsing on 0.9
- Manga details, cover, author, status, description, and genres
- Complete chapter list, with split chapters merged
- Chapter page extraction with vertical-reader support
- GitHub Actions publishing both builds to `gh-pages`

## Layout

- `src/Baozimh/Baozimh.ts`: the Paperback 0.8 source (`npm test` in the repository root).
- `paperback-0.9/`: the Paperback 0.9 source with its own toolchain (`npm test` inside that folder; needs Node 24).

## Notes

This is an unofficial source. Baozimh can change its markup or domains at any time, which may require selector updates. Use it only for content you are legally permitted to access. The extension does not bypass authentication, paywalls, or access controls.

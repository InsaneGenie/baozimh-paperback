# Baozimh and Manhuagui for Paperback

Third-party Paperback source extensions for Baozimh (包子漫畫) and Manhuagui (看漫画), built for both Paperback 0.8 and Paperback 0.9. Both sources are in the same repository, so adding it once gives you both.

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

## Manhuagui

- Discover rows: 人气最旺, 最新更新, 最新上架, 评分最高 (each pages through the full catalog), plus genres on 0.9
- Search by title, or on 0.8 browse by region, genre, audience and status tags (one per group)
- Chapters keep Manhuagui's sections (单话, 单行本, 番外篇); unnumbered extras such as 公告 are numbered just after the chapter before them (for example 12.1)
- Adult titles, whose chapter list the site hides behind a warning, are read from the compressed list the page ships
- Chapter images are decoded from the reader's packed, LZString-compressed script and loaded from `i.hamreus.com` with the Referer the image host requires

Manhuagui blocks addresses that load pages too quickly, so the source sends at most one page request per second. `npm run test:live:manhuagui` checks every step against the live site and saves the fetched pages under `tmp/manhuagui-live/`.

## Layout

- `src/Baozimh/Baozimh.ts`, `src/Manhuagui/`: the Paperback 0.8 sources (`npm test` in the repository root).
- `paperback-0.9/`: the Paperback 0.9 sources with their own toolchain (`npm test` inside that folder; needs Node 24).
- `src/Manhuagui/helpers.ts` and `paperback-0.9/src/Manhuagui/helpers.ts` are identical copies; change both.

## Notes

This is an unofficial source. Baozimh can change its markup or domains at any time, which may require selector updates. Use it only for content you are legally permitted to access. The extension does not bypass authentication, paywalls, or access controls.

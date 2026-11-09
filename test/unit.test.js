'use strict'
// Offline checks of the source's own logic. The HTML here is a minimal
// synthetic shape, not a copy of the site; selectors are checked in live.test.js.
const test = require('node:test')
const assert = require('node:assert/strict')
const { loadSource, NativeRequest, setTransport, requestLog } = require('./paperback-shim')

const source = loadSource()
const intercept = (url, headers) => source.requestManager.send(new NativeRequest({ url, headers }))
let pagesByUrl = {}
setTransport(async (request) => {
    const html = pagesByUrl[request.url]
    return html === undefined
        ? { status: 404, headers: {}, data: 'not found' }
        : { status: 200, headers: { 'content-type': 'text/html' }, data: html }
})

test('interceptor keeps the native request and its url', async () => {
    pagesByUrl = { 'https://s1.bzcdn.net/scomic/x/0/1/1.jpg': 'x' }
    const response = await intercept('https://s1.bzcdn.net/scomic/x/0/1/1.jpg')
    assert.ok(response.request instanceof NativeRequest)
    assert.equal(response.request.url, 'https://s1.bzcdn.net/scomic/x/0/1/1.jpg')
})

test('interceptor sends the reader referer to image hosts', async () => {
    for (const url of ['https://s1.bzcdn.net/a.jpg', 'https://s2.baozicdn.com/a.jpg', 'https://static-tw.baozimh.com/cover/a.jpg']) {
        pagesByUrl = { [url]: 'x' }
        const { headers } = (await intercept(url)).request
        assert.equal(headers.referer, 'https://www.twmanga.com/', url)
        assert.match(headers.accept, /image\//)
        assert.ok(headers['user-agent'])
    }
})

test('interceptor does not override headers the source already set', async () => {
    pagesByUrl = { 'https://s1.bzcdn.net/a.jpg': 'x' }
    const { headers } = (await intercept('https://s1.bzcdn.net/a.jpg', { Referer: 'https://example.com/', 'User-Agent': 'custom' })).request
    assert.equal(headers.Referer, 'https://example.com/')
    assert.equal(headers['User-Agent'], 'custom')
    assert.equal(headers.referer, undefined)
    assert.equal(headers['user-agent'], undefined)
})

const chapterLink = (slot, section, text) =>
    `<a class="comics-chapters__item" href="/user/page_direct?comic_id=demo&amp;section_slot=${section}&amp;chapter_slot=${slot}">${text}</a>`

test('chapter list groups multi-part chapters and keeps every part', async () => {
    pagesByUrl = {
        'https://www.baozimh.com/comic/demo': `<div>
            ${chapterLink(0, 0, '第1話')}
            ${chapterLink(1, 0, '第2話(1/2)')}${chapterLink(1, 1, '第2話(2/2)')}
            ${chapterLink(2, 0, '第3話')}
            ${chapterLink(2, 0, '第3話')}
        </div>`
    }
    const chapters = await source.getChapters('demo')
    assert.deepEqual(chapters.map((c) => [c.name, c.chapNum, JSON.parse(decodeURIComponent(c.id)).length]),
        [['第1話', 1, 1], ['第2話', 2, 2], ['第3話', 3, 1]])
})

test('extras keep their own entry and do not take a real chapter number', async () => {
    // Shape of 宦妃天下: unnumbered extras sit between numbered chapters, and
    // the latest chapters are repeated in a second block.
    const list = [
        chapterLink(176, 0, '第175話 藍翎之死'),
        chapterLink(177, 0, '公告~來抽獎啦！'),
        chapterLink(178, 0, '第176話 他不是太監？！'),
        chapterLink(180, 0, '第180話 藍大夫人死了'),
        chapterLink(200, 0, '聖誕快樂！情頭來惹！'),
        chapterLink(201, 0, '元旦快樂！'),
        chapterLink(202, 0, '第202話 你是男人嗎'),
        chapterLink(203, 0, '番外2 小劇場'),
        chapterLink(204, 0, '第一百零三話 舊章'),
        chapterLink(205, 0, '第303 新帝登基'),
        chapterLink(206, 0, '第十二季 預告')
    ]
    pagesByUrl = { 'https://www.baozimh.com/comic/demo': `<div>${list.join('')}</div><div>${list.slice(-3).join('')}</div>` }
    const chapters = await source.getChapters('demo')
    assert.deepEqual(chapters.map((c) => [c.chapNum, c.name, JSON.parse(decodeURIComponent(c.id)).length]), [
        [175, '第175話 藍翎之死', 1],
        [175.1, '公告~來抽獎啦！', 1],
        [176, '第176話 他不是太監？！', 1],
        [180, '第180話 藍大夫人死了', 1],
        [180.1, '聖誕快樂！情頭來惹！', 1],
        [180.2, '元旦快樂！', 1],
        [202, '第202話 你是男人嗎', 1],
        [202.1, '番外2 小劇場', 1],
        [103, '第一百零三話 舊章', 1],
        [303, '第303 新帝登基', 1],
        [303.1, '第十二季 預告', 1]
    ])
})

test('chapter pages are collected across parts without duplicates', async () => {
    const reader = 'https://www.twmanga.com/comic/chapter/demo/0_1'
    const page = (n) => `<amp-img class="comic-contain__item" src="https://s1.bzcdn.net/scomic/demo/0/1/${n}.jpg"></amp-img>`
    pagesByUrl = {
        [`${reader}.html`]: `<link rel="canonical" href="${reader}.html">${page(1)}${page(2)}`,
        [`${reader}_2.html`]: `${page(2)}${page(3)}`
    }
    const id = encodeURIComponent(JSON.stringify([`${reader}.html`, `${reader}_2.html`]))
    const details = await source.getChapterDetails('demo', id)
    assert.deepEqual(details.pages, [1, 2, 3].map((n) => `https://s1.bzcdn.net/scomic/demo/0/1/${n}.jpg`))
})

test('a single reader url discovers its continuation parts', async () => {
    const reader = 'https://www.twmanga.com/comic/chapter/demo/0_1'
    const page = (n) => `<amp-img class="comic-contain__item" src="https://s1.bzcdn.net/scomic/demo/0/1/${n}.jpg"></amp-img>`
    pagesByUrl = {
        'https://www.baozimh.com/comic/demo': '<div></div>',
        [`${reader}.html`]: `<link rel="canonical" href="${reader}.html">${page(1)}`,
        [`${reader}_2.html`]: page(2),
        [`${reader}_3.html`]: page(3)
    }
    const details = await source.getChapterDetails('demo', encodeURIComponent(JSON.stringify([`${reader}.html`])))
    assert.equal(details.pages.length, 3)
})

test('verification pages raise a readable error', async () => {
    pagesByUrl = { 'https://www.baozimh.com/comic/demo': '{"error":"challenge_required","challenge_url":"/__gatekeeper_challenge/x"}' }
    await assert.rejects(source.getMangaDetails('demo'), /瀏覽器驗證/)
    const request = await source.getCloudflareBypassRequestAsync()
    assert.equal(request.url, 'https://www.baozimh.com/')
})

test('a chapter whose reader page fails reports the real reason', async () => {
    const reader = 'https://www.twmanga.com/comic/chapter/demo/0_1.html'
    pagesByUrl = { [reader]: '{"error":"challenge_required","challenge_url":"/__gatekeeper_challenge/x"}' }
    const id = encodeURIComponent(JSON.stringify([reader, reader.replace('.html', '_2.html')]))
    await assert.rejects(source.getChapterDetails('demo', id), /瀏覽器驗證/)
})

test('a chapter the site has taken down says so', async () => {
    const reader = 'https://www.twmanga.com/comic/chapter/demo/0_1.html'
    pagesByUrl = { [reader]: '<div class="comic-contain"><div class="l-content empty_chapters_tips">屏蔽</div></div>' }
    await assert.rejects(source.getChapterDetails('demo', encodeURIComponent(JSON.stringify([reader]))), /屏蔽此章節/)
})

test.afterEach(() => { requestLog.length = 0 })

test('tag search offers the letter row and sends it to the catalog', async () => {
    pagesByUrl = {
        'https://www.baozimh.com/classify': `<div>
            <a href="/classify?type=rexie&region=all&state=all">熱血</a>
            <a href="/classify?type=all&region=jp&state=all">日本</a>
            <a href="/classify?type=all&region=all&state=serial">連載中</a>
            <a href="/classify?type=all&region=all&state=all&filter=*">全部</a>
            <a href="/classify?type=all&region=all&state=all&filter=b">B</a>
        </div>`,
        'https://www.baozimh.com/api/bzmhq/amp_comic_list?type=rexie&region=all&state=all&filter=b&page=1&limit=36&language=tw':
            JSON.stringify({ items: [{ comic_id: 'demo', name: '示範', topic_img: 'demo.jpg' }] })
    }
    const sections = await source.getSearchTags()
    assert.deepEqual(sections.map((s) => s.id), ['type', 'region', 'state', 'filter'])
    assert.deepEqual(sections[3].tags.map((t) => [t.id, t.label]), [['filter:b', 'B']])
    const result = await source.getSearchResults({ title: '', includedTags: [{ id: 'type:rexie' }, { id: 'filter:b' }] }, undefined)
    assert.equal(result.results[0].mangaId, 'demo')
})

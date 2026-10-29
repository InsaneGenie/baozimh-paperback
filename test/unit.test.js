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

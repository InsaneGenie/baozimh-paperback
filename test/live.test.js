'use strict'
// Live checks against baozimh.com / twmanga.com / bzcdn.net.
// Run with `npm run test:live`. Optional env: MANGA_ID, SEARCH_QUERY.
const test = require('node:test')
const { after } = test
const assert = require('node:assert/strict')
const { loadSource, requestLog } = require('./paperback-shim')

const source = loadSource()
const state = {}
const isHttps = (url) => typeof url === 'string' && /^https:\/\/[^/]+\//.test(url)
const decodeUrls = (chapterId) => JSON.parse(decodeURIComponent(chapterId))

// When the site answers with its browser-verification page, every later
// check would fail for the same reason, so report it once and skip the rest.
const live = (name, fn) => test(name, async (t) => {
    if (state.blocked) return t.skip(state.blocked)
    try { await fn(t) }
    catch (error) {
        if (/驗證/.test(error?.message ?? '')) state.blocked = 'site requires browser verification from this network'
        throw error
    }
})

live('home page sections', async () => {
    const sections = []
    await source.getHomePageSections((section) => sections.push(section))
    assert.ok(sections.length >= 3, `expected several sections, got ${sections.length}`)
    for (const section of sections) {
        assert.ok(section.items.length > 0, `section ${section.title} is empty`)
        for (const item of section.items) {
            assert.match(item.mangaId, /^[\w-]+$/, `bad mangaId in ${section.title}: ${item.mangaId}`)
            assert.ok(item.title, `missing title in ${section.title}`)
            assert.ok(isHttps(item.image), `bad image in ${section.title}: ${item.image}`)
        }
    }
    console.log('sections:', sections.map((s) => `${s.title}(${s.items.length}${s.containsMoreItems ? '+' : ''})`).join(', '))
    state.sections = sections
    state.mangaId = process.env.MANGA_ID || sections[0].items[0].mangaId
    state.searchQuery = process.env.SEARCH_QUERY || sections[0].items[0].title
})

live('view more for every expandable section', async () => {
    for (const section of state.sections.filter((s) => s.containsMoreItems)) {
        const first = await source.getViewMoreItems(section.id, undefined)
        assert.ok(first.results.length > 0, `${section.title}: no results`)
        let detail = `${first.results.length}`
        if (first.metadata) {
            const second = await source.getViewMoreItems(section.id, first.metadata)
            assert.ok(second.results.length > 0, `${section.title}: page 2 empty`)
            assert.notEqual(second.results[0].mangaId, first.results[0].mangaId, `${section.title}: page 2 repeats page 1`)
            detail += ` + ${second.results.length}`
        }
        console.log(`view more ${section.title}: ${detail}`)
    }
})

live('manga details', async () => {
    const manga = await source.getMangaDetails(state.mangaId)
    const info = manga.mangaInfo
    assert.equal(manga.id, state.mangaId)
    assert.ok(info.titles[0] && info.titles[0] !== state.mangaId, 'title not parsed')
    assert.ok(isHttps(info.image), `bad cover: ${info.image}`)
    assert.ok(info.author, 'author not parsed')
    assert.ok(info.desc, 'description not parsed')
    assert.notEqual(info.status, 'Unknown', 'status not parsed')
    assert.ok(info.tags.length && info.tags[0].tags.length, 'genres not parsed')
    console.log('details:', info.titles[0], '|', info.author, '|', info.status, '|', info.tags[0].tags.map((t) => t.label).join(','))
    state.title = info.titles[0]
})

live('chapter list', async () => {
    const chapters = await source.getChapters(state.mangaId)
    assert.ok(chapters.length > 0, 'no chapters')
    const ids = new Set()
    for (const chapter of chapters) {
        assert.ok(!ids.has(chapter.id), `duplicate chapter id ${chapter.name}`)
        ids.add(chapter.id)
        assert.ok(Number.isFinite(chapter.chapNum), `bad chapNum for ${chapter.name}`)
        assert.ok(chapter.name, 'chapter without name')
        const urls = decodeUrls(chapter.id)
        assert.ok(urls.length > 0 && urls.every(isHttps), `bad urls for ${chapter.name}`)
    }
    const multi = chapters.filter((c) => decodeUrls(c.id).length > 1)
    console.log(`chapters: ${chapters.length}, multi-part groups: ${multi.length}`,
        `first: ${chapters[0].name} (${chapters[0].chapNum}), last: ${chapters.at(-1).name} (${chapters.at(-1).chapNum})`)
    state.chapters = chapters
})

live('chapter pages (first and latest chapter)', async () => {
    const sorted = [...state.chapters].sort((a, b) => a.chapNum - b.chapNum)
    for (const chapter of new Set([sorted[0], sorted.at(-1)])) {
        const requestsBefore = requestLog.length
        const details = await source.getChapterDetails(state.mangaId, chapter.id)
        assert.ok(details.pages.length > 0, `no pages for ${chapter.name}`)
        assert.ok(details.pages.every(isHttps), 'non-absolute page url')
        assert.equal(new Set(details.pages).size, details.pages.length, 'duplicate pages')
        console.log(`pages ${chapter.name}: ${details.pages.length} pages from ${requestLog.length - requestsBefore} requests; host ${new URL(details.pages[0]).host}`)
        state.pages = details.pages
    }
})

live('automatic navigation with a single reader url finds every part', async () => {
    const chapter = state.chapters.find((c) => decodeUrls(c.id).length > 1) ?? state.chapters[0]
    const urls = decodeUrls(chapter.id)
    const full = await source.getChapterDetails(state.mangaId, chapter.id)
    const single = await source.getChapterDetails(state.mangaId, encodeURIComponent(JSON.stringify([urls[0]])))
    console.log(`${chapter.name}: grouped ${urls.length} url(s) -> ${full.pages.length} pages; single url -> ${single.pages.length} pages`)
    assert.deepEqual(single.pages, full.pages)
})

live('page images load in quick succession', async () => {
    const pages = state.pages
    const manager = source.requestManager
    const fetchImage = async (url) => {
        const started = Date.now()
        const response = await manager.send(App.createRequest({ url, method: 'GET' }))
        return { url, status: response.status, ms: Date.now() - started, bytes: response.data?.length ?? 0,
            type: response.headers['content-type'] }
    }
    // The reader preloads several pages at once; mimic that with a small pool.
    const results = []
    let next = 0
    await Promise.all(Array.from({ length: 6 }, async () => {
        while (next < pages.length) results.push(await fetchImage(pages[next++]))
    }))
    const failed = results.filter((r) => r.status !== 200 || !/^image\//.test(r.type ?? '') || r.bytes < 1000)
    const slowest = Math.max(...results.map((r) => r.ms))
    console.log(`images: ${results.length} ok=${results.length - failed.length} slowest=${slowest}ms`)
    assert.deepEqual(failed, [])
})

live('search by title', async () => {
    const results = await source.getSearchResults({ title: state.searchQuery, includedTags: [], excludedTags: [] }, undefined)
    assert.ok(results.results.length > 0, 'no search results')
    for (const item of results.results) {
        assert.ok(item.mangaId && item.title && isHttps(item.image), `bad result ${JSON.stringify(item)}`)
    }
    console.log(`search "${state.searchQuery}": ${results.results.length} results, first ${results.results[0].title}`)
})

live('search filters and catalog paging', async () => {
    const sections = await source.getSearchTags()
    assert.deepEqual(sections.map((s) => s.id), ['type', 'region', 'state'])
    const tag = sections[1].tags[0]
    const first = await source.getSearchResults({ title: '', includedTags: [tag], excludedTags: [] }, undefined)
    assert.ok(first.results.length > 0, 'catalog empty')
    assert.ok(first.metadata, 'catalog has no next page')
    const second = await source.getSearchResults({ title: '', includedTags: [tag], excludedTags: [] }, first.metadata)
    assert.ok(second.results.length > 0)
    assert.notEqual(second.results[0].mangaId, first.results[0].mangaId)
    console.log(`filters: ${sections.map((s) => `${s.id}=${s.tags.length}`).join(' ')}; ${tag.label}: ${first.results.length}+${second.results.length}`)
})

after(() => {
    const slow = [...requestLog].sort((a, b) => b.ms - a.ms).slice(0, 3)
    console.log(`requests: ${requestLog.length}; slowest: ${slow.map((r) => `${r.ms}ms ${r.url}`).join(' | ')}`)
})

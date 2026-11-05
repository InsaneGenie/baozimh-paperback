'use strict'
// Live check of the Manhuagui source against www.manhuagui.com.
// Run with `npm run test:live:manhuagui`. Optional env: MANGA_ID, SEARCH_QUERY.
// Every page fetched is saved under tmp/manhuagui-live/ so a failing
// selector can be compared with the real markup.
const fs = require('node:fs')
const path = require('node:path')
const { loadSource, setTransport } = require('./paperback-shim')

const out = path.join(__dirname, '..', 'tmp', 'manhuagui-live')
fs.mkdirSync(out, { recursive: true })
let saved = 0
setTransport(async (request) => {
    const response = await fetch(request.url, { method: request.method, headers: request.headers, redirect: 'follow', signal: AbortSignal.timeout(30000) })
    const type = response.headers.get('content-type') ?? ''
    const isText = /^(text|application\/(json|xml|xhtml|javascript))/i.test(type)
    const data = isText ? await response.text() : Buffer.from(await response.arrayBuffer())
    if (isText) fs.writeFileSync(path.join(out, `${String(++saved).padStart(2, '0')}-${request.url.replace(/^https?:\/\//, '').replace(/[^\w.-]+/g, '_').slice(0, 80)}.html`), data)
    return { status: response.status, headers: Object.fromEntries(response.headers), data, url: response.url }
})

const source = loadSource('Manhuagui')
const report = []
const step = async (name, fn) => {
    try {
        const detail = await fn()
        report.push(`PASS ${name}: ${detail}`)
        return true
    }
    catch (error) {
        report.push(`FAIL ${name}: ${error?.message ?? error}`)
        return false
    }
}

;(async () => {
    const state = {}
    await step('home sections', async () => {
        const sections = []
        await source.getHomePageSections((section) => { if (section.items?.length) sections.push(section) })
        if (sections.length < 4) throw new Error(`only ${sections.length} of 4 rows have items`)
        const first = sections[0].items[0]
        state.mangaId = process.env.MANGA_ID || first.mangaId
        state.query = process.env.SEARCH_QUERY || first.title
        return sections.map((s) => `${s.title}(${s.items.length})`).join(', ') + ` | first: ${first.mangaId} ${first.title} ${first.image}`
    })
    await step('view more page 2', async () => {
        const page = await source.getViewMoreItems('update', { page: 2 })
        if (!page.results.length) throw new Error('no items')
        return `${page.results.length} items, next=${JSON.stringify(page.metadata)}`
    })
    await step('search', async () => {
        const result = await source.getSearchResults({ title: state.query }, undefined)
        if (!result.results.length) throw new Error(`no results for ${state.query}`)
        return `${state.query} -> ${result.results.length} results, first ${result.results[0].mangaId} ${result.results[0].title} ${result.results[0].image}`
    })
    await step('tag catalog', async () => {
        const result = await source.getSearchResults({ title: '', includedTags: [{ id: 'region:japan' }, { id: 'genre:rexue' }] }, undefined)
        if (!result.results.length) throw new Error('no results')
        return `${result.results.length} results`
    })
    await step('details', async () => {
        const { mangaInfo } = await source.getMangaDetails(state.mangaId)
        if (!mangaInfo.titles[0] || mangaInfo.titles[0] === state.mangaId) throw new Error('no title')
        return JSON.stringify({ titles: mangaInfo.titles, image: mangaInfo.image, author: mangaInfo.author, status: mangaInfo.status, tags: mangaInfo.tags[0]?.tags.map((t) => t.label), desc: mangaInfo.desc.slice(0, 40) })
    })
    await step('chapters', async () => {
        const chapters = await source.getChapters(state.mangaId)
        if (!chapters.length) throw new Error('no chapters')
        state.chapter = chapters[0]
        const groups = [...new Set(chapters.map((c) => c.group))]
        return `${chapters.length} chapters in ${groups.join('/')}; first ${JSON.stringify(chapters.slice(0, 3).map((c) => [c.id, c.chapNum, c.name]))}; last ${JSON.stringify(chapters.slice(-2).map((c) => [c.id, c.chapNum, c.name]))}`
    })
    await step('chapter pages', async () => {
        const details = await source.getChapterDetails(state.mangaId, state.chapter.id)
        state.pages = details.pages
        return `${details.pages.length} pages, first ${details.pages[0]}`
    })
    await step('first image loads', async () => {
        const response = await source.requestManager.send(App.createRequest({ url: state.pages[0], method: 'GET' }))
        const bytes = Buffer.isBuffer(response.data) ? response.data.length : String(response.data).length
        if (response.status !== 200) throw new Error(`HTTP ${response.status}`)
        return `HTTP ${response.status}, ${response.headers['content-type']}, ${bytes} bytes`
    })
    console.log(report.join('\n'))
    console.log(`Saved ${saved} pages in ${out}`)
    process.exitCode = report.some((line) => line.startsWith('FAIL')) ? 1 : 0
})()

// Loads the bundled extension (bundles/Baozimh/index.js) in a stand-in for the
// Paperback 0.9 runtime and checks the browser-check flow and the parsers.
// The HTML here is a minimal synthetic shape, not a copy of the site.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const USER_AGENT = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148'
const encoder = new TextEncoder()
const decoder = new TextDecoder()

function loadExtension(routes) {
    const interceptors = new Map()
    const state = new Map()
    const sent = []
    const Application = {
        Selector: (target, name) => target[name].bind(target),
        registerInterceptor: (id, request, response) => interceptors.set(id, { request, response }),
        unregisterInterceptor: (id) => interceptors.delete(id),
        getDefaultUserAgent: async () => USER_AGENT,
        getState: (key) => state.get(key),
        setState: (value, key) => state.set(key, value),
        sleep: async () => {},
        arrayBufferToUTF8String: (data) => decoder.decode(data),
        async scheduleRequest(request) {
            for (const { request: intercept } of interceptors.values()) request = await intercept(request)
            sent.push(request)
            const route = routes(request)
            const response = { url: request.url, status: route?.status ?? (route ? 200 : 404), headers: {}, cookies: [] }
            let data = encoder.encode(route?.body ?? 'not found').buffer
            for (const { response: intercept } of interceptors.values()) data = await intercept(request, response, data)
            return [response, data]
        }
    }
    const context = vm.createContext({ Application, console, atob, TextEncoder, TextDecoder, URL, URLSearchParams })
    vm.runInContext(fs.readFileSync(new URL('../bundles/Baozimh/index.js', import.meta.url), 'utf8') + ';globalThis.source = source', context)
    return { extension: context.source.Baozimh, sent, fetch: (url) => Application.scheduleRequest({ url, method: 'GET' }) }
}

// Objects made inside the sandbox have its own prototypes; compare plain copies.
const plain = (value) => JSON.parse(JSON.stringify(value))
const page = (body) => ({ body: `<html><body>${body}</body></html>` })

test('browser check raises the error Paperback shows its verification banner for', async () => {
    let passed = false
    const { extension, sent } = loadExtension((request) => {
        if (!passed) return { status: 403, body: '{"error":"challenge_required","challenge_url":"/__gatekeeper_challenge/start?x=1"}' }
        if (request.url === 'https://www.baozimh.com/comic/demo') return page('<meta property="og:novel:book_name" content="示範">')
    })
    await extension.initialise()
    await assert.rejects(extension.getMangaDetails('demo'), (error) => {
        assert.equal(error.type, 'cloudflareError')
        assert.equal(error.resolutionRequest.url, 'https://www.baozimh.com/__gatekeeper_challenge/start?x=1')
        assert.equal(error.resolutionRequest.headers['user-agent'], USER_AGENT)
        return true
    })

    // The in-app browser hands back the site's cookie once the check passes.
    await extension.cloudflareBypassCompleted({ url: 'https://www.baozimh.com/', method: 'GET' },
        [{ name: 'gatekeeper_pass', value: 'ok', domain: '.baozimh.com', path: '/' }], {})
    passed = true
    const manga = await extension.getMangaDetails('demo')
    assert.equal(manga.mangaInfo.primaryTitle, '示範')
    const last = sent.at(-1)
    assert.equal(last.cookies.gatekeeper_pass, 'ok')
    assert.equal(last.headers['user-agent'], USER_AGENT)
})

test('the HTML verification page also raises the browser check', async () => {
    const { extension } = loadExtension(() => page('<script src="/__gatekeeper_challenge/assets/pow.js"></script>'))
    await extension.initialise()
    await assert.rejects(extension.getDiscoverSectionItems({ id: 'home-最近更新', title: '最近更新', type: 1 }),
        (error) => error.type === 'cloudflareError' && error.resolutionRequest.url === 'https://www.baozimh.com/')
})

test('image requests carry the reader referer and are never decoded', async () => {
    const { extension, sent, fetch } = loadExtension(() => ({ body: '{"error":"challenge_required"}' }))
    await extension.initialise()
    // An image body passes through even if it looks like the check.
    const [, data] = await fetch('https://s1.bzcdn.net/scomic/demo/0/1/1.jpg')
    assert.equal(decoder.decode(data), '{"error":"challenge_required"}')
    assert.equal(sent.at(-1).headers.referer, 'https://www.twmanga.com/')
    assert.match(sent.at(-1).headers.accept, /image\//)
})

test('the reader domain raises the browser check for its own origin', async () => {
    const { extension } = loadExtension(() => ({ body: '{"error":"challenge_required"}' }))
    await extension.initialise()
    const chapter = {
        chapterId: encodeURIComponent(JSON.stringify(['https://www.twmanga.com/comic/chapter/demo/0_1.html', 'https://www.twmanga.com/comic/chapter/demo/0_1_2.html'])),
        sourceManga: { mangaId: 'demo' }
    }
    await assert.rejects(extension.getChapterDetails(chapter),
        (error) => error.type === 'cloudflareError' && error.resolutionRequest.url === 'https://www.twmanga.com/')
})

test('chapters, split parts and page images', async () => {
    const { extension } = loadExtension((request) => {
        if (request.url === 'https://www.baozimh.com/comic/demo') return page(`
            <a class="comics-chapters__item" href="/user/page_direct?comic_id=demo&section_slot=0&chapter_slot=0">第1話</a>
            <a class="comics-chapters__item" href="/user/page_direct?comic_id=demo&section_slot=0&chapter_slot=1">第2話(1/2)</a>
            <a class="comics-chapters__item" href="/user/page_direct?comic_id=demo&section_slot=1&chapter_slot=1">第2話(2/2)</a>
            <a class="comics-chapters__item" href="/user/page_direct?comic_id=demo&section_slot=0&chapter_slot=2">公告</a>`)
        if (request.url.endsWith('section_slot=0&chapter_slot=1')) return page('<amp-img class="comic-contain__item" data-src="https://s1.bzcdn.net/p1.jpg"></amp-img>')
        if (request.url.endsWith('section_slot=1&chapter_slot=1')) return page('<amp-img class="comic-contain__item" data-src="https://s1.bzcdn.net/p2.jpg"></amp-img>')
    })
    await extension.initialise()
    const chapters = await extension.getChapters({ mangaId: 'demo' })
    assert.deepEqual(plain(chapters.map((chapter) => [chapter.chapNum, chapter.title])), [[1, '第1話'], [2, '第2話'], [2.1, '公告']])
    const details = await extension.getChapterDetails(chapters[1])
    assert.deepEqual(plain(details.pages), ['https://s1.bzcdn.net/p1.jpg', 'https://s1.bzcdn.net/p2.jpg'])
})

test('taken-down chapters say so', async () => {
    const { extension } = loadExtension(() => page('<div class="empty_chapters_tips">屏蔽</div>'))
    await extension.initialise()
    const chapter = {
        chapterId: encodeURIComponent(JSON.stringify(['https://www.twmanga.com/comic/chapter/demo/0_5.html', 'https://www.twmanga.com/comic/chapter/demo/0_5_2.html'])),
        sourceManga: { mangaId: 'demo' }
    }
    await assert.rejects(extension.getChapterDetails(chapter), /屏蔽/)
})

test('a Discover genre opens the matching catalog', async () => {
    const { extension, sent } = loadExtension((request) => {
        if (request.url.startsWith('https://www.baozimh.com/api/bzmhq/amp_comic_list?')) return {
            body: JSON.stringify({ items: [{ comic_id: 'demo', name: '示範', topic_img: 'demo.jpg', author: '作者' }], next: 'x' })
        }
    })
    await extension.initialise()
    const result = await extension.getSearchResults({ title: '', metadata: { type: 'rexie' } }, undefined, undefined)
    assert.equal(result.items[0].mangaId, 'demo')
    assert.deepEqual(plain(result.metadata), { page: 2 })
    assert.match(sent.at(-1).url, /type=rexie&region=all&state=all&filter=\*&page=1/)
})

test('the search filter sheet lists the catalog filters and searches with the picks', async () => {
    const { extension, sent } = loadExtension((request) => {
        if (request.url === 'https://www.baozimh.com/classify') return page(
            '<a href="/classify?type=all&region=all&state=all">全部</a>'
            + '<a href="/classify?type=rexie&region=all&state=all">熱血</a>'
            + '<a href="/classify?type=lianai&region=all&state=all">戀愛</a>'
            + '<a href="/classify?type=all&region=jp&state=all">日本</a>'
            + '<a href="/classify?type=all&region=all&state=serial">連載中</a>'
            + '<a href="/classify?type=all&region=all&state=all&filter=*">全部</a>'
            + '<a href="/classify?type=all&region=all&state=all&filter=a">A</a>'
            + '<a href="/classify?type=all&region=all&state=all&filter=b">B</a>')
        if (request.url.startsWith('https://www.baozimh.com/api/bzmhq/amp_comic_list?')) return {
            body: JSON.stringify({ items: [{ comic_id: 'demo', name: '示範', topic_img: 'demo.jpg' }] })
        }
    })
    await extension.initialise()
    const form = await extension.getAdvancedSearchForm({ title: '' })
    assert.equal(form.requiresExplicitSubmission, true)
    await new Promise((resolve) => setTimeout(resolve, 0))
    const sections = form.getSections()
    assert.deepEqual(plain(sections.map((section) => section.header)), ['題材', '地區', '狀態', '字母'])
    assert.deepEqual(plain(sections[0].items.map((item) => item.title)), ['全部', '熱血', '戀愛'])

    await sections[0].items.find((item) => item.title === '戀愛').onSelect()
    await form.getSections()[1].items.find((item) => item.title === '日本').onSelect()
    await form.getSections()[3].items.find((item) => item.title === 'B').onSelect()
    await form.formDidSubmit()
    const metadata = form.getSearchQueryMetadata()
    assert.deepEqual(plain(metadata), { type: 'lianai', region: 'jp', state: 'all', filter: 'b' })

    const result = await extension.getSearchResults({ title: '', metadata }, undefined, undefined)
    assert.equal(result.items[0].mangaId, 'demo')
    assert.match(sent.at(-1).url, /type=lianai&region=jp&state=all&filter=b&page=1/)

    // Reopening the sheet keeps the previous picks.
    const again = await extension.getAdvancedSearchForm({ title: '', metadata })
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.deepEqual(plain(again.getSearchQueryMetadata()), plain(metadata))
})

test('the search filter sheet shows an error when the filters cannot load', async () => {
    const { extension } = loadExtension(() => page('<p>nothing</p>'))
    await extension.initialise()
    const form = await extension.getAdvancedSearchForm({ title: '' })
    await new Promise((resolve) => setTimeout(resolve, 0))
    assert.equal(form.getSections()[0].id, 'error')
    await assert.rejects(form.formDidSubmit(), /no search filters/)
})

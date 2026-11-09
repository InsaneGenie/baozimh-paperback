// Loads the bundled Manhuagui extension (bundles/Manhuagui/index.js) in a
// stand-in for the Paperback 0.9 runtime. The HTML is a minimal synthetic
// shape of the site's markup; the packed reader script is produced by the
// same packer and LZString compression the site uses.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import vm from 'node:vm'

const fixtures = JSON.parse(fs.readFileSync(new URL('./fixtures/manhuagui-packed.json', import.meta.url), 'utf8'))
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
    vm.runInContext(fs.readFileSync(new URL('../bundles/Manhuagui/index.js', import.meta.url), 'utf8') + ';globalThis.source = source', context)
    return { extension: context.source.Manhuagui, sent, fetch: (url) => Application.scheduleRequest({ url, method: 'GET' }) }
}

const plain = (value) => JSON.parse(JSON.stringify(value))
const html = (pages) => (request) => pages[request.url] === undefined ? undefined : { body: pages[request.url] }
const chapter = (id, name) => `<li><a href="/comic/1001/${id}.html" title="${name}" class="status0"><span>${name}<i>20p</i></span></a></li>`

test('a Cloudflare page raises the browser-check banner', async () => {
    let passed = false
    const { extension, sent } = loadExtension((request) => passed
        ? { body: '<div class="book-title"><h1>示例</h1></div>' }
        : { status: 403, body: '<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/h/b"></script>' })
    await extension.initialise()
    await assert.rejects(extension.getMangaDetails('1001'), (error) => {
        assert.equal(error.type, 'cloudflareError')
        assert.equal(error.resolutionRequest.url, 'https://www.manhuagui.com/')
        return true
    })
    await extension.cloudflareBypassCompleted({ url: 'https://www.manhuagui.com/', method: 'GET' },
        [{ name: 'cf_clearance', value: 'ok', domain: '.manhuagui.com', path: '/' }], {})
    passed = true
    assert.equal((await extension.getMangaDetails('1001')).mangaInfo.primaryTitle, '示例')
    assert.equal(sent.at(-1).cookies.cf_clearance, 'ok')
})

test('images carry the Manhuagui referer and are never decoded', async () => {
    const { extension, sent, fetch } = loadExtension(() => ({ body: '<title>Just a moment...</title>' }))
    await extension.initialise()
    await fetch('https://i.hamreus.com/ps3/a.jpg.webp')
    assert.equal(sent.at(-1).headers.referer, 'https://www.manhuagui.com/')
    assert.match(sent.at(-1).headers.accept, /image\//)
})

test('chapters, sections and decoded pages', async () => {
    const { extension } = loadExtension(html({
        'https://www.manhuagui.com/comic/1001/': `<div class="book-title"><h1>示例</h1></div>
            <h4><span>单话</span></h4>
            <div class="chapter-list" id="chapter-list-0"><ul>${chapter(2003, '第2话')}${chapter(2002, '公告')}${chapter(2001, '第1话')}</ul></div>
            <h4><span>单行本</span></h4>
            <div class="chapter-list" id="chapter-list-1"><ul>${chapter(1901, '第01卷')}</ul></div>`,
        'https://www.manhuagui.com/comic/1001/2001.html': `<script>${fixtures.script}</script>`
    }))
    await extension.initialise()
    const chapters = await extension.getChapters({ mangaId: '1001' })
    assert.deepEqual(plain(chapters.map((c) => [c.chapterId, c.chapNum, c.volume ?? null, c.version, c.title])), [
        ['2001', 1, null, '单话', '第1话'],
        ['2002', 1.1, null, '单话', '公告'],
        ['2003', 2, null, '单话', '第2话'],
        ['1901', 1, 1, '单行本', '第01卷']
    ])
    const details = await extension.getChapterDetails(chapters[0])
    assert.equal(details.pages.length, 3)
    assert.equal(details.pages[0], 'https://i.hamreus.com/ps3/s/demo/%E7%AC%AC01%E8%AF%9D/001.jpg.webp?e=1700000000&m=Xy-z_0')
})

test('adult titles read the compressed chapter list', async () => {
    const { extension } = loadExtension(html({
        'https://www.manhuagui.com/comic/1001/': `<div class="book-title"><h1>示例</h1></div><input type="hidden" id="__VIEWSTATE" value="${fixtures.viewstate}">`
    }))
    await extension.initialise()
    const chapters = await extension.getChapters({ mangaId: '1001' })
    assert.deepEqual(plain(chapters.map((c) => [c.chapterId, c.chapNum])), [['3001', 1], ['3002', 2]])
})

test('Discover rows and genres page through the catalog', async () => {
    const list = `<ul id="contList"><li><a class="bcover" href="/comic/1001/" title="示例漫画"><img src="//cf.mhgui.com/cpic/b/1001.jpg"><span class="tt">更新至第3话</span></a></li></ul><div class="pager"><a href="#">下一页</a></div>`
    const { extension, sent } = loadExtension(html({
        'https://www.manhuagui.com/list/update_p1.html': list,
        'https://www.manhuagui.com/list/rexue/view_p2.html': list
    }))
    await extension.initialise()
    const row = await extension.getDiscoverSectionItems({ id: 'update', title: '最新更新', type: 1 }, undefined)
    assert.deepEqual(plain(row), { items: [{ type: 'simpleCarouselItem', mangaId: '1001', title: '示例漫画', imageUrl: 'https://cf.mhgui.com/cpic/b/1001.jpg', subtitle: '更新至第3话' }], metadata: { page: 2 } })
    const genre = await extension.getSearchResults({ title: '', metadata: { genre: 'rexue' } }, { page: 2 })
    assert.equal(genre.items[0].mangaId, '1001')
    assert.equal(sent.at(-1).url, 'https://www.manhuagui.com/list/rexue/view_p2.html')
})

test('title search', async () => {
    const { extension } = loadExtension(html({
        'https://www.manhuagui.com/s/%E7%A4%BA%E4%BE%8B_p1.html': `<div class="book-result"><ul><li class="cf">
            <div class="book-cover"><a class="bcover" href="/comic/1001/"><img src="//cf.mhgui.com/cpic/b/1001.jpg"></a></div>
            <div class="book-detail"><dl><dt><a href="/comic/1001/" title="示例漫画">示例漫画</a></dt></dl></div></li></ul></div>`
    }))
    await extension.initialise()
    const result = await extension.getSearchResults({ title: '示例' }, undefined)
    assert.deepEqual(plain(result.items.map((item) => [item.mangaId, item.title])), [['1001', '示例漫画']])
    assert.equal(result.metadata, undefined)
})

test('the search filter sheet builds a catalog path from the picks', async () => {
    const list = `<ul id="contList"><li><a class="bcover" href="/comic/1001/" title="示例漫画"><img src="//cf.mhgui.com/cpic/b/1001.jpg"></a></li></ul>`
    const { extension, sent } = loadExtension(html({
        'https://www.manhuagui.com/list/japan_rexue_wanjie/view_p1.html': list
    }))
    await extension.initialise()
    const form = await extension.getAdvancedSearchForm({ title: '' })
    const sections = form.getSections()
    assert.deepEqual(plain(sections.map((section) => section.header)), ['地区', '题材', '受众', '进度'])
    await sections[0].items.find((item) => item.title === '日本').onSelect()
    await form.getSections()[1].items.find((item) => item.title === '热血').onSelect()
    await form.getSections()[3].items.find((item) => item.title === '完结').onSelect()
    const metadata = form.getSearchQueryMetadata()
    const result = await extension.getSearchResults({ title: '', metadata }, undefined)
    assert.equal(result.items[0].mangaId, '1001')
    assert.equal(sent.at(-1).url, 'https://www.manhuagui.com/list/japan_rexue_wanjie/view_p1.html')
})

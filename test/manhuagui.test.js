'use strict'
// Offline checks of the Manhuagui source. The HTML is a minimal synthetic
// shape of the site's markup; the packed reader script is produced by the
// same packer and LZString compression the site uses.
const test = require('node:test')
const assert = require('node:assert/strict')
const { loadSource, NativeRequest, setTransport } = require('./paperback-shim')
const fixtures = require('./fixtures/manhuagui-packed.json')

const source = loadSource('Manhuagui')
let pagesByUrl = {}
setTransport(async (request) => {
    const html = pagesByUrl[request.url]
    return html === undefined
        ? { status: 404, headers: {}, data: 'not found' }
        : { status: 200, headers: { 'content-type': 'text/html' }, data: html }
})

const chapter = (book, id, name) => `<li><a href="/comic/${book}/${id}.html" title="${name}" class="status0"><span>${name}<i>20p</i></span></a></li>`

test('images and covers get the Manhuagui referer', async () => {
    for (const url of ['https://i.hamreus.com/ps3/a.jpg.webp', 'https://cf.mhgui.com/cpic/b/1.jpg']) {
        pagesByUrl = { [url]: 'x' }
        const response = await source.requestManager.send(new NativeRequest({ url }))
        assert.ok(response.request instanceof NativeRequest)
        assert.equal(response.request.headers.referer, 'https://www.manhuagui.com/')
        assert.match(response.request.headers.accept, /image\//)
    }
})

test('manga details', async () => {
    pagesByUrl = {
        'https://www.manhuagui.com/comic/1001/': `
            <div class="book-title"><h1>示例漫画</h1><h2>Demo Manga</h2></div>
            <p class="hcover"><img src="//cf.mhgui.com/cpic/h/1001.jpg"></p>
            <ul class="detail-list cf">
              <li><span><strong>漫画剧情：</strong><a href="/list/rexue/">热血</a><a href="/list/maoxian/">冒险</a></span></li>
              <li><span><strong>漫画作者：</strong><a href="/author/1/">作者甲</a></span></li>
              <li class="status"><span><strong>漫画状态：</strong><span class="red">连载中</span></span></li>
            </ul>
            <div id="intro-all"><p>简介内容</p></div>`
    }
    const { mangaInfo } = await source.getMangaDetails('1001')
    assert.deepEqual(mangaInfo.titles, ['示例漫画', 'Demo Manga'])
    assert.equal(mangaInfo.image, 'https://cf.mhgui.com/cpic/h/1001.jpg')
    assert.equal(mangaInfo.author, '作者甲')
    assert.equal(mangaInfo.status, 'Ongoing')
    assert.equal(mangaInfo.desc, '简介内容')
    assert.deepEqual(mangaInfo.tags[0].tags.map((tag) => tag.label), ['热血', '冒险'])
})

test('chapters are numbered per section, extras follow their chapter', async () => {
    pagesByUrl = {
        'https://www.manhuagui.com/comic/1001/': `<div class="book-title"><h1>示例</h1></div>
            <div class="chapter">
              <h4><span>单话</span></h4>
              <div class="chapter-list cf mt10" id="chapter-list-0">
                <ul>${chapter(1001, 5003, '第3话')}${chapter(1001, 5002, '休刊公告')}${chapter(1001, 5001, '第2话')}</ul>
                <ul>${chapter(1001, 5000, '第01话')}</ul>
              </div>
              <h4><span>单行本</span></h4>
              <div class="chapter-list cf mt10" id="chapter-list-1">
                <ul>${chapter(1001, 4002, '第02卷')}${chapter(1001, 4001, '第01卷')}</ul>
              </div>
              <h4><span>番外篇</span></h4>
              <div class="chapter-list cf mt10" id="chapter-list-2"><ul>${chapter(1001, 6001, '番外2 小剧场')}</ul></div>
            </div>`
    }
    const chapters = await source.getChapters('1001')
    assert.deepEqual(chapters.map((c) => [c.id, c.chapNum, c.volume, c.group, c.name]), [
        ['5000', 1, undefined, '单话', '第01话'],
        ['5001', 2, undefined, '单话', '第2话'],
        ['5002', 2.1, undefined, '单话', '休刊公告'],
        ['5003', 3, undefined, '单话', '第3话'],
        ['4001', 1, 1, '单行本', '第01卷'],
        ['4002', 2, 2, '单行本', '第02卷'],
        ['6001', 0.1, undefined, '番外篇', '番外2 小剧场']
    ])
})

test('adult titles read the compressed chapter list', async () => {
    pagesByUrl = {
        'https://www.manhuagui.com/comic/1001/': `<div class="book-title"><h1>示例</h1></div>
            <div id="erroraudit_show">警告</div><input type="hidden" id="__VIEWSTATE" value="${fixtures.viewstate}">`
    }
    const chapters = await source.getChapters('1001')
    assert.deepEqual(chapters.map((c) => [c.id, c.chapNum, c.group]), [['3001', 1, '单话'], ['3002', 2, '单话']])
})

test('chapter pages are decoded from the packed reader script', async () => {
    pagesByUrl = { 'https://www.manhuagui.com/comic/1001/2002.html': `<html><script>${fixtures.script}</script></html>` }
    const details = await source.getChapterDetails('1001', '2002')
    assert.deepEqual(details.pages, ['001', '002', '003'].map((n) =>
        `https://i.hamreus.com/ps3/s/demo/%E7%AC%AC01%E8%AF%9D/${n}.jpg.webp?e=1700000000&m=Xy-z_0`))
})

test('a reader page without image data says so', async () => {
    pagesByUrl = { 'https://www.manhuagui.com/comic/1001/2002.html': '<html>nothing</html>' }
    await assert.rejects(source.getChapterDetails('1001', '2002'), /無法解析/)
})

test('search results and paging', async () => {
    pagesByUrl = {
        'https://www.manhuagui.com/s/%E7%A4%BA%E4%BE%8B_p1.html': `<div class="book-result"><ul>
            <li class="cf"><div class="book-cover"><a class="bcover" href="/comic/1001/"><img src="//cf.mhgui.com/cpic/b/1001.jpg"></a></div>
            <div class="book-detail"><dl><dt><a href="/comic/1001/" title="示例漫画">示例漫画</a></dt>
            <dd class="tags status"><span><strong>状态：</strong><span class="red">连载中</span></span></dd></dl></div></li>
            </ul></div><div id="AspNetPagerResult"><span class="current">1</span><a href="/s/x_p2.html">下一页</a></div>`
    }
    const result = await source.getSearchResults({ title: '示例' }, undefined)
    assert.deepEqual(result.results.map((r) => [r.mangaId, r.title, r.image]), [['1001', '示例漫画', 'https://cf.mhgui.com/cpic/b/1001.jpg']])
    assert.deepEqual(result.metadata, { page: 2 })
})

test('tags browse the matching catalog list', async () => {
    const list = `<ul id="contList"><li><a class="bcover" href="/comic/1001/" title="示例漫画"><img data-src="//cf.mhgui.com/cpic/b/1001.jpg"><span class="tt">更新至第3话</span></a></li></ul>`
    pagesByUrl = { 'https://www.manhuagui.com/list/japan_rexue_lianzai/view_p1.html': list }
    const result = await source.getSearchResults({ title: '', includedTags: [{ id: 'status:lianzai' }, { id: 'genre:rexue' }, { id: 'region:japan' }] }, undefined)
    assert.deepEqual(result.results.map((r) => [r.mangaId, r.subtitle]), [['1001', '更新至第3话']])
    assert.equal(result.metadata, undefined)
    await assert.rejects(source.getSearchResults({ title: '', includedTags: [{ id: 'genre:rexue' }, { id: 'genre:aiqing' }] }, undefined), /每組只能選一項/)
})

test('Discover rows load the catalog sort orders', async () => {
    const list = (id) => `<ul id="contList"><li><a class="bcover" href="/comic/${id}/" title="T${id}"><img src="//cf.mhgui.com/cpic/b/${id}.jpg"></a></li></ul>`
    pagesByUrl = {
        'https://www.manhuagui.com/list/view_p1.html': list(1),
        'https://www.manhuagui.com/list/update_p1.html': list(2),
        'https://www.manhuagui.com/list/index_p1.html': list(3),
        'https://www.manhuagui.com/list/rate_p1.html': list(4)
    }
    const sections = []
    await source.getHomePageSections((section) => sections.push(section))
    const filled = sections.filter((section) => section.items?.length)
    assert.deepEqual(filled.map((section) => [section.id, section.items[0].mangaId]), [['view', '1'], ['update', '2'], ['index', '3'], ['rate', '4']])
})

test('a Cloudflare page raises a readable error', async () => {
    pagesByUrl = { 'https://www.manhuagui.com/comic/1001/': '<title>Just a moment...</title><script src="/cdn-cgi/challenge-platform/h/b"></script>' }
    await assert.rejects(source.getMangaDetails('1001'), /瀏覽器驗證/)
    assert.equal((await source.getCloudflareBypassRequestAsync()).url, 'https://www.manhuagui.com/')
})

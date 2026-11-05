import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    HomeSectionType,
    PartialSourceManga,
    PagedResults,
    Request,
    Response,
    SearchRequest,
    Source,
    SourceInfo,
    SourceIntents,
    SourceManga,
    TagSection
} from '@paperback/types'

import {
    chapterImageData,
    chapterImageUrls,
    decompressFromBase64,
    numberChapters,
    ChapterLink
} from './helpers'

const BASE_URL = 'https://www.manhuagui.com'
// Page images are served from hamreus.com; covers from mhgui.com. Both
// refuse requests that do not carry a Manhuagui Referer.
const IMAGE_SERVER = 'https://i.hamreus.com'
const IMAGE_HOST = /^https?:\/\/[^/]*(?:hamreus\.com|mhgui\.com)(?:[/:?#]|$)/i

// Discover rows, each a sort order of Manhuagui's full catalog.
const HOME_SECTIONS: { id: string; title: string; sort: string }[] = [
    { id: 'view', title: '人气最旺', sort: 'view' },
    { id: 'update', title: '最新更新', sort: 'update' },
    { id: 'index', title: '最新上架', sort: 'index' },
    { id: 'rate', title: '评分最高', sort: 'rate' }
]

// Catalog filters, in the order Manhuagui joins them in /list/<a>_<b>_<c>/.
export const FILTER_GROUPS: { id: string; label: string; tags: [string, string][] }[] = [
    {
        id: 'region', label: '地区（选一项）', tags: [
            ['japan', '日本'], ['hongkong', '港台'], ['other', '其它'], ['europe', '欧美'], ['china', '内地'], ['korea', '韩国']
        ]
    },
    {
        id: 'genre', label: '题材（选一项）', tags: [
            ['rexue', '热血'], ['maoxian', '冒险'], ['mohuan', '魔幻'], ['shengui', '神鬼'], ['gaoxiao', '搞笑'],
            ['mengxi', '萌系'], ['aiqing', '爱情'], ['kehuan', '科幻'], ['mofa', '魔法'], ['gedou', '格斗'],
            ['wuxia', '武侠'], ['jizhan', '机战'], ['zhanzheng', '战争'], ['jingji', '竞技'], ['tiyu', '体育'],
            ['xiaoyuan', '校园'], ['shenghuo', '生活'], ['lizhi', '励志'], ['lishi', '历史'], ['weiniang', '伪娘'],
            ['zhainan', '宅男'], ['funv', '腐女'], ['danmei', '耽美'], ['baihe', '百合'], ['hougong', '后宫'],
            ['zhiyu', '治愈'], ['meishi', '美食'], ['tuili', '推理'], ['xuanyi', '悬疑'], ['kongbu', '恐怖'],
            ['sige', '四格'], ['zhichang', '职场'], ['zhentan', '侦探'], ['shehui', '社会'], ['yinyue', '音乐'],
            ['wudao', '舞蹈'], ['zazhi', '杂志'], ['heidao', '黑道']
        ]
    },
    {
        id: 'audience', label: '受众（选一项）', tags: [
            ['shaonv', '少女'], ['shaonian', '少年'], ['qingnian', '青年'], ['ertong', '儿童'], ['tongyong', '通用']
        ]
    },
    {
        id: 'status', label: '进度（选一项）', tags: [['lianzai', '连载'], ['wanjie', '完结']]
    }
]

export const ManhuaguiInfo: SourceInfo = {
    version: '1.0.0',
    name: 'Manhuagui',
    icon: 'icon.png',
    author: 'Steven Lai',
    authorWebsite: 'https://github.com/InsaneGenie',
    description: 'Read Chinese manga from Manhuagui (看漫画).',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    sourceTags: [],
    intents: SourceIntents.MANGA_CHAPTERS
        | SourceIntents.HOMEPAGE_SECTIONS
        | SourceIntents.CLOUDFLARE_BYPASS_REQUIRED
}

export class Manhuagui extends Source {
    requestManager = App.createRequestManager({
        // Manhuagui blocks addresses that load pages quickly.
        requestsPerSecond: 1,
        requestTimeout: 30000,
        interceptor: {
            interceptRequest: async (request: Request): Promise<Request> => {
                const headers: Record<string, string> = { ...(request.headers ?? {}) }
                const hasHeader = (name: string): boolean =>
                    Object.keys(headers).some((key) => key.toLowerCase() === name)
                if (!hasHeader('referer')) headers['referer'] = BASE_URL + '/'
                if (IMAGE_HOST.test(request.url) && !hasHeader('accept')) {
                    headers['accept'] = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
                }
                if (!hasHeader('user-agent')) headers['user-agent'] = await this.requestManager.getDefaultUserAgent()
                // Paperback's Request is a native object; spreading it into
                // createRequest drops its url, so update it in place.
                request.headers = headers
                return request
            },
            interceptResponse: async (response: Response): Promise<Response> => response
        }
    })

    override async getCloudflareBypassRequestAsync(): Promise<Request> {
        return App.createRequest({
            url: BASE_URL + '/',
            method: 'GET',
            headers: {
                referer: BASE_URL + '/',
                'user-agent': await this.requestManager.getDefaultUserAgent()
            }
        })
    }

    private async getDocument(url: string): Promise<any> {
        const request = App.createRequest({ url, method: 'GET' })
        const response = await this.requestManager.schedule(request, 1)
        const data = typeof response.data === 'string' ? response.data : ''
        if (/\/cdn-cgi\/challenge-platform\/|id=["']challenge-form["']|<title>Just a moment/i.test(data)) {
            throw new Error('看漫画需要瀏覽器驗證。請在來源設定使用 Cloudflare 驗證按鈕，看到網站首頁後返回並重新整理。')
        }
        if (response.status === 403) {
            throw new Error('看漫画拒絕連線（HTTP 403）。網站可能暫時封鎖了此網路，請稍後再試或用內建瀏覽器確認網站能否開啟。')
        }
        if (response.status === 429) throw new Error('看漫画暫時限制請求次數（HTTP 429）。請稍候再重新整理。')
        if (response.status >= 400) throw new Error(`看漫画網站回應錯誤（HTTP ${response.status}）。請稍後再試。`)
        if (!data.trim()) throw new Error('看漫画回傳空白內容。請稍後再重新整理。')
        return this.cheerio.load(data)
    }

    private absoluteUrl(value: string): string {
        if (value.startsWith('//')) return 'https:' + value
        if (/^https?:\/\//.test(value)) return value
        return BASE_URL + (value.startsWith('/') ? value : '/' + value)
    }

    private mangaIdFromHref(href: string): string {
        return href.match(/\/comic\/(\d+)/)?.[1] ?? ''
    }

    private imageOf(element: any): string {
        const value = element.attr('data-src') || element.attr('src') || ''
        return value && !value.startsWith('data:') ? this.absoluteUrl(value) : ''
    }

    private hasNextPage($: any): boolean {
        return $('a').filter((_index: number, element: any) => /^\s*下一[页頁]\s*$/.test($(element).text())).length > 0
    }

    // Catalog lists such as /list/view_p1.html.
    private parseList($: any): PartialSourceManga[] {
        const results: PartialSourceManga[] = []
        const seen = new Set<string>()
        $('#contList > li').each((_index: number, element: any) => {
            const item = $(element)
            const link = item.find('a.bcover').first()
            const mangaId = this.mangaIdFromHref(link.attr('href') ?? '')
            if (!mangaId || seen.has(mangaId)) return
            const title = link.attr('title')?.trim() || item.find('p a').first().text().trim()
            if (!title) return
            seen.add(mangaId)
            results.push(App.createPartialSourceManga({
                mangaId,
                title,
                image: this.imageOf(link.find('img').first()),
                subtitle: item.find('span.tt').first().text().trim() || undefined
            }))
        })
        return results
    }

    private async getListPage(path: string, sort: string, page: number): Promise<PagedResults> {
        const $ = await this.getDocument(`${BASE_URL}/list/${path ? path + '/' : ''}${sort}_p${page}.html`)
        const results = this.parseList($)
        return App.createPagedResults({
            results,
            metadata: results.length && this.hasNextPage($) ? { page: page + 1 } : undefined
        })
    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        for (const section of HOME_SECTIONS) {
            sectionCallback(App.createHomeSection({
                id: section.id, title: section.title, type: HomeSectionType.singleRowNormal, containsMoreItems: true
            }))
        }
        for (const section of HOME_SECTIONS) {
            const page = await this.getListPage('', section.sort, 1)
            sectionCallback(App.createHomeSection({
                id: section.id,
                title: section.title,
                type: HomeSectionType.singleRowNormal,
                items: page.results,
                containsMoreItems: true
            }))
        }
    }

    override async getViewMoreItems(sectionId: string, metadata: any): Promise<PagedResults> {
        const section = HOME_SECTIONS.find((value) => value.id === sectionId)
        if (!section) throw new Error('Unknown Manhuagui Discover section. Refresh Discover and try again.')
        return this.getListPage('', section.sort, Number.isInteger(metadata?.page) ? metadata.page : 1)
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}/`)
        const title = $('.book-title h1').first().text().trim()
        const altTitle = $('.book-title h2').first().text().trim()
        const field = (label: RegExp): any => $('ul.detail-list li span').filter((_index: number, element: any) =>
            label.test($(element).children('strong').first().text() || $(element).text())).first()
        const names = (label: RegExp): string[] => field(label).find('a').map((_index: number, element: any) => $(element).text().trim()).get().filter(Boolean)
        const authors = names(/作者/)
        const genres = names(/剧情|劇情/)
        const statusText = $('li.status').text()
        const status = /完结|完結/.test(statusText) ? 'Completed' : /连载|連載/.test(statusText) ? 'Ongoing' : 'Unknown'
        const desc = $('#intro-all').text().trim() || $('#intro-cut').text().trim()
            || $('meta[name="description"]').attr('content')?.trim() || ''

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [title || mangaId, ...(altTitle ? [altTitle] : [])],
                image: this.imageOf($('p.hcover img').first()) || this.absoluteUrl($('meta[property="og:image"]').attr('content') ?? ''),
                status,
                author: authors.join(', '),
                artist: authors.join(', '),
                desc,
                tags: genres.length ? [App.createTagSection({
                    id: 'genres', label: 'Genres', tags: genres.map((genre) => App.createTag({ id: genre, label: genre }))
                })] : []
            })
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        let $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}/`)
        // Adult titles hide the list behind a warning and ship it
        // LZString-compressed in this field instead.
        const hidden = $('#__VIEWSTATE').attr('value')
        if (hidden && !$('[id^="chapter-list-"]').length) {
            const html = decompressFromBase64(hidden)
            if (html) $ = this.cheerio.load(html)
        }

        const links: ChapterLink[] = []
        const seen = new Set<string>()
        $('[id^="chapter-list-"]').each((_index: number, list: any) => {
            const group = $(list).prevAll('h4').first().text().trim() || '单话'
            $(list).find('a[href*="/comic/"]').each((_linkIndex: number, element: any) => {
                const id = ($(element).attr('href') ?? '').match(/\/comic\/\d+\/(\d+)\.html/)?.[1]
                if (!id || seen.has(id)) return
                seen.add(id)
                const name = $(element).attr('title')?.trim()
                    || $(element).find('span').first().clone().children().remove().end().text().trim()
                    || $(element).text().trim()
                links.push({ id, name, group })
            })
        })
        if (!links.length && !$('.book-title').length && !$('[id^="chapter-list-"]').length) {
            throw new Error('看漫画回應了，但找不到章節清單。若網站可以正常瀏覽，請回報此錯誤以更新解析器。')
        }

        return numberChapters(links).map((chapter) => App.createChapter({
            id: chapter.id,
            chapNum: chapter.chapNum,
            volume: chapter.volume,
            name: chapter.name,
            group: chapter.group,
            langCode: 'zh'
        }))
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const request = App.createRequest({ url: `${BASE_URL}/comic/${mangaId}/${chapterId}.html`, method: 'GET' })
        const response = await this.requestManager.schedule(request, 1)
        if (response.status >= 400) throw new Error(`看漫画網站回應錯誤（HTTP ${response.status}）。請稍後再試。`)
        const html = typeof response.data === 'string' ? response.data : ''
        const data = chapterImageData(html)
        if (!data) {
            if (/\/cdn-cgi\/challenge-platform\/|<title>Just a moment/i.test(html)) {
                throw new Error('看漫画需要瀏覽器驗證。請在來源設定使用 Cloudflare 驗證按鈕，看到網站首頁後返回並重新整理。')
            }
            throw new Error('看漫画的章節頁面無法解析（找不到圖片資料）。若網站上可以閱讀，請回報此錯誤。')
        }
        const pages = chapterImageUrls(data, IMAGE_SERVER)
        if (!pages.length) throw new Error('看漫画沒有提供此章節的圖片。This chapter has no pages on Manhuagui.')
        return App.createChapterDetails({ id: chapterId, mangaId, pages })
    }

    override async getSearchTags(): Promise<TagSection[]> {
        return FILTER_GROUPS.map((group) => App.createTagSection({
            id: group.id,
            label: group.label,
            tags: group.tags.map(([value, label]) => App.createTag({ id: `${group.id}:${value}`, label }))
        }))
    }

    override async getTags(): Promise<TagSection[]> { return this.getSearchTags() }
    override async supportsTagExclusion(): Promise<boolean> { return false }
    override async supportsSearchOperators(): Promise<boolean> { return false }

    override async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        if (query.excludedTags?.length) throw new Error('Manhuagui does not support excluding tags.')
        const page = Number.isInteger(metadata?.page) && metadata.page > 0 ? metadata.page : 1
        const title = query.title?.trim() ?? ''

        if (query.includedTags?.length) {
            if (title) throw new Error('使用標籤時請清空搜尋文字。Clear the search text to browse by tags.')
            const chosen = new Map<string, string>()
            for (const tag of query.includedTags) {
                const [group, value] = tag.id.split(':')
                if (!group || !value || !FILTER_GROUPS.some((g) => g.id === group && g.tags.some(([v]) => v === value))) {
                    throw new Error('Please select filters from the Manhuagui search filter list.')
                }
                if (chosen.has(group) && chosen.get(group) !== value) throw new Error('每組只能選一項。Select only one tag in each group.')
                chosen.set(group, value)
            }
            const path = FILTER_GROUPS.map((group) => chosen.get(group.id)).filter(Boolean).join('_')
            return this.getListPage(path, 'view', page)
        }

        if (!title) return App.createPagedResults({ results: [] })
        const $ = await this.getDocument(`${BASE_URL}/s/${encodeURIComponent(title)}_p${page}.html`)
        const results: PartialSourceManga[] = []
        const seen = new Set<string>()
        $('.book-result li.cf, .book-result > ul > li').each((_index: number, element: any) => {
            const item = $(element)
            const link = item.find('.book-detail dt a').first()
            const mangaId = this.mangaIdFromHref(link.attr('href') ?? item.find('a.bcover').attr('href') ?? '')
            if (!mangaId || seen.has(mangaId)) return
            seen.add(mangaId)
            results.push(App.createPartialSourceManga({
                mangaId,
                title: link.attr('title')?.trim() || link.text().trim() || mangaId,
                image: this.imageOf(item.find('.book-cover img').first()),
                subtitle: item.find('.book-detail .tags.status span.red').first().text().trim() || undefined
            }))
        })
        return App.createPagedResults({
            results,
            metadata: results.length && this.hasNextPage($) ? { page: page + 1 } : undefined
        })
    }

    override getMangaShareUrl(mangaId: string): string {
        return `${BASE_URL}/comic/${mangaId}/`
    }
}

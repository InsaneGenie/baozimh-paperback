import {
    BasicRateLimiter,
    CloudflareError,
    ContentRating,
    CookieStorageInterceptor,
    DiscoverSectionType,
    EndOfPageResults,
    PaperbackInterceptor,
    type Chapter,
    type ChapterDetails,
    type Cookie,
    type DiscoverSection,
    type DiscoverSectionItem,
    type ExtensionImpl,
    type PagedResults,
    type Request,
    type Response,
    type SearchQuery,
    type SearchResultItem,
    type SourceManga
} from '@paperback/types'
import * as cheerio from 'cheerio'

import {
    chapterImageData,
    chapterImageUrls,
    decompressFromBase64,
    numberChapters,
    type ChapterLink
} from './helpers'
import type ManhuaguiConfig from './pbconfig'

const BASE_URL = 'https://www.manhuagui.com'
// Page images are served from hamreus.com; covers from mhgui.com. Both
// refuse requests that do not carry a Manhuagui Referer.
const IMAGE_SERVER = 'https://i.hamreus.com'
const IMAGE_HOST = /^https?:\/\/[^/]*(?:hamreus\.com|mhgui\.com)(?:[/:?#]|$)/i
const SITE_HOST = /^https?:\/\/(?:[^/]+\.)?manhuagui\.com(?:[/:?#]|$)/i
const CHALLENGE = /\/cdn-cgi\/challenge-platform\/|id=["']challenge-form["']|<title>Just a moment/i

// Discover rows, each a sort order of Manhuagui's full catalog.
const HOME_SECTIONS: { id: string; title: string; type: DiscoverSectionType }[] = [
    { id: 'view', title: '人气最旺', type: DiscoverSectionType.prominentCarousel },
    { id: 'update', title: '最新更新', type: DiscoverSectionType.simpleCarousel },
    { id: 'index', title: '最新上架', type: DiscoverSectionType.simpleCarousel },
    { id: 'rate', title: '评分最高', type: DiscoverSectionType.simpleCarousel }
]
const GENRE_SECTION_ID = 'genres'
const GENRES: [string, string][] = [
    ['rexue', '热血'], ['maoxian', '冒险'], ['mohuan', '魔幻'], ['shengui', '神鬼'], ['gaoxiao', '搞笑'],
    ['mengxi', '萌系'], ['aiqing', '爱情'], ['kehuan', '科幻'], ['mofa', '魔法'], ['gedou', '格斗'],
    ['wuxia', '武侠'], ['jizhan', '机战'], ['zhanzheng', '战争'], ['jingji', '竞技'], ['tiyu', '体育'],
    ['xiaoyuan', '校园'], ['shenghuo', '生活'], ['lizhi', '励志'], ['lishi', '历史'], ['weiniang', '伪娘'],
    ['zhainan', '宅男'], ['funv', '腐女'], ['danmei', '耽美'], ['baihe', '百合'], ['hougong', '后宫'],
    ['zhiyu', '治愈'], ['meishi', '美食'], ['tuili', '推理'], ['xuanyi', '悬疑'], ['kongbu', '恐怖'],
    ['sige', '四格'], ['zhichang', '职场'], ['zhentan', '侦探'], ['shehui', '社会'], ['yinyue', '音乐'],
    ['wudao', '舞蹈'], ['zazhi', '杂志'], ['heidao', '黑道']
]

type Card = { mangaId: string; title: string; imageUrl: string; subtitle?: string }

function absoluteUrl(value: string): string {
    if (value.startsWith('//')) return 'https:' + value
    if (/^https?:\/\//.test(value)) return value
    return BASE_URL + (value.startsWith('/') ? value : '/' + value)
}

function mangaIdFromHref(href: string): string {
    return href.match(/\/comic\/(\d+)/)?.[1] ?? ''
}

function imageOf(element: cheerio.Cheerio<any>): string {
    const value = element.attr('data-src') || element.attr('src') || ''
    return value && !value.startsWith('data:') ? absoluteUrl(value) : ''
}

function hasNextPage($: cheerio.CheerioAPI): boolean {
    return $('a').filter((_index, element) => /^\s*下一[页頁]\s*$/.test($(element).text())).length > 0
}

async function browserCheck(): Promise<CloudflareError> {
    return new CloudflareError(
        {
            url: BASE_URL + '/',
            method: 'GET',
            headers: { referer: BASE_URL + '/', 'user-agent': await Application.getDefaultUserAgent() }
        },
        '看漫画需要瀏覽器驗證。請點選上方的驗證提示，在內建瀏覽器看到網站首頁後返回並重新整理。'
    )
}

class ManhuaguiInterceptor extends PaperbackInterceptor {
    override async interceptRequest(request: Request): Promise<Request> {
        const headers: Record<string, string> = { ...(request.headers ?? {}) }
        const hasHeader = (name: string): boolean => Object.keys(headers).some((key) => key.toLowerCase() === name)
        if (!hasHeader('referer')) headers['referer'] = BASE_URL + '/'
        if (IMAGE_HOST.test(request.url) && !hasHeader('accept')) {
            headers['accept'] = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
        // A verification cookie is tied to the browser's user agent.
        if (!hasHeader('user-agent')) headers['user-agent'] = await Application.getDefaultUserAgent()
        return { ...request, headers }
    }

    override async interceptResponse(request: Request, response: Response, data: ArrayBuffer): Promise<ArrayBuffer> {
        const url = response.url || request.url
        if (IMAGE_HOST.test(url) || !SITE_HOST.test(url) || data.byteLength > 2_000_000) return data
        // Paperback shows its browser-verification banner for this error.
        if (CHALLENGE.test(Application.arrayBufferToUTF8String(data))) throw await browserCheck()
        return data
    }
}

export class ManhuaguiExtension implements ExtensionImpl<typeof ManhuaguiConfig> {
    // Manhuagui blocks addresses that load pages quickly.
    rateLimiter = new BasicRateLimiter('rateLimiter', {
        numberOfRequests: 1,
        bufferInterval: 1,
        ignoreImages: true
    })
    cookieStorage = new CookieStorageInterceptor({ storage: 'stateManager' })
    mainInterceptor = new ManhuaguiInterceptor('main')

    async initialise(): Promise<void> {
        this.rateLimiter.registerInterceptor()
        this.cookieStorage.registerInterceptor()
        this.mainInterceptor.registerInterceptor()
    }

    async cloudflareBypassCompleted(_request: Request, cookies: Cookie[], _localStorage: Record<string, string>): Promise<void> {
        for (const cookie of cookies) this.cookieStorage.setCookie(cookie)
    }

    // Kept for app builds that still call the older hook.
    async saveCloudflareBypassCookies(cookies: Cookie[]): Promise<void> {
        for (const cookie of cookies) this.cookieStorage.setCookie(cookie)
    }

    private async fetchText(url: string): Promise<string> {
        const [response, data] = await Application.scheduleRequest({ url, method: 'GET' })
        const text = Application.arrayBufferToUTF8String(data)
        if (response.status === 403) {
            throw new Error('看漫画拒絕連線（HTTP 403）。網站可能暫時封鎖了此網路，請稍後再試或用內建瀏覽器確認網站能否開啟。')
        }
        if (response.status === 429) throw new Error('看漫画暫時限制請求次數（HTTP 429）。請稍候再重新整理。')
        if (response.status >= 400) throw new Error(`看漫画網站回應錯誤（HTTP ${response.status}）。請稍後再試。`)
        if (!text.trim()) throw new Error('看漫画回傳空白內容。請稍後再重新整理。')
        return text
    }

    private async getDocument(url: string): Promise<cheerio.CheerioAPI> {
        return cheerio.load(await this.fetchText(url))
    }

    // Catalog lists such as /list/view_p1.html.
    private async getListPage(path: string, sort: string, page: number): Promise<{ cards: Card[]; hasMore: boolean }> {
        const $ = await this.getDocument(`${BASE_URL}/list/${path ? path + '/' : ''}${sort}_p${page}.html`)
        const cards: Card[] = []
        const seen = new Set<string>()
        $('#contList > li').each((_index, element) => {
            const item = $(element)
            const link = item.find('a.bcover').first()
            const mangaId = mangaIdFromHref(link.attr('href') ?? '')
            if (!mangaId || seen.has(mangaId)) return
            const title = link.attr('title')?.trim() || item.find('p a').first().text().trim()
            if (!title) return
            seen.add(mangaId)
            cards.push({
                mangaId,
                title,
                imageUrl: imageOf(link.find('img').first()),
                subtitle: item.find('span.tt').first().text().trim() || undefined
            })
        })
        return { cards, hasMore: cards.length > 0 && hasNextPage($) }
    }

    async getDiscoverSections(): Promise<DiscoverSection[]> {
        return [
            ...HOME_SECTIONS.map(({ id, title, type }) => ({ id, title, type })),
            { id: GENRE_SECTION_ID, title: '题材', type: DiscoverSectionType.genres }
        ]
    }

    async getDiscoverSectionItems(section: DiscoverSection, metadata: any): Promise<PagedResults<DiscoverSectionItem>> {
        if (section.id === GENRE_SECTION_ID) {
            return {
                items: GENRES.map(([id, name]) => ({
                    type: 'genresCarouselItem',
                    name,
                    searchQuery: { title: '', metadata: { genre: id } }
                }))
            }
        }
        const home = HOME_SECTIONS.find((value) => value.id === section.id)
        if (!home) return EndOfPageResults
        const page = Number.isInteger(metadata?.page) && metadata.page > 0 ? metadata.page : 1
        const result = await this.getListPage('', home.id, page)
        const itemType = home.type === DiscoverSectionType.prominentCarousel ? 'prominentCarouselItem' : 'simpleCarouselItem'
        return {
            items: result.cards.map((card): DiscoverSectionItem => ({ type: itemType, ...card })),
            metadata: result.hasMore ? { page: page + 1 } : undefined
        }
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}/`)
        const title = $('.book-title h1').first().text().trim()
        const altTitle = $('.book-title h2').first().text().trim()
        const names = (label: RegExp): string[] => $('ul.detail-list li span')
            .filter((_index, element) => label.test($(element).children('strong').first().text() || $(element).text()))
            .first().find('a').map((_index, element) => $(element).text().trim()).get().filter(Boolean)
        const authors = names(/作者/)
        const genres = names(/剧情|劇情/)
        const statusText = $('li.status').text()
        const status = /完结|完結/.test(statusText) ? 'Completed' : /连载|連載/.test(statusText) ? 'Ongoing' : 'Unknown'

        return {
            mangaId,
            mangaInfo: {
                primaryTitle: title || mangaId,
                secondaryTitles: altTitle ? [altTitle] : [],
                thumbnailUrl: imageOf($('p.hcover img').first()) || absoluteUrl($('meta[property="og:image"]').attr('content') ?? ''),
                synopsis: $('#intro-all').text().trim() || $('#intro-cut').text().trim()
                    || $('meta[name="description"]').attr('content')?.trim() || '',
                contentRating: ContentRating.MATURE,
                status,
                author: authors.join(', '),
                artist: authors.join(', '),
                tagGroups: genres.length ? [{ id: 'genres', title: 'Genres', tags: genres.map((genre) => ({ id: genre, title: genre })) }] : [],
                shareUrl: `${BASE_URL}/comic/${mangaId}/`
            }
        }
    }

    async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
        let $ = await this.getDocument(`${BASE_URL}/comic/${sourceManga.mangaId}/`)
        // Adult titles hide the list behind a warning and ship it
        // LZString-compressed in this field instead.
        const hidden = $('#__VIEWSTATE').attr('value')
        if (hidden && !$('[id^="chapter-list-"]').length) {
            const html = decompressFromBase64(hidden)
            if (html) $ = cheerio.load(html)
        }

        const links: ChapterLink[] = []
        const seen = new Set<string>()
        $('[id^="chapter-list-"]').each((_index, list) => {
            const group = $(list).prevAll('h4').first().text().trim() || '单话'
            $(list).find('a[href*="/comic/"]').each((_linkIndex, element) => {
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

        return numberChapters(links).map((chapter) => ({
            chapterId: chapter.id,
            sourceManga,
            chapNum: chapter.chapNum,
            volume: chapter.volume,
            version: chapter.group,
            langCode: 'zh',
            title: chapter.name
        }))
    }

    async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
        const mangaId = chapter.sourceManga.mangaId
        const [response, body] = await Application.scheduleRequest({
            url: `${BASE_URL}/comic/${mangaId}/${chapter.chapterId}.html`,
            method: 'GET'
        })
        if (response.status >= 400) throw new Error(`看漫画網站回應錯誤（HTTP ${response.status}）。請稍後再試。`)
        const data = chapterImageData(Application.arrayBufferToUTF8String(body))
        if (!data) throw new Error('看漫画的章節頁面無法解析（找不到圖片資料）。若網站上可以閱讀，請回報此錯誤。')
        const pages = chapterImageUrls(data, IMAGE_SERVER)
        if (!pages.length) throw new Error('看漫画沒有提供此章節的圖片。This chapter has no pages on Manhuagui.')
        return { id: chapter.chapterId, mangaId, pages }
    }

    async getSearchResults(query: SearchQuery<any>, metadata: any): Promise<PagedResults<SearchResultItem>> {
        const page = Number.isInteger(metadata?.page) && metadata.page > 0 ? metadata.page : 1
        const title = query.title?.trim() ?? ''

        // A genre picked on Discover arrives as a catalog filter.
        const genre = query.metadata?.genre
        if (!title && typeof genre === 'string' && GENRES.some(([id]) => id === genre)) {
            const result = await this.getListPage(genre, 'view', page)
            return { items: result.cards.map((card) => ({ ...card })), metadata: result.hasMore ? { page: page + 1 } : undefined }
        }

        if (!title) return EndOfPageResults
        const $ = await this.getDocument(`${BASE_URL}/s/${encodeURIComponent(title)}_p${page}.html`)
        const items: SearchResultItem[] = []
        const seen = new Set<string>()
        $('.book-result li.cf, .book-result > ul > li').each((_index, element) => {
            const item = $(element)
            const link = item.find('.book-detail dt a').first()
            const mangaId = mangaIdFromHref(link.attr('href') ?? item.find('a.bcover').attr('href') ?? '')
            if (!mangaId || seen.has(mangaId)) return
            seen.add(mangaId)
            items.push({
                mangaId,
                title: link.attr('title')?.trim() || link.text().trim() || mangaId,
                imageUrl: imageOf(item.find('.book-cover img').first()),
                subtitle: item.find('.book-detail .tags.status span.red').first().text().trim() || undefined
            })
        })
        return { items, metadata: items.length && hasNextPage($) ? { page: page + 1 } : undefined }
    }
}

export const Manhuagui = new ManhuaguiExtension()

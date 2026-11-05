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
    type SourceManga,
    type Tag,
    type TagSection
} from '@paperback/types'
import * as cheerio from 'cheerio'

import { chapterNumberFromName, verificationUrl } from './helpers'
import type BaozimhConfig from './pbconfig'

const BASE_URL = 'https://www.baozimh.com'
// Chapter pages are served from the TWManga reader domain.
const READER_URL = 'https://www.twmanga.com'
// Page images and covers come from Baozimh's CDN hosts (for example s1.bzcdn.net).
const IMAGE_HOST = /^https?:\/\/[^/]*(?:bzcdn\.net|baozicdn\.com|static-tw\.baozimh\.com)(?:[/:?#]|$)/i
// Hosts that serve Baozimh's HTML pages and can answer with its verification page.
const SITE_HOST = /^https?:\/\/(?:[^/]+\.)?(?:baozimh\.com|twmanga\.com|twbzmg\.com)(?:[/:?#]|$)/i

// Section titles exactly as they appear on Baozimh's home page.
const HOME_SECTIONS: { title: string; type: DiscoverSectionType; catalog?: Record<string, string> }[] = [
    { title: '熱門漫畫', type: DiscoverSectionType.prominentCarousel, catalog: {} },
    { title: '最近更新', type: DiscoverSectionType.simpleCarousel },
    { title: '最新上架', type: DiscoverSectionType.simpleCarousel },
    { title: '推薦國漫', type: DiscoverSectionType.simpleCarousel, catalog: { region: 'cn' } },
    { title: '推薦韓漫', type: DiscoverSectionType.simpleCarousel, catalog: { region: 'kr' } },
    { title: '推薦日漫', type: DiscoverSectionType.simpleCarousel, catalog: { region: 'jp' } },
    { title: '熱血漫畫', type: DiscoverSectionType.simpleCarousel, catalog: { type: 'rexie' } }
]
const GENRE_SECTION_ID = 'genres'
const FILTER_GROUPS = ['type', 'region', 'state'] as const
type FilterGroup = typeof FILTER_GROUPS[number]
type CatalogFilters = Record<FilterGroup, string>

type Card = { mangaId: string; title: string; imageUrl: string; subtitle?: string }

function absoluteUrl(value: string): string {
    if (value.startsWith('//')) return 'https:' + value
    if (value.startsWith('http://') || value.startsWith('https://')) return value
    return BASE_URL + (value.startsWith('/') ? value : '/' + value)
}

function mangaIdFromHref(href: string): string {
    return href.split('/comic/')[1]?.split(/[?#]/)[0] ?? ''
}

class BaozimhInterceptor extends PaperbackInterceptor {
    override async interceptRequest(request: Request): Promise<Request> {
        const headers: Record<string, string> = { ...(request.headers ?? {}) }
        const hasHeader = (name: string): boolean => Object.keys(headers).some((key) => key.toLowerCase() === name)
        // Baozimh's image CDN throttles hotlinked requests that arrive
        // without the reader's Referer, so later pages in a chapter time out.
        if (IMAGE_HOST.test(request.url)) {
            if (!hasHeader('referer')) headers['referer'] = READER_URL + '/'
            if (!hasHeader('accept')) headers['accept'] = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8'
        }
        else if (!hasHeader('referer')) {
            headers['referer'] = BASE_URL + '/'
        }
        // The verification cookie is tied to the browser's user agent.
        if (!hasHeader('user-agent')) headers['user-agent'] = await Application.getDefaultUserAgent()
        return { ...request, headers }
    }

    override async interceptResponse(request: Request, response: Response, data: ArrayBuffer): Promise<ArrayBuffer> {
        // Only Baozimh's own pages can be its verification page; images are
        // never decoded here.
        const url = response.url || request.url
        if (IMAGE_HOST.test(url) || !SITE_HOST.test(url) || data.byteLength > 2_000_000) return data
        const challenge = verificationUrl(Application.arrayBufferToUTF8String(data), url)
        if (challenge) {
            // Paperback shows its browser-verification banner for this error
            // and opens the page in its in-app browser.
            throw new CloudflareError(
                {
                    url: challenge,
                    method: 'GET',
                    headers: {
                        referer: BASE_URL + '/',
                        'user-agent': await Application.getDefaultUserAgent()
                    }
                },
                '包子漫畫需要瀏覽器驗證。請點選上方的驗證提示，在內建瀏覽器看到漫畫首頁後返回並重新整理。'
            )
        }
        return data
    }
}

export class BaozimhExtension implements ExtensionImpl<typeof BaozimhConfig> {
    rateLimiter = new BasicRateLimiter('rateLimiter', {
        numberOfRequests: 2,
        bufferInterval: 1,
        ignoreImages: true
    })
    // Keeps the cookie Baozimh sets once its browser check is passed.
    cookieStorage = new CookieStorageInterceptor({ storage: 'stateManager' })
    mainInterceptor = new BaozimhInterceptor('main')

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

    private async fetchText(url: string, referer = BASE_URL + '/'): Promise<string> {
        const [response, data] = await Application.scheduleRequest({
            url,
            method: 'GET',
            headers: { referer }
        })
        const text = Application.arrayBufferToUTF8String(data)
        if (response.status === 401 || response.status === 403) {
            throw new Error(`包子漫畫拒絕連線（HTTP ${response.status}）。請在內建瀏覽器確認網站能否正常瀏覽，再返回並重新整理。`)
        }
        if (response.status === 429) throw new Error('包子漫畫暫時限制請求次數（HTTP 429）。請稍候再重新整理。')
        if (response.status >= 400) throw new Error(`包子漫畫網站回應錯誤（HTTP ${response.status}）。請稍後再試。`)
        if (!text.trim()) throw new Error('包子漫畫回傳空白內容。請稍後再重新整理。')
        return text
    }

    private async getDocument(url: string): Promise<cheerio.CheerioAPI> {
        return cheerio.load(await this.fetchText(url))
    }

    // Scope cards to one section so neighboring recommendation rows don't mix.
    private parseCards($: cheerio.CheerioAPI, container: cheerio.Cheerio<any>): Card[] {
        const results: Card[] = []
        const seen = new Set<string>()
        container.find('.comics-card').each((_index, element) => {
            const card = $(element)
            const link = card.find('a[href*="/comic/"]').first()
            const mangaId = mangaIdFromHref(link.attr('href') ?? '')
            if (!mangaId || mangaId.startsWith('chapter/') || seen.has(mangaId)) return
            const title = card.find('.comics-card__title').first().text().trim()
                || link.attr('title')?.trim() || link.attr('aria-label')?.trim()
            const imageElement = card.find('amp-img, img').not('[placeholder], [fallback]').first()
            const image = imageElement.attr('data-src') || imageElement.attr('src') || ''
            if (!title || !image) return
            seen.add(mangaId)
            results.push({
                mangaId,
                title,
                imageUrl: absoluteUrl(image),
                subtitle: card.find('small.tags').first().text().replace(/\s+/g, ' ').trim() || undefined
            })
        })
        return results
    }

    private async homeSectionCards(title: string): Promise<Card[]> {
        const $ = await this.getDocument(BASE_URL + '/')
        const container = $('.index-recommend-items').filter((_index, element) =>
            $(element).find('.catalog-title').first().text().replace(/\s+/g, ' ').trim() === title).first()
        return this.parseCards($, container)
    }

    async getDiscoverSections(): Promise<DiscoverSection[]> {
        return [
            ...HOME_SECTIONS.map((section) => ({ id: 'home-' + section.title, title: section.title, type: section.type })),
            { id: GENRE_SECTION_ID, title: '題材', type: DiscoverSectionType.genres }
        ]
    }

    async getDiscoverSectionItems(section: DiscoverSection, metadata: any): Promise<PagedResults<DiscoverSectionItem>> {
        if (section.id === GENRE_SECTION_ID) {
            const genres = (await this.getFilterTags()).find((group) => group.id === 'type')
            return {
                items: (genres?.tags ?? []).map((tag) => ({
                    type: 'genresCarouselItem',
                    name: tag.title,
                    searchQuery: { title: '', metadata: { type: tag.id } }
                }))
            }
        }

        const title = section.id.startsWith('home-') ? section.id.slice(5) : ''
        const home = HOME_SECTIONS.find((value) => value.title === title)
        if (!home) return EndOfPageResults
        const itemType = section.type === DiscoverSectionType.prominentCarousel ? 'prominentCarouselItem' : 'simpleCarouselItem'
        const toItems = (cards: Card[]): DiscoverSectionItem[] => cards.map((card) => ({
            type: itemType,
            mangaId: card.mangaId,
            title: card.title,
            imageUrl: card.imageUrl,
            subtitle: card.subtitle
        }))

        // Later pages of the broader rows continue from the matching catalog.
        if (metadata?.catalogPage) {
            const page = await this.getCatalogPage({ type: 'all', region: 'all', state: 'all', ...home.catalog }, metadata.catalogPage)
            return {
                items: toItems(page.cards),
                metadata: page.hasMore ? { catalogPage: metadata.catalogPage + 1 } : undefined
            }
        }

        const cards = title === '最新上架'
            ? await this.getDocument(BASE_URL + '/list/new').then(($) => this.parseCards($, $.root()))
            : await this.homeSectionCards(title)
        return {
            items: toItems(cards),
            metadata: home.catalog ? { catalogPage: 1 } : undefined
        }
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}`)
        const meta = (property: string): string =>
            $(`meta[name="${property}"], meta[property="${property}"]`).first().attr('content')?.trim() ?? ''

        const title = meta('og:novel:book_name') || meta('og:title').replace(/漫畫.*$/, '').trim() || $('h1').first().text().trim()
        const statusText = meta('og:novel:status')
        const status = /完結|已完|completed/i.test(statusText) ? 'Completed' : /連載|ongoing/i.test(statusText) ? 'Ongoing' : 'Unknown'
        const genres = meta('og:novel:category').split(',').map((value) => value.trim()).filter(Boolean)

        return {
            mangaId,
            mangaInfo: {
                primaryTitle: title || mangaId,
                secondaryTitles: [],
                thumbnailUrl: absoluteUrl(meta('og:image')),
                synopsis: meta('description') || meta('og:description'),
                contentRating: ContentRating.MATURE,
                status,
                author: meta('og:novel:author'),
                artist: meta('og:novel:author'),
                tagGroups: genres.length ? [{ id: 'genres', title: 'Genres', tags: genres.map((genre) => ({ id: genre, title: genre })) }] : [],
                shareUrl: `${BASE_URL}/comic/${mangaId}`
            }
        }
    }

    async getChapters(sourceManga: SourceManga): Promise<Chapter[]> {
        const $ = await this.getDocument(`${BASE_URL}/comic/${sourceManga.mangaId}`)
        const entries: { url: string; name: string; slot: number; section: number; number: number | undefined }[] = []
        const seen = new Set<string>()

        $('a.comics-chapters__item, a[href*="/user/page_direct?"]').each((_index, element) => {
            const href = $(element).attr('href')?.replace(/&amp;/g, '&') ?? ''
            const slotText = href.match(/[?&]chapter_slot=(\d+)/)?.[1]
            const sectionSlot = href.match(/[?&]section_slot=(\d+)/)?.[1]
            // Every split section shares chapter_slot; section_slot identifies
            // the individual reader URL. The page also repeats the latest
            // chapters in a second block, which this removes.
            const dedupeKey = slotText ? `slot:${slotText}:section:${sectionSlot ?? href}` : href
            if (!href || seen.has(dedupeKey)) return
            seen.add(dedupeKey)
            const name = $(element).text().replace(/\s+/g, ' ').trim()
            entries.push({
                url: absoluteUrl(href),
                name,
                slot: slotText ? Number(slotText) : entries.length,
                section: sectionSlot ? Number(sectionSlot) : 0,
                number: chapterNumberFromName(name)
            })
        })

        // Extras have no number of their own. Number them just after the
        // chapter published before them (slot order is publication order), so
        // “公告” after 第175話 becomes 175.1 instead of colliding with a real chapter.
        const extraNumbers = new Map<typeof entries[number], number>()
        let previous = 0, extrasAfterPrevious = 0
        for (const entry of [...entries].sort((a, b) => a.slot - b.slot || a.section - b.section)) {
            if (entry.number !== undefined) {
                previous = entry.number
                extrasAfterPrevious = 0
            }
            else {
                extrasAfterPrevious++
                extraNumbers.set(entry, Math.round((previous + Math.min(extrasAfterPrevious, 9) / 10) * 10) / 10)
            }
        }

        // Baozimh sometimes publishes one chapter as several adjacent reader
        // URLs (part 1/4 through 4/4). Keep them in one Paperback chapter,
        // grouped by chapter number. Extras are never grouped.
        const chapterGroups = new Map<string, { urls: string[]; name: string; chapNum: number }>()
        for (const entry of entries) {
            const key = entry.number !== undefined ? `number:${entry.number}` : `slot:${entry.slot}`
            const group = chapterGroups.get(key)
            if (group) {
                group.urls.push(entry.url)
                continue
            }
            const groupName = entry.name
                .replace(/\s*[（(]\s*\d+\s*(?:[/／]|of)\s*\d+\s*[）)]\s*$/i, '')
                .replace(/\s*[-_－]\s*\d+\s*$/, '')
                .trim()
            chapterGroups.set(key, {
                urls: [entry.url],
                name: groupName || entry.name,
                chapNum: entry.number ?? extraNumbers.get(entry)!
            })
        }

        return Array.from(chapterGroups.values()).map((group) => ({
            chapterId: encodeURIComponent(JSON.stringify(group.urls)),
            sourceManga,
            chapNum: group.chapNum,
            langCode: 'zh',
            title: group.name
        }))
    }

    async getChapterDetails(chapter: Chapter): Promise<ChapterDetails> {
        const mangaId = chapter.sourceManga.mangaId
        let urls: string[]
        try {
            const decoded = JSON.parse(decodeURIComponent(chapter.chapterId))
            urls = Array.isArray(decoded) && decoded.every((url) => typeof url === 'string') ? decoded : [absoluteUrl(chapter.chapterId)]
        }
        catch {
            urls = [absoluteUrl(chapter.chapterId)]
        }

        // A single page-direct redirect (chapter_slot=1&comic_id=...) maps to
        // deterministic TWManga reader URLs; resolve those directly.
        if (urls.length === 1) {
            const chapterSlot = urls[0]!.match(/[?&]chapter_slot=(\d+)/)?.[1]
            const comicId = urls[0]!.match(/[?&]comic_id=([^&]+)/)?.[1]
            if (chapterSlot && comicId) {
                const base = `${READER_URL}/comic/chapter/${decodeURIComponent(comicId)}/0_${chapterSlot}`
                urls = Array.from({ length: 4 }, (_value, index) => index === 0 ? `${base}.html` : `${base}_${index + 1}.html`)
            }
        }

        // Older chapter IDs can hold only the first URL of a split chapter.
        // Rebuild the group from the manga page in that case.
        if (urls.length === 1) {
            try {
                const chapterList = await this.getChapters(chapter.sourceManga)
                const initialUrl = urls[0]!
                const chapterSlot = (value: string): string | undefined => {
                    const decoded = decodeURIComponent(value)
                    return decoded.match(/\/\d+_(\d+)(?:_\d+)?\.html(?:[?#].*)?$/)?.[1]
                        ?? decoded.match(/[?&]chapter_slot=(\d+)/)?.[1]
                }
                const initialSlot = chapterSlot(initialUrl)
                for (const candidate of chapterList) {
                    try {
                        const grouped = JSON.parse(decodeURIComponent(candidate.chapterId))
                        if (!Array.isArray(grouped) || !grouped.every((value) => typeof value === 'string')) continue
                        if (grouped.includes(initialUrl) || (initialSlot !== undefined && grouped.some((value) => chapterSlot(value) === initialSlot))) {
                            urls = grouped
                            break
                        }
                    }
                    catch {
                        // Ignore malformed chapter IDs and keep looking.
                    }
                }
            }
            catch (error) {
                if (error instanceof CloudflareError) throw error
                // Continuation discovery below remains the fallback.
            }
        }

        const discoverContinuations = urls.length === 1
        const pages: string[] = []
        const seen = new Set<string>()
        const addPages = ($: cheerio.CheerioAPI): number => {
            let added = 0
            $('amp-img.comic-contain__item, .comic-contain img').each((_index, element) => {
                const page = $(element).attr('data-src') || $(element).attr('src') || ''
                if (!page || seen.has(page)) return
                seen.add(page)
                pages.push(absoluteUrl(page))
                added++
            })
            return added
        }

        // Kept so an empty chapter reports why its reader page failed.
        let firstError: unknown
        // Baozimh shows this notice instead of images for chapters it took down.
        let blocked = false
        for (const url of urls) {
            let $: cheerio.CheerioAPI
            try {
                $ = await this.getDocument(url)
            }
            catch (error) {
                // The browser check must reach the app so it can show its banner.
                if (error instanceof CloudflareError) throw error
                // A generated continuation can be absent when a title has fewer sections.
                firstError ??= error
                continue
            }
            addPages($)
            if ($('.empty_chapters_tips').length) blocked = true
            if (!discoverContinuations) continue

            // Remaining parts live at 0_1_2.html, 0_1_3.html, … next to the
            // canonical reader URL.
            const canonical = absoluteUrl($('link[rel="canonical"]').attr('href') || $('meta[property="og:url"]').attr('content') || url)
            const match = canonical.match(/^(https?:\/\/[^/]+\/comic\/chapter\/[^/]+\/\d+_(\d+))(?:_\d+)?\.html(?:[?#].*)?$/)
            if (!match) continue
            for (let part = 2; part <= 10; part++) {
                const continuation = `${match[1]}_${part}.html`
                if (urls.includes(continuation)) continue
                try {
                    if (addPages(await this.getDocument(continuation)) === 0) break
                }
                catch (error) {
                    if (error instanceof CloudflareError) throw error
                    break
                }
            }
        }

        if (pages.length === 0) {
            if (blocked) throw new Error('包子漫畫已屏蔽此章節（網站顯示資料缺失），網站上也無法閱讀。This chapter has been taken down by Baozimh.')
            if (firstError) throw firstError
            throw new Error('Baozimh returned no readable page images for this chapter.')
        }

        return { id: chapter.chapterId, mangaId, pages }
    }

    private async getFilterTags(): Promise<TagSection[]> {
        const $ = await this.getDocument(BASE_URL + '/classify')
        const labels: Record<FilterGroup, string> = { type: '題材', region: '地區', state: '狀態' }
        return FILTER_GROUPS.map((group) => {
            const tags = new Map<string, string>()
            $('a[href*="/classify?"]').each((_index, element) => {
                const href = $(element).attr('href') ?? ''
                const value = href.match(new RegExp('[?&]' + group + '=([^&]+)'))?.[1]
                const label = $(element).text().trim()
                if (value && value !== 'all' && label && /^[a-z]+$/.test(value)) tags.set(value, label)
            })
            if (!tags.size) throw new Error('Baozimh returned no search filters. Please try again later.')
            return {
                id: group,
                title: labels[group],
                tags: Array.from(tags, ([id, title]): Tag => ({ id, title }))
            }
        })
    }

    private async getCatalogPage(values: CatalogFilters, page: number): Promise<{ cards: Card[]; hasMore: boolean }> {
        const url = BASE_URL + '/api/bzmhq/amp_comic_list?'
            + FILTER_GROUPS.map((group) => group + '=' + encodeURIComponent(values[group])).join('&')
            + '&filter=*&page=' + page + '&limit=36&language=tw'
        let data: any
        try { data = JSON.parse(await this.fetchText(url, BASE_URL + '/classify')) }
        catch (error) {
            if (error instanceof SyntaxError) throw new Error('Baozimh returned an invalid catalog response. Please try again later.')
            throw error
        }
        if (!Array.isArray(data?.items)) throw new Error('Baozimh returned an invalid catalog response. Please try again later.')
        const cards: Card[] = []
        const seen = new Set<string>()
        for (const item of data.items) {
            if (typeof item.comic_id !== 'string' || !item.name || !item.topic_img || seen.has(item.comic_id)) continue
            seen.add(item.comic_id)
            cards.push({
                mangaId: item.comic_id,
                title: item.name,
                imageUrl: 'https://static-tw.baozimh.com/cover/' + item.topic_img + '?w=285&h=375&q=100',
                subtitle: item.author || undefined
            })
        }
        return { cards, hasMore: Boolean(data.next) && cards.length > 0 }
    }

    async getSearchResults(query: SearchQuery<any>, metadata: any): Promise<PagedResults<SearchResultItem>> {
        const toResults = (cards: Card[]): SearchResultItem[] => cards.map((card) => ({ ...card }))

        // A genre picked on Discover arrives as a catalog filter.
        const filters = query.metadata as Partial<CatalogFilters> | undefined
        if (!query.title?.trim() && filters && FILTER_GROUPS.some((group) => filters[group])) {
            const values: CatalogFilters = { type: 'all', region: 'all', state: 'all' }
            for (const group of FILTER_GROUPS) {
                const value = filters[group]
                if (typeof value === 'string' && /^[a-z]+$/.test(value)) values[group] = value
            }
            const page = Number.isInteger(metadata?.page) && metadata.page > 0 ? metadata.page : 1
            const result = await this.getCatalogPage(values, page)
            return { items: toResults(result.cards), metadata: result.hasMore ? { page: page + 1 } : undefined }
        }

        const title = query.title?.trim() ?? ''
        if (!title) return EndOfPageResults
        const $ = await this.getDocument(`${BASE_URL}/search?q=${encodeURIComponent(title)}`)
        const items: SearchResultItem[] = []
        const seen = new Set<string>()
        $('.comics-card').each((_index, element) => {
            const card = $(element)
            const link = card.find('a[href^="/comic/"]').first()
            const mangaId = mangaIdFromHref(link.attr('href') ?? '')
            if (!mangaId || seen.has(mangaId)) return
            seen.add(mangaId)
            const imageElement = card.find('amp-img').first()
            const image = imageElement.attr('src') || imageElement.attr('data-src') || ''
            items.push({
                mangaId,
                title: card.find('.comics-card__title h3').first().text().trim() || link.attr('title')?.trim() || mangaId,
                imageUrl: absoluteUrl(image),
                subtitle: card.find('small.tags').first().text().replace(/\s+/g, ' ').trim() || undefined
            })
        })
        // The search page has no further pages.
        return { items, metadata: undefined }
    }
}

export const Baozimh = new BaozimhExtension()

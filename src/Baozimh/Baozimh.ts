import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    PartialSourceManga,
    TagSection,
    PagedResults,
    SearchRequest,
    Source,
    SourceInfo,
    SourceIntents,
    SourceManga
} from '@paperback/types'

const BASE_URL = 'https://www.baozimh.com'

export const BaozimhInfo: SourceInfo = {
    version: '1.4.1',
    name: 'Baozimh',
    icon: 'icon.png',
    author: 'Steven Lai',
    authorWebsite: 'https://github.com/InsaneGenie',
    description: 'Read Traditional Chinese manga from Baozimh.',
    contentRating: ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    sourceTags: [],
    intents: SourceIntents.MANGA_CHAPTERS | SourceIntents.HOMEPAGE_SECTIONS
}

export class Baozimh extends Source {
    requestManager = App.createRequestManager({
        requestsPerSecond: 2,
        requestTimeout: 20000
    })

    private async getDocument(url: string): Promise<any> {
        const request = App.createRequest({
            url,
            method: 'GET',
            headers: {
                referer: BASE_URL + '/',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
            }
        })
        const response = await this.requestManager.schedule(request, 1)
        return this.cheerio.load(response.data as string)
    }

    private absoluteUrl(value: string): string {
        if (value.startsWith('//')) return 'https:' + value
        if (value.startsWith('http://') || value.startsWith('https://')) return value
        return BASE_URL + (value.startsWith('/') ? value : '/' + value)
    }

    private mangaIdFromHref(href: string): string {
        return href.split('/comic/')[1]?.split(/[?#]/)[0] ?? ''
    }

    // Scope cards to one section so neighboring recommendation rows don't mix.
    private parseCards($: any, container: any): PartialSourceManga[] {
        const results: PartialSourceManga[] = []
        const seen = new Set<string>()
        container.find('.comics-card').each((_index: number, element: any) => {
            const card = $(element)
            const link = card.find('a[href*="/comic/"]').first()
            const mangaId = this.mangaIdFromHref(link.attr('href') ?? '')
            if (!mangaId || mangaId.startsWith('chapter/') || seen.has(mangaId)) return
            const title = card.find('.comics-card__title').first().text().trim()
                || link.attr('title')?.trim() || link.attr('aria-label')?.trim()
            const imageElement = card.find('amp-img, img').not('[placeholder], [fallback]').first()
            const image = imageElement.attr('data-src') || imageElement.attr('src') || ''
            if (!title || !image) return
            seen.add(mangaId)
            results.push(App.createPartialSourceManga({
                mangaId,
                title,
                image: this.absoluteUrl(image),
                subtitle: card.find('small.tags').first().text().replace(/\s+/g, ' ').trim() || undefined
            }))
        })
        return results
    }

    override async getHomePageSections(sectionCallback: (section: HomeSection) => void): Promise<void> {
        const $ = await this.getDocument(BASE_URL + '/')
        const seen = new Set<string>()
        $('.index-recommend-items').each((_index: number, element: any) => {
            const container = $(element)
            const title = container.find('.catalog-title').first().text().replace(/\s+/g, ' ').trim()
            if (!title || seen.has(title)) return
            const items = this.parseCards($, container)
            if (!items.length) return
            seen.add(title)
            sectionCallback(App.createHomeSection({
                // Use the heading rather than its position to keep IDs stable on reorder.
                id: 'home-' + encodeURIComponent(title),
                title,
                type: 'singleRowNormal',
                items: items.slice(0, 12),
                containsMoreItems: ['熱門漫畫', '推薦國漫', '推薦韓漫', '推薦日漫', '熱血漫畫', '最新上架', '最近更新'].includes(title)
            }))
        })
        if (!seen.size) throw new Error('Baozimh homepage returned no manga listings. Please try again later.')
    }

    override async getViewMoreItems(sectionId: string, metadata: any): Promise<PagedResults> {
        const section = sectionId.startsWith('home-') ? decodeURIComponent(sectionId.slice(5)) : ''
        const catalogFilters: Record<string, Record<string, string>> = {
            '熱門漫畫': {},
            '推薦國漫': {region: 'cn'},
            '推薦韓漫': {region: 'kr'},
            '推薦日漫': {region: 'jp'},
            '熱血漫畫': {type: 'rexie'}
        }
        if (Object.prototype.hasOwnProperty.call(catalogFilters, section)) {
            // These are broader matching catalogs, not additional curated recommendations.
            return this.getCatalogPage({type: 'all', region: 'all', state: 'all', ...catalogFilters[section]}, metadata)
        }
        if (section === '最新上架') {
            const $ = await this.getDocument(BASE_URL + '/list/new')
            const results = this.parseCards($, $.root())
            if (!results.length) throw new Error('Baozimh returned no new titles. Please try again later.')
            return App.createPagedResults({results})
        }
        if (section === '最近更新') {
            const $ = await this.getDocument(BASE_URL + '/')
            const container = $('.index-recommend-items').filter((_index: number, element: any) =>
                $(element).find('.catalog-title').first().text().trim() === section).first()
            const results = this.parseCards($, container)
            if (!results.length) throw new Error('Baozimh returned no recent updates. Please try again later.')
            return App.createPagedResults({results})
        }
        throw new Error('Unknown Baozimh Discover section. Refresh Discover and try again.')
    }

    async getMangaDetails(mangaId: string): Promise<SourceManga> {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}`)
        const meta = (property: string): string =>
            $(`meta[name="${property}"], meta[property="${property}"]`).first().attr('content')?.trim() ?? ''

        const title = meta('og:novel:book_name') || meta('og:title').replace(/漫畫.*$/, '').trim() || $('h1').first().text().trim()
        const statusText = meta('og:novel:status')
        const status = /完結|已完|completed/i.test(statusText) ? 'Completed' : /連載|ongoing/i.test(statusText) ? 'Ongoing' : 'Unknown'
        const genres = meta('og:novel:category').split(',').map((value) => value.trim()).filter(Boolean)
        const tags = genres.length === 0 ? [] : [App.createTagSection({
            id: 'genres',
            label: 'Genres',
            tags: genres.map((genre) => App.createTag({ id: genre, label: genre }))
        })]

        return App.createSourceManga({
            id: mangaId,
            mangaInfo: App.createMangaInfo({
                titles: [title || mangaId],
                image: this.absoluteUrl(meta('og:image')),
                status,
                author: meta('og:novel:author'),
                artist: meta('og:novel:author'),
                desc: meta('description') || meta('og:description'),
                tags
            })
        })
    }

    async getChapters(mangaId: string): Promise<Chapter[]> {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}`)
        const chapterGroups = new Map<string, { urls: string[]; name: string; chapNum: number }>()
        const seen = new Set<string>()

        $('a.comics-chapters__item, a[href*="/user/page_direct?"]').each((_index: number, element: any) => {
            const href = $(element).attr('href')?.replace(/&amp;/g, '&') ?? ''
            const slotText = href.match(/[?&]chapter_slot=(\d+)/)?.[1]
            const dedupeKey = slotText ? `slot:${slotText}` : href
            if (!href || seen.has(dedupeKey)) return
            seen.add(dedupeKey)

            const name = $(element).text().replace(/\s+/g, ' ').trim()
            const numberText = name.match(/(?:第\s*)?(\d+(?:\.\d+)?)/)?.[1]
            const chapterNumber = Number.parseFloat(numberText ?? slotText ?? String(chapterGroups.size + 1))

            // Baozimh sometimes publishes one chapter as several adjacent reader
            // URLs (for example, part 1/4 through part 4/4). Keep those parts in
            // one Paperback chapter instead of making the reader stop after part 1.
            const groupName = name
                .replace(/\s*[（(]\s*\d+\s*(?:[/／]|of)\s*\d+\s*[）)]\s*$/i, '')
                .replace(/\s*[-_－]\s*\d+\s*$/, '')
                .trim()
            // Baozimh may label parts differently (for example, “1”, “1-2”,
            // or “第一話（下）”), so the chapter number—not the displayed part
            // text—is the stable grouping key.
            const key = String(Number.isFinite(chapterNumber) ? chapterNumber : chapterGroups.size + 1)
            const group = chapterGroups.get(key)
            if (group) group.urls.push(this.absoluteUrl(href))
            else chapterGroups.set(key, {
                urls: [this.absoluteUrl(href)],
                name: groupName || name,
                chapNum: Number.isFinite(chapterNumber) ? chapterNumber : chapterGroups.size + 1
            })
        })

        return Array.from(chapterGroups.values()).map((group) => App.createChapter({
            id: encodeURIComponent(JSON.stringify(group.urls)),
            chapNum: group.chapNum,
            langCode: 'zh',
            name: group.name
        }))
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        let urls: string[]
        try {
            const decoded = JSON.parse(decodeURIComponent(chapterId))
            urls = Array.isArray(decoded) && decoded.every((url) => typeof url === 'string') ? decoded : [this.absoluteUrl(chapterId)]
        }
        catch (_error) {
            urls = [this.absoluteUrl(chapterId)]
        }
        const pages: string[] = []
        const seen = new Set<string>()

        for (const url of urls) {
            const $ = await this.getDocument(url)
            $('amp-img.comic-contain__item, .comic-contain img').each((_index: number, element: any) => {
                const page = $(element).attr('data-src') || $(element).attr('src') || ''
                if (!page || seen.has(page)) return
                seen.add(page)
                pages.push(this.absoluteUrl(page))
            })
        }

        if (pages.length === 0) throw new Error('Baozimh returned no readable page images for this chapter.')

        return App.createChapterDetails({
            id: chapterId,
            mangaId,
            pages
        })
    }

    override async getSearchTags(): Promise<TagSection[]> {
        const $ = await this.getDocument(BASE_URL + '/classify')
        return ['type', 'region', 'state'].map((group) => {
            const tags = new Map<string, string>()
            $('a[href*="/classify?"]').each((_index: number, element: any) => {
                const href = $(element).attr('href') ?? ''
                const value = href.match(new RegExp('[?&]' + group + '=([^&]+)'))?.[1]
                const label = $(element).text().trim()
                if (value && value !== 'all' && label && /^[a-z]+$/.test(value)) tags.set(value, label)
            })
            if (!tags.size) throw new Error('Baozimh returned no search filters. Please try again later.')
            return App.createTagSection({
                id: group,
                label: ({type: '題材（選一項）', region: '地區（選一項）', state: '狀態（選一項）'} as Record<string, string>)[group]!,
                tags: Array.from(tags, ([value, label]) => App.createTag({id: group + ':' + value, label}))
            })
        })
    }

    override async getTags(): Promise<TagSection[]> { return this.getSearchTags() }
    override async supportsTagExclusion(): Promise<boolean> { return false }
    override async supportsSearchOperators(): Promise<boolean> { return false }

    private async searchByTags(query: SearchRequest, metadata: any): Promise<PagedResults> {
        if (query.title?.trim()) throw new Error('使用標籤時請清空搜尋文字。Clear the search text to browse by tags.')
        const values: Record<string, string> = {type: 'all', region: 'all', state: 'all'}
        for (const tag of query.includedTags ?? []) {
            const match = /^(type|region|state):([a-z]+)$/.exec(tag.id)
            if (!match) throw new Error('Please select filters from the Baozimh search filter list.')
            const group = match[1]!, value = match[2]!
            if (values[group] !== 'all' && values[group] !== value) throw new Error('每組只能選一項。Select only one genre, one region, and one status.')
            values[group] = value
        }
        return this.getCatalogPage(values, metadata)
    }

    private async getCatalogPage(values: Record<string, string>, metadata: any): Promise<PagedResults> {
        const key = JSON.stringify(values)
        const page = metadata?.key === key && Number.isInteger(metadata.page) && metadata.page > 0 ? metadata.page : 1
        const url = BASE_URL + '/api/bzmhq/amp_comic_list?' +
            ['type', 'region', 'state'].map(group => group + '=' + encodeURIComponent(values[group]!)).join('&') +
            '&filter=*&page=' + page + '&limit=36&language=tw'
        const response = await this.requestManager.schedule(App.createRequest({
            url, method: 'GET', headers: {referer: BASE_URL + '/classify'}
        }), 1)
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data
        if (!Array.isArray(data?.items)) throw new Error('Baozimh returned an invalid catalog response. Please try again later.')
        const results: PartialSourceManga[] = []
        const seen = new Set<string>()
        for (const item of data.items) {
            if (typeof item.comic_id !== 'string' || !item.name || !item.topic_img || seen.has(item.comic_id)) continue
            seen.add(item.comic_id)
            results.push(App.createPartialSourceManga({
                mangaId: item.comic_id, title: item.name,
                image: 'https://static-tw.baozimh.com/cover/' + item.topic_img + '?w=285&h=375&q=100',
                subtitle: item.author || undefined
            }))
        }
        return App.createPagedResults({results, metadata: data.next && results.length ? {page: page + 1, key} : undefined})
    }

    override async getSearchResults(query: SearchRequest, metadata: any): Promise<PagedResults> {
        if (query.excludedTags?.length) throw new Error('Baozimh does not support excluding tags.')
        if (query.includedTags?.length) return this.searchByTags(query, metadata)
        const title = query.title?.trim() ?? ''
        if (!title) return App.createPagedResults({ results: [] })

        const $ = await this.getDocument(`${BASE_URL}/search?q=${encodeURIComponent(title)}`)
        const results: any[] = []
        $('.comics-card').each((_index: number, element: any) => {
            const card = $(element)
            const link = card.find('a[href^="/comic/"]').first()
            const href = link.attr('href') ?? ''
            const mangaId = this.mangaIdFromHref(href)
            const imageElement = card.find('amp-img').first()
            const image = imageElement.attr('src') || imageElement.attr('data-src') || ''
            const resultTitle = card.find('.comics-card__title h3').first().text().trim() || link.attr('title')?.trim() || mangaId
            const subtitle = card.find('small.tags').first().text().replace(/\s+/g, ' ').trim()
            if (!mangaId) return
            results.push(App.createPartialSourceManga({
                title: resultTitle,
                image: this.absoluteUrl(image),
                mangaId,
                subtitle: subtitle || undefined
            }))
        })

        return App.createPagedResults({ results })
    }

    override getMangaShareUrl(mangaId: string): string {
        return `${BASE_URL}/comic/${mangaId}`
    }
}

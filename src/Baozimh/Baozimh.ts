import {
    Chapter,
    ChapterDetails,
    ContentRating,
    HomeSection,
    PartialSourceManga,
    PagedResults,
    SearchRequest,
    Source,
    SourceInfo,
    SourceIntents,
    SourceManga
} from '@paperback/types'

const BASE_URL = 'https://www.baozimh.com'

export const BaozimhInfo: SourceInfo = {
    version: '1.1.0',
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
                items,
                // All cards in this homepage row are included. No fabricated pagination.
                containsMoreItems: false
            }))
        })
        if (!seen.size) throw new Error('Baozimh homepage returned no manga listings. Please try again later.')
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
        const chapters: Chapter[] = []
        const seen = new Set<string>()

        $('a.comics-chapters__item, a[href*="/user/page_direct?"]').each((_index: number, element: any) => {
            const href = $(element).attr('href')?.replace(/&amp;/g, '&') ?? ''
            const slotText = href.match(/[?&]chapter_slot=(\d+)/)?.[1]
            const dedupeKey = slotText ? `slot:${slotText}` : href
            if (!href || seen.has(dedupeKey)) return
            seen.add(dedupeKey)

            const name = $(element).text().replace(/\s+/g, ' ').trim()
            const numberText = name.match(/(?:第\s*)?(\d+(?:\.\d+)?)/)?.[1]
            const chapterNumber = Number.parseFloat(numberText ?? slotText ?? String(chapters.length + 1))

            chapters.push(App.createChapter({
                id: this.absoluteUrl(href),
                chapNum: Number.isFinite(chapterNumber) ? chapterNumber : chapters.length + 1,
                langCode: 'zh',
                name
            }))
        })

        return chapters
    }

    async getChapterDetails(mangaId: string, chapterId: string): Promise<ChapterDetails> {
        const $ = await this.getDocument(this.absoluteUrl(chapterId))
        const pages: string[] = []
        const seen = new Set<string>()

        $('amp-img.comic-contain__item, .comic-contain img').each((_index: number, element: any) => {
            const page = $(element).attr('data-src') || $(element).attr('src') || ''
            if (!page || seen.has(page)) return
            seen.add(page)
            pages.push(this.absoluteUrl(page))
        })

        if (pages.length === 0) throw new Error('Baozimh returned no readable page images for this chapter.')

        return App.createChapterDetails({
            id: chapterId,
            mangaId,
            pages
        })
    }

    override async getSearchResults(query: SearchRequest, _metadata: any): Promise<PagedResults> {
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

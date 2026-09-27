                || url
            )
            const match = canonical.match(/^(https?:\/\/[^/]+\/comic\/chapter\/[^/]+\/\d+_(\d+))(?:_\d+)?\.html(?:[?#].*)?$/)
            if (!match) continue
            const base = match[1]
            // Baozimh/TWManga normally uses only a handful of continuation pages.
            // Keep a conservative upper bound so a missing page cannot create a
            // long series of timed-out requests on mobile devices.
            for (let part = 2; part <= 10; part++) {
                const continuation = `${base}_${part}.html`
                if (urls.includes(continuation)) continue
                try {
                    const continuationDocument = await this.getDocument(continuation)
                    if (addPages(continuationDocument) === 0) break
                }
                catch (_error) {
                    // A missing continuation means the chapter has ended.
                    break
                }
            }
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
        const response = await this.requestManager.schedule(await this.websiteRequest(url, BASE_URL + '/classify'), 1)
        this.checkWebsiteResponse(response)
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

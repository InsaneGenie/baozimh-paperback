import {
    AdvancedSearchForm,
    LabelRow,
    Section,
    SelectSection,
    type FormSectionElement
} from '@paperback/types'

export type FilterGroup = {
    id: string
    title: string
    options: { id: string; title: string }[]
}

// Value used for "no filter" in every group.
export const ANY_FILTER = 'all'

// The search screen's filter sheet: one single-choice list per catalog filter.
// Submitting gives the search a metadata object such as
// { type: 'rexie', region: 'all' }, the same shape Discover genres use.
export class CatalogFilterForm extends AdvancedSearchForm {
    private groups: FilterGroup[] | Error | undefined
    private readonly selected: Record<string, string[]> = {}

    constructor(
        private readonly initial: Record<string, unknown> | undefined,
        groups: FilterGroup[] | Promise<FilterGroup[]>,
        private readonly anyTitle = '全部'
    ) {
        super()
        if (groups instanceof Promise) {
            groups
                .then((value) => this.setGroups(value))
                .catch((error) => { this.groups = error instanceof Error ? error : new Error(String(error)) })
                .finally(() => this.reloadForm())
        } else {
            this.setGroups(groups)
        }
    }

    private setGroups(groups: FilterGroup[]): void {
        for (const group of groups) {
            const value = this.initial?.[group.id]
            const known = typeof value === 'string' && group.options.some((option) => option.id === value)
            this.selected[group.id] = [known ? value : ANY_FILTER]
        }
        this.groups = groups
    }

    getSections(): FormSectionElement<unknown>[] {
        if (!this.groups) return [Section('loading', [LabelRow('loading', { title: '載入篩選中… Loading filters' })])]
        if (this.groups instanceof Error) {
            return [Section('error', [LabelRow('error', { title: '無法載入篩選 Could not load filters', subtitle: this.groups.message })])]
        }
        return this.groups.map((group) => SelectSection(this, {
            id: group.id,
            header: group.title,
            layout: 'flow',
            value: this.selected[group.id]!,
            items: [{ id: ANY_FILTER, title: this.anyTitle }, ...group.options],
            minItemCount: 1,
            maxItemCount: 1
        }))
    }

    getSearchQueryMetadata(): Record<string, string> {
        const metadata: Record<string, string> = {}
        if (!this.groups || this.groups instanceof Error) return metadata
        for (const group of this.groups) metadata[group.id] = this.selected[group.id]?.[0] ?? ANY_FILTER
        return metadata
    }

    override async formDidSubmit(): Promise<void> {
        if (!this.groups) throw new Error('篩選仍在載入，請稍候。Filters are still loading.')
        if (this.groups instanceof Error) throw this.groups
    }
}

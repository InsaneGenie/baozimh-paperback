import { ContentRating, SourceIntents, type ExtensionInfo } from '@paperback/types'

export default {
    name: 'Manhuagui',
    description: 'Read Chinese manga from Manhuagui (看漫画).',
    version: '1.0.1',
    icon: 'icon.png',
    language: 'zh',
    contentRating: ContentRating.MATURE,
    capabilities: [
        SourceIntents.CHAPTER_PROVIDING,
        SourceIntents.CLOUDFLARE_BYPASS_PROVIDING,
        SourceIntents.DISCOVER_SECTION_PROVIDING,
        SourceIntents.SEARCH_RESULT_PROVIDING
    ],
    badges: [],
    developers: [
        {
            name: 'Steven Lai',
            github: 'https://github.com/InsaneGenie'
        }
    ]
} satisfies ExtensionInfo

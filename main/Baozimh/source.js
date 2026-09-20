(function(f){if(typeof exports==="object"&&typeof module!=="undefined"){module.exports=f()}else if(typeof define==="function"&&define.amd){define([],f)}else{var g;if(typeof window!=="undefined"){g=window}else if(typeof global!=="undefined"){g=global}else if(typeof self!=="undefined"){g=self}else{g=this}g.Sources = f()}})(function(){var define,module,exports;return (function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.BadgeColor = void 0;
var BadgeColor;
(function (BadgeColor) {
    BadgeColor["BLUE"] = "default";
    BadgeColor["GREEN"] = "success";
    BadgeColor["GREY"] = "info";
    BadgeColor["YELLOW"] = "warning";
    BadgeColor["RED"] = "danger";
})(BadgeColor = exports.BadgeColor || (exports.BadgeColor = {}));

},{}],2:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],3:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.HomeSectionType = void 0;
var HomeSectionType;
(function (HomeSectionType) {
    HomeSectionType["singleRowNormal"] = "singleRowNormal";
    HomeSectionType["singleRowLarge"] = "singleRowLarge";
    HomeSectionType["doubleRow"] = "doubleRow";
    HomeSectionType["featured"] = "featured";
})(HomeSectionType = exports.HomeSectionType || (exports.HomeSectionType = {}));

},{}],4:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],5:[function(require,module,exports){
"use strict";
/**
 * Request objects hold information for a particular source (see sources for example)
 * This allows us to to use a generic api to make the calls against any source
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.urlEncodeObject = exports.convertTime = exports.Source = void 0;
/**
* @deprecated Use {@link PaperbackExtensionBase}
*/
class Source {
    constructor(cheerio) {
        this.cheerio = cheerio;
    }
    /**
     * @deprecated use {@link Source.getSearchResults getSearchResults} instead
     */
    searchRequest(query, metadata) {
        return this.getSearchResults(query, metadata);
    }
    /**
     * @deprecated use {@link Source.getSearchTags} instead
     */
    async getTags() {
        // @ts-ignore
        return this.getSearchTags?.();
    }
}
exports.Source = Source;
// Many sites use '[x] time ago' - Figured it would be good to handle these cases in general
function convertTime(timeAgo) {
    let time;
    let trimmed = Number((/\d*/.exec(timeAgo) ?? [])[0]);
    trimmed = (trimmed == 0 && timeAgo.includes('a')) ? 1 : trimmed;
    if (timeAgo.includes('minutes')) {
        time = new Date(Date.now() - trimmed * 60000);
    }
    else if (timeAgo.includes('hours')) {
        time = new Date(Date.now() - trimmed * 3600000);
    }
    else if (timeAgo.includes('days')) {
        time = new Date(Date.now() - trimmed * 86400000);
    }
    else if (timeAgo.includes('year') || timeAgo.includes('years')) {
        time = new Date(Date.now() - trimmed * 31556952000);
    }
    else {
        time = new Date(Date.now());
    }
    return time;
}
exports.convertTime = convertTime;
/**
 * When a function requires a POST body, it always should be defined as a JsonObject
 * and then passed through this function to ensure that it's encoded properly.
 * @param obj
 */
function urlEncodeObject(obj) {
    let ret = {};
    for (const entry of Object.entries(obj)) {
        ret[encodeURIComponent(entry[0])] = encodeURIComponent(entry[1]);
    }
    return ret;
}
exports.urlEncodeObject = urlEncodeObject;

},{}],6:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ContentRating = exports.SourceIntents = void 0;
var SourceIntents;
(function (SourceIntents) {
    SourceIntents[SourceIntents["MANGA_CHAPTERS"] = 1] = "MANGA_CHAPTERS";
    SourceIntents[SourceIntents["MANGA_TRACKING"] = 2] = "MANGA_TRACKING";
    SourceIntents[SourceIntents["HOMEPAGE_SECTIONS"] = 4] = "HOMEPAGE_SECTIONS";
    SourceIntents[SourceIntents["COLLECTION_MANAGEMENT"] = 8] = "COLLECTION_MANAGEMENT";
    SourceIntents[SourceIntents["CLOUDFLARE_BYPASS_REQUIRED"] = 16] = "CLOUDFLARE_BYPASS_REQUIRED";
    SourceIntents[SourceIntents["SETTINGS_UI"] = 32] = "SETTINGS_UI";
})(SourceIntents = exports.SourceIntents || (exports.SourceIntents = {}));
/**
 * A content rating to be attributed to each source.
 */
var ContentRating;
(function (ContentRating) {
    ContentRating["EVERYONE"] = "EVERYONE";
    ContentRating["MATURE"] = "MATURE";
    ContentRating["ADULT"] = "ADULT";
})(ContentRating = exports.ContentRating || (exports.ContentRating = {}));

},{}],7:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./Source"), exports);
__exportStar(require("./ByteArray"), exports);
__exportStar(require("./Badge"), exports);
__exportStar(require("./interfaces"), exports);
__exportStar(require("./SourceInfo"), exports);
__exportStar(require("./HomeSectionType"), exports);
__exportStar(require("./PaperbackExtensionBase"), exports);

},{"./Badge":1,"./ByteArray":2,"./HomeSectionType":3,"./PaperbackExtensionBase":4,"./Source":5,"./SourceInfo":6,"./interfaces":15}],8:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],9:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],10:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],11:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],12:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],13:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],14:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],15:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./ChapterProviding"), exports);
__exportStar(require("./CloudflareBypassRequestProviding"), exports);
__exportStar(require("./HomePageSectionsProviding"), exports);
__exportStar(require("./MangaProgressProviding"), exports);
__exportStar(require("./MangaProviding"), exports);
__exportStar(require("./RequestManagerProviding"), exports);
__exportStar(require("./SearchResultsProviding"), exports);

},{"./ChapterProviding":8,"./CloudflareBypassRequestProviding":9,"./HomePageSectionsProviding":10,"./MangaProgressProviding":11,"./MangaProviding":12,"./RequestManagerProviding":13,"./SearchResultsProviding":14}],16:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],17:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],18:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],19:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],20:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],21:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],22:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],23:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],24:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],25:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],26:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],27:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],28:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],29:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],30:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],31:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],32:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],33:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],34:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],35:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],36:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],37:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],38:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],39:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],40:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],41:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],42:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],43:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],44:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],45:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],46:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],47:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],48:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],49:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],50:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],51:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],52:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],53:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],54:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],55:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],56:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],57:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],58:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],59:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });

},{}],60:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./DynamicUI/Exports/DUIBinding"), exports);
__exportStar(require("./DynamicUI/Exports/DUIForm"), exports);
__exportStar(require("./DynamicUI/Exports/DUIFormRow"), exports);
__exportStar(require("./DynamicUI/Exports/DUISection"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUIButton"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUIHeader"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUIInputField"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUILabel"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUILink"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUIMultilineLabel"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUINavigationButton"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUIOAuthButton"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUISecureInputField"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUISelect"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUIStepper"), exports);
__exportStar(require("./DynamicUI/Rows/Exports/DUISwitch"), exports);
__exportStar(require("./Exports/ChapterDetails"), exports);
__exportStar(require("./Exports/Chapter"), exports);
__exportStar(require("./Exports/Cookie"), exports);
__exportStar(require("./Exports/HomeSection"), exports);
__exportStar(require("./Exports/IconText"), exports);
__exportStar(require("./Exports/MangaInfo"), exports);
__exportStar(require("./Exports/MangaProgress"), exports);
__exportStar(require("./Exports/PartialSourceManga"), exports);
__exportStar(require("./Exports/MangaUpdates"), exports);
__exportStar(require("./Exports/PBCanvas"), exports);
__exportStar(require("./Exports/PBImage"), exports);
__exportStar(require("./Exports/PagedResults"), exports);
__exportStar(require("./Exports/RawData"), exports);
__exportStar(require("./Exports/Request"), exports);
__exportStar(require("./Exports/SourceInterceptor"), exports);
__exportStar(require("./Exports/RequestManager"), exports);
__exportStar(require("./Exports/Response"), exports);
__exportStar(require("./Exports/SearchField"), exports);
__exportStar(require("./Exports/SearchRequest"), exports);
__exportStar(require("./Exports/SourceCookieStore"), exports);
__exportStar(require("./Exports/SourceManga"), exports);
__exportStar(require("./Exports/SecureStateManager"), exports);
__exportStar(require("./Exports/SourceStateManager"), exports);
__exportStar(require("./Exports/Tag"), exports);
__exportStar(require("./Exports/TagSection"), exports);
__exportStar(require("./Exports/TrackedMangaChapterReadAction"), exports);
__exportStar(require("./Exports/TrackerActionQueue"), exports);

},{"./DynamicUI/Exports/DUIBinding":17,"./DynamicUI/Exports/DUIForm":18,"./DynamicUI/Exports/DUIFormRow":19,"./DynamicUI/Exports/DUISection":20,"./DynamicUI/Rows/Exports/DUIButton":21,"./DynamicUI/Rows/Exports/DUIHeader":22,"./DynamicUI/Rows/Exports/DUIInputField":23,"./DynamicUI/Rows/Exports/DUILabel":24,"./DynamicUI/Rows/Exports/DUILink":25,"./DynamicUI/Rows/Exports/DUIMultilineLabel":26,"./DynamicUI/Rows/Exports/DUINavigationButton":27,"./DynamicUI/Rows/Exports/DUIOAuthButton":28,"./DynamicUI/Rows/Exports/DUISecureInputField":29,"./DynamicUI/Rows/Exports/DUISelect":30,"./DynamicUI/Rows/Exports/DUIStepper":31,"./DynamicUI/Rows/Exports/DUISwitch":32,"./Exports/Chapter":33,"./Exports/ChapterDetails":34,"./Exports/Cookie":35,"./Exports/HomeSection":36,"./Exports/IconText":37,"./Exports/MangaInfo":38,"./Exports/MangaProgress":39,"./Exports/MangaUpdates":40,"./Exports/PBCanvas":41,"./Exports/PBImage":42,"./Exports/PagedResults":43,"./Exports/PartialSourceManga":44,"./Exports/RawData":45,"./Exports/Request":46,"./Exports/RequestManager":47,"./Exports/Response":48,"./Exports/SearchField":49,"./Exports/SearchRequest":50,"./Exports/SecureStateManager":51,"./Exports/SourceCookieStore":52,"./Exports/SourceInterceptor":53,"./Exports/SourceManga":54,"./Exports/SourceStateManager":55,"./Exports/Tag":56,"./Exports/TagSection":57,"./Exports/TrackedMangaChapterReadAction":58,"./Exports/TrackerActionQueue":59}],61:[function(require,module,exports){
"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./generated/_exports"), exports);
__exportStar(require("./base/index"), exports);
__exportStar(require("./compat/DyamicUI"), exports);

},{"./base/index":7,"./compat/DyamicUI":16,"./generated/_exports":60}],62:[function(require,module,exports){
"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Baozimh = exports.BaozimhInfo = void 0;
const types_1 = require("@paperback/types");
const BASE_URL = 'https://www.baozimh.com';
exports.BaozimhInfo = {
    version: '1.6.0',
    name: 'Baozimh',
    icon: 'icon.png',
    author: 'Steven Lai',
    authorWebsite: 'https://github.com/InsaneGenie',
    description: 'Read Traditional Chinese manga from Baozimh.',
    contentRating: types_1.ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    sourceTags: [],
    intents: types_1.SourceIntents.MANGA_CHAPTERS | types_1.SourceIntents.HOMEPAGE_SECTIONS
};
class Baozimh extends types_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = App.createRequestManager({
            requestsPerSecond: 2,
            requestTimeout: 20000
        });
    }
    async getDocument(url) {
        const request = App.createRequest({
            url,
            method: 'GET',
            headers: {
                referer: BASE_URL + '/',
                'user-agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'
            }
        });
        const response = await this.requestManager.schedule(request, 1);
        return this.cheerio.load(response.data);
    }
    absoluteUrl(value) {
        if (value.startsWith('//'))
            return 'https:' + value;
        if (value.startsWith('http://') || value.startsWith('https://'))
            return value;
        return BASE_URL + (value.startsWith('/') ? value : '/' + value);
    }
    mangaIdFromHref(href) {
        return href.split('/comic/')[1]?.split(/[?#]/)[0] ?? '';
    }
    // Scope cards to one section so neighboring recommendation rows don't mix.
    parseCards($, container) {
        const results = [];
        const seen = new Set();
        container.find('.comics-card').each((_index, element) => {
            const card = $(element);
            const link = card.find('a[href*="/comic/"]').first();
            const mangaId = this.mangaIdFromHref(link.attr('href') ?? '');
            if (!mangaId || mangaId.startsWith('chapter/') || seen.has(mangaId))
                return;
            const title = card.find('.comics-card__title').first().text().trim()
                || link.attr('title')?.trim() || link.attr('aria-label')?.trim();
            const imageElement = card.find('amp-img, img').not('[placeholder], [fallback]').first();
            const image = imageElement.attr('data-src') || imageElement.attr('src') || '';
            if (!title || !image)
                return;
            seen.add(mangaId);
            results.push(App.createPartialSourceManga({
                mangaId,
                title,
                image: this.absoluteUrl(image),
                subtitle: card.find('small.tags').first().text().replace(/\s+/g, ' ').trim() || undefined
            }));
        });
        return results;
    }
    async getHomePageSections(sectionCallback) {
        const $ = await this.getDocument(BASE_URL + '/');
        const seen = new Set();
        $('.index-recommend-items').each((_index, element) => {
            const container = $(element);
            const title = container.find('.catalog-title').first().text().replace(/\s+/g, ' ').trim();
            if (!title || seen.has(title))
                return;
            const items = this.parseCards($, container);
            if (!items.length)
                return;
            seen.add(title);
            sectionCallback(App.createHomeSection({
                // Use the heading rather than its position to keep IDs stable on reorder.
                id: 'home-' + encodeURIComponent(title),
                title,
                type: 'singleRowNormal',
                items: items.slice(0, 12),
                containsMoreItems: ['熱門漫畫', '推薦國漫', '推薦韓漫', '推薦日漫', '熱血漫畫', '最新上架', '最近更新'].includes(title)
            }));
        });
        if (!seen.size)
            throw new Error('Baozimh homepage returned no manga listings. Please try again later.');
    }
    async getViewMoreItems(sectionId, metadata) {
        const section = sectionId.startsWith('home-') ? decodeURIComponent(sectionId.slice(5)) : '';
        const catalogFilters = {
            '熱門漫畫': {},
            '推薦國漫': { region: 'cn' },
            '推薦韓漫': { region: 'kr' },
            '推薦日漫': { region: 'jp' },
            '熱血漫畫': { type: 'rexie' }
        };
        if (Object.prototype.hasOwnProperty.call(catalogFilters, section)) {
            // These are broader matching catalogs, not additional curated recommendations.
            return this.getCatalogPage({ type: 'all', region: 'all', state: 'all', ...catalogFilters[section] }, metadata);
        }
        if (section === '最新上架') {
            const $ = await this.getDocument(BASE_URL + '/list/new');
            const results = this.parseCards($, $.root());
            if (!results.length)
                throw new Error('Baozimh returned no new titles. Please try again later.');
            return App.createPagedResults({ results });
        }
        if (section === '最近更新') {
            const $ = await this.getDocument(BASE_URL + '/');
            const container = $('.index-recommend-items').filter((_index, element) => $(element).find('.catalog-title').first().text().trim() === section).first();
            const results = this.parseCards($, container);
            if (!results.length)
                throw new Error('Baozimh returned no recent updates. Please try again later.');
            return App.createPagedResults({ results });
        }
        throw new Error('Unknown Baozimh Discover section. Refresh Discover and try again.');
    }
    async getMangaDetails(mangaId) {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}`);
        const meta = (property) => $(`meta[name="${property}"], meta[property="${property}"]`).first().attr('content')?.trim() ?? '';
        const title = meta('og:novel:book_name') || meta('og:title').replace(/漫畫.*$/, '').trim() || $('h1').first().text().trim();
        const statusText = meta('og:novel:status');
        const status = /完結|已完|completed/i.test(statusText) ? 'Completed' : /連載|ongoing/i.test(statusText) ? 'Ongoing' : 'Unknown';
        const genres = meta('og:novel:category').split(',').map((value) => value.trim()).filter(Boolean);
        const tags = genres.length === 0 ? [] : [App.createTagSection({
                id: 'genres',
                label: 'Genres',
                tags: genres.map((genre) => App.createTag({ id: genre, label: genre }))
            })];
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
        });
    }
    async getChapters(mangaId) {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}`);
        const chapterGroups = new Map();
        const seen = new Set();
        $('a.comics-chapters__item, a[href*="/user/page_direct?"]').each((_index, element) => {
            const href = $(element).attr('href')?.replace(/&amp;/g, '&') ?? '';
            const slotText = href.match(/[?&]chapter_slot=(\d+)/)?.[1];
            const dedupeKey = slotText ? `slot:${slotText}` : href;
            if (!href || seen.has(dedupeKey))
                return;
            seen.add(dedupeKey);
            const name = $(element).text().replace(/\s+/g, ' ').trim();
            const numberText = name.match(/(?:第\s*)?(\d+(?:\.\d+)?)/)?.[1];
            const chapterNumber = Number.parseFloat(numberText ?? slotText ?? String(chapterGroups.size + 1));
            // Baozimh sometimes publishes one chapter as several adjacent reader
            // URLs (for example, part 1/4 through part 4/4). Keep those parts in
            // one Paperback chapter instead of making the reader stop after part 1.
            const groupName = name
                .replace(/\s*[（(]\s*\d+\s*(?:[/／]|of)\s*\d+\s*[）)]\s*$/i, '')
                .replace(/\s*[-_－]\s*\d+\s*$/, '')
                .trim();
            // Baozimh may label parts differently (for example, “1”, “1-2”,
            // or “第一話（下）”), so the chapter number—not the displayed part
            // text—is the stable grouping key.
            const key = String(Number.isFinite(chapterNumber) ? chapterNumber : chapterGroups.size + 1);
            const group = chapterGroups.get(key);
            if (group)
                group.urls.push(this.absoluteUrl(href));
            else
                chapterGroups.set(key, {
                    urls: [this.absoluteUrl(href)],
                    name: groupName || name,
                    chapNum: Number.isFinite(chapterNumber) ? chapterNumber : chapterGroups.size + 1
                });
        });
        return Array.from(chapterGroups.values()).map((group) => App.createChapter({
            // Keep the chapter ID as one normal URL. Paperback's automatic
            // next-chapter transition can normalize/unwrap encoded array IDs,
            // which leaves it with only part 1. getChapterDetails expands this
            // starting URL into all continuation parts consistently for both
            // manual selection and automatic navigation.
            id: group.urls[0],
            chapNum: group.chapNum,
            langCode: 'zh',
            name: group.name
        }));
    }
    async getChapterDetails(mangaId, chapterId) {
        let urls;
        try {
            const decoded = JSON.parse(decodeURIComponent(chapterId));
            urls = Array.isArray(decoded) && decoded.every((url) => typeof url === 'string') ? decoded : [this.absoluteUrl(chapterId)];
        }
        catch (_error) {
            urls = [this.absoluteUrl(chapterId)];
        }
        const pages = [];
        const seen = new Set();
        const addPages = ($) => {
            let added = 0;
            $('amp-img.comic-contain__item, .comic-contain img').each((_index, element) => {
                const page = $(element).attr('data-src') || $(element).attr('src') || '';
                if (!page || seen.has(page))
                    return;
                seen.add(page);
                pages.push(this.absoluteUrl(page));
                added++;
            });
            return added;
        };
        for (const url of urls) {
            const $ = await this.getDocument(url);
            addPages($);
            // The manga page normally lists only 0_1.html. Baozimh stores the
            // remaining parts at 0_1_2.html, 0_1_3.html, etc., so discover
            // those continuation URLs from the canonical reader URL.
            // Depending on how the reader was opened, Paperback may give us a
            // direct chapter URL, a page-direct redirect URL, or a URL that
            // already includes a continuation suffix. Normalize all of them
            // to the unsuffixed chapter URL before probing the remaining parts.
            const canonical = this.absoluteUrl($('link[rel="canonical"]').attr('href')
                || $('meta[property="og:url"]').attr('content')
                || url);
            const match = canonical.match(/^(https?:\/\/[^/]+\/comic\/chapter\/[^/]+\/\d+_(\d+))(?:_\d+)?\.html(?:[?#].*)?$/);
            if (!match)
                continue;
            const base = match[1];
            // Baozimh/TWManga normally uses only a handful of continuation pages.
            // Keep a conservative upper bound so a missing page cannot create a
            // long series of timed-out requests on mobile devices.
            for (let part = 2; part <= 10; part++) {
                const continuation = `${base}_${part}.html`;
                if (urls.includes(continuation))
                    continue;
                try {
                    const continuationDocument = await this.getDocument(continuation);
                    if (addPages(continuationDocument) === 0)
                        break;
                }
                catch (_error) {
                    // A missing continuation means the chapter has ended.
                    break;
                }
            }
        }
        if (pages.length === 0)
            throw new Error('Baozimh returned no readable page images for this chapter.');
        return App.createChapterDetails({
            id: chapterId,
            mangaId,
            pages
        });
    }
    async getSearchTags() {
        const $ = await this.getDocument(BASE_URL + '/classify');
        return ['type', 'region', 'state'].map((group) => {
            const tags = new Map();
            $('a[href*="/classify?"]').each((_index, element) => {
                const href = $(element).attr('href') ?? '';
                const value = href.match(new RegExp('[?&]' + group + '=([^&]+)'))?.[1];
                const label = $(element).text().trim();
                if (value && value !== 'all' && label && /^[a-z]+$/.test(value))
                    tags.set(value, label);
            });
            if (!tags.size)
                throw new Error('Baozimh returned no search filters. Please try again later.');
            return App.createTagSection({
                id: group,
                label: { type: '題材（選一項）', region: '地區（選一項）', state: '狀態（選一項）' }[group],
                tags: Array.from(tags, ([value, label]) => App.createTag({ id: group + ':' + value, label }))
            });
        });
    }
    async getTags() { return this.getSearchTags(); }
    async supportsTagExclusion() { return false; }
    async supportsSearchOperators() { return false; }
    async searchByTags(query, metadata) {
        if (query.title?.trim())
            throw new Error('使用標籤時請清空搜尋文字。Clear the search text to browse by tags.');
        const values = { type: 'all', region: 'all', state: 'all' };
        for (const tag of query.includedTags ?? []) {
            const match = /^(type|region|state):([a-z]+)$/.exec(tag.id);
            if (!match)
                throw new Error('Please select filters from the Baozimh search filter list.');
            const group = match[1], value = match[2];
            if (values[group] !== 'all' && values[group] !== value)
                throw new Error('每組只能選一項。Select only one genre, one region, and one status.');
            values[group] = value;
        }
        return this.getCatalogPage(values, metadata);
    }
    async getCatalogPage(values, metadata) {
        const key = JSON.stringify(values);
        const page = metadata?.key === key && Number.isInteger(metadata.page) && metadata.page > 0 ? metadata.page : 1;
        const url = BASE_URL + '/api/bzmhq/amp_comic_list?' +
            ['type', 'region', 'state'].map(group => group + '=' + encodeURIComponent(values[group])).join('&') +
            '&filter=*&page=' + page + '&limit=36&language=tw';
        const response = await this.requestManager.schedule(App.createRequest({
            url, method: 'GET', headers: { referer: BASE_URL + '/classify' }
        }), 1);
        const data = typeof response.data === 'string' ? JSON.parse(response.data) : response.data;
        if (!Array.isArray(data?.items))
            throw new Error('Baozimh returned an invalid catalog response. Please try again later.');
        const results = [];
        const seen = new Set();
        for (const item of data.items) {
            if (typeof item.comic_id !== 'string' || !item.name || !item.topic_img || seen.has(item.comic_id))
                continue;
            seen.add(item.comic_id);
            results.push(App.createPartialSourceManga({
                mangaId: item.comic_id, title: item.name,
                image: 'https://static-tw.baozimh.com/cover/' + item.topic_img + '?w=285&h=375&q=100',
                subtitle: item.author || undefined
            }));
        }
        return App.createPagedResults({ results, metadata: data.next && results.length ? { page: page + 1, key } : undefined });
    }
    async getSearchResults(query, metadata) {
        if (query.excludedTags?.length)
            throw new Error('Baozimh does not support excluding tags.');
        if (query.includedTags?.length)
            return this.searchByTags(query, metadata);
        const title = query.title?.trim() ?? '';
        if (!title)
            return App.createPagedResults({ results: [] });
        const $ = await this.getDocument(`${BASE_URL}/search?q=${encodeURIComponent(title)}`);
        const results = [];
        $('.comics-card').each((_index, element) => {
            const card = $(element);
            const link = card.find('a[href^="/comic/"]').first();
            const href = link.attr('href') ?? '';
            const mangaId = this.mangaIdFromHref(href);
            const imageElement = card.find('amp-img').first();
            const image = imageElement.attr('src') || imageElement.attr('data-src') || '';
            const resultTitle = card.find('.comics-card__title h3').first().text().trim() || link.attr('title')?.trim() || mangaId;
            const subtitle = card.find('small.tags').first().text().replace(/\s+/g, ' ').trim();
            if (!mangaId)
                return;
            results.push(App.createPartialSourceManga({
                title: resultTitle,
                image: this.absoluteUrl(image),
                mangaId,
                subtitle: subtitle || undefined
            }));
        });
        return App.createPagedResults({ results });
    }
    getMangaShareUrl(mangaId) {
        return `${BASE_URL}/comic/${mangaId}`;
    }
}
exports.Baozimh = Baozimh;

},{"@paperback/types":61}]},{},[62])(62)
});

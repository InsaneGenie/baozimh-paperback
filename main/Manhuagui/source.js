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
exports.Manhuagui = exports.ManhuaguiInfo = exports.FILTER_GROUPS = void 0;
const types_1 = require("@paperback/types");
const helpers_1 = require("./helpers");
const BASE_URL = 'https://www.manhuagui.com';
// Page images are served from hamreus.com; covers from mhgui.com. Both
// refuse requests that do not carry a Manhuagui Referer.
const IMAGE_SERVER = 'https://i.hamreus.com';
const IMAGE_HOST = /^https?:\/\/[^/]*(?:hamreus\.com|mhgui\.com)(?:[/:?#]|$)/i;
// Discover rows, each a sort order of Manhuagui's full catalog.
const HOME_SECTIONS = [
    { id: 'view', title: '人气最旺', sort: 'view' },
    { id: 'update', title: '最新更新', sort: 'update' },
    { id: 'index', title: '最新上架', sort: 'index' },
    { id: 'rate', title: '评分最高', sort: 'rate' }
];
// Catalog filters, in the order Manhuagui joins them in /list/<a>_<b>_<c>/.
exports.FILTER_GROUPS = [
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
];
exports.ManhuaguiInfo = {
    version: '1.0.0',
    name: 'Manhuagui',
    icon: 'icon.png',
    author: 'Steven Lai',
    authorWebsite: 'https://github.com/InsaneGenie',
    description: 'Read Chinese manga from Manhuagui (看漫画).',
    contentRating: types_1.ContentRating.MATURE,
    websiteBaseURL: BASE_URL,
    sourceTags: [],
    intents: types_1.SourceIntents.MANGA_CHAPTERS
        | types_1.SourceIntents.HOMEPAGE_SECTIONS
        | types_1.SourceIntents.CLOUDFLARE_BYPASS_REQUIRED
};
class Manhuagui extends types_1.Source {
    constructor() {
        super(...arguments);
        this.requestManager = App.createRequestManager({
            // Manhuagui blocks addresses that load pages quickly.
            requestsPerSecond: 1,
            requestTimeout: 30000,
            interceptor: {
                interceptRequest: async (request) => {
                    const headers = { ...(request.headers ?? {}) };
                    const hasHeader = (name) => Object.keys(headers).some((key) => key.toLowerCase() === name);
                    if (!hasHeader('referer'))
                        headers['referer'] = BASE_URL + '/';
                    if (IMAGE_HOST.test(request.url) && !hasHeader('accept')) {
                        headers['accept'] = 'image/avif,image/webp,image/apng,image/*,*/*;q=0.8';
                    }
                    if (!hasHeader('user-agent'))
                        headers['user-agent'] = await this.requestManager.getDefaultUserAgent();
                    // Paperback's Request is a native object; spreading it into
                    // createRequest drops its url, so update it in place.
                    request.headers = headers;
                    return request;
                },
                interceptResponse: async (response) => response
            }
        });
    }
    async getCloudflareBypassRequestAsync() {
        return App.createRequest({
            url: BASE_URL + '/',
            method: 'GET',
            headers: {
                referer: BASE_URL + '/',
                'user-agent': await this.requestManager.getDefaultUserAgent()
            }
        });
    }
    async getDocument(url) {
        const request = App.createRequest({ url, method: 'GET' });
        const response = await this.requestManager.schedule(request, 1);
        const data = typeof response.data === 'string' ? response.data : '';
        if (/\/cdn-cgi\/challenge-platform\/|id=["']challenge-form["']|<title>Just a moment/i.test(data)) {
            throw new Error('看漫画需要瀏覽器驗證。請在來源設定使用 Cloudflare 驗證按鈕，看到網站首頁後返回並重新整理。');
        }
        if (response.status === 403) {
            throw new Error('看漫画拒絕連線（HTTP 403）。網站可能暫時封鎖了此網路，請稍後再試或用內建瀏覽器確認網站能否開啟。');
        }
        if (response.status === 429)
            throw new Error('看漫画暫時限制請求次數（HTTP 429）。請稍候再重新整理。');
        if (response.status >= 400)
            throw new Error(`看漫画網站回應錯誤（HTTP ${response.status}）。請稍後再試。`);
        if (!data.trim())
            throw new Error('看漫画回傳空白內容。請稍後再重新整理。');
        return this.cheerio.load(data);
    }
    absoluteUrl(value) {
        if (value.startsWith('//'))
            return 'https:' + value;
        if (/^https?:\/\//.test(value))
            return value;
        return BASE_URL + (value.startsWith('/') ? value : '/' + value);
    }
    mangaIdFromHref(href) {
        return href.match(/\/comic\/(\d+)/)?.[1] ?? '';
    }
    imageOf(element) {
        const value = element.attr('data-src') || element.attr('src') || '';
        return value && !value.startsWith('data:') ? this.absoluteUrl(value) : '';
    }
    hasNextPage($) {
        return $('a').filter((_index, element) => /^\s*下一[页頁]\s*$/.test($(element).text())).length > 0;
    }
    // Catalog lists such as /list/view_p1.html.
    parseList($) {
        const results = [];
        const seen = new Set();
        $('#contList > li').each((_index, element) => {
            const item = $(element);
            const link = item.find('a.bcover').first();
            const mangaId = this.mangaIdFromHref(link.attr('href') ?? '');
            if (!mangaId || seen.has(mangaId))
                return;
            const title = link.attr('title')?.trim() || item.find('p a').first().text().trim();
            if (!title)
                return;
            seen.add(mangaId);
            results.push(App.createPartialSourceManga({
                mangaId,
                title,
                image: this.imageOf(link.find('img').first()),
                subtitle: item.find('span.tt').first().text().trim() || undefined
            }));
        });
        return results;
    }
    async getListPage(path, sort, page) {
        const $ = await this.getDocument(`${BASE_URL}/list/${path ? path + '/' : ''}${sort}_p${page}.html`);
        const results = this.parseList($);
        return App.createPagedResults({
            results,
            metadata: results.length && this.hasNextPage($) ? { page: page + 1 } : undefined
        });
    }
    async getHomePageSections(sectionCallback) {
        for (const section of HOME_SECTIONS) {
            sectionCallback(App.createHomeSection({
                id: section.id, title: section.title, type: types_1.HomeSectionType.singleRowNormal, containsMoreItems: true
            }));
        }
        for (const section of HOME_SECTIONS) {
            const page = await this.getListPage('', section.sort, 1);
            sectionCallback(App.createHomeSection({
                id: section.id,
                title: section.title,
                type: types_1.HomeSectionType.singleRowNormal,
                items: page.results,
                containsMoreItems: true
            }));
        }
    }
    async getViewMoreItems(sectionId, metadata) {
        const section = HOME_SECTIONS.find((value) => value.id === sectionId);
        if (!section)
            throw new Error('Unknown Manhuagui Discover section. Refresh Discover and try again.');
        return this.getListPage('', section.sort, Number.isInteger(metadata?.page) ? metadata.page : 1);
    }
    async getMangaDetails(mangaId) {
        const $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}/`);
        const title = $('.book-title h1').first().text().trim();
        const altTitle = $('.book-title h2').first().text().trim();
        const field = (label) => $('ul.detail-list li span').filter((_index, element) => label.test($(element).children('strong').first().text() || $(element).text())).first();
        const names = (label) => field(label).find('a').map((_index, element) => $(element).text().trim()).get().filter(Boolean);
        const authors = names(/作者/);
        const genres = names(/剧情|劇情/);
        const statusText = $('li.status').text();
        const status = /完结|完結/.test(statusText) ? 'Completed' : /连载|連載/.test(statusText) ? 'Ongoing' : 'Unknown';
        const desc = $('#intro-all').text().trim() || $('#intro-cut').text().trim()
            || $('meta[name="description"]').attr('content')?.trim() || '';
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
        });
    }
    async getChapters(mangaId) {
        let $ = await this.getDocument(`${BASE_URL}/comic/${mangaId}/`);
        // Adult titles hide the list behind a warning and ship it
        // LZString-compressed in this field instead.
        const hidden = $('#__VIEWSTATE').attr('value');
        if (hidden && !$('[id^="chapter-list-"]').length) {
            const html = (0, helpers_1.decompressFromBase64)(hidden);
            if (html)
                $ = this.cheerio.load(html);
        }
        const links = [];
        const seen = new Set();
        $('[id^="chapter-list-"]').each((_index, list) => {
            const group = $(list).prevAll('h4').first().text().trim() || '单话';
            $(list).find('a[href*="/comic/"]').each((_linkIndex, element) => {
                const id = ($(element).attr('href') ?? '').match(/\/comic\/\d+\/(\d+)\.html/)?.[1];
                if (!id || seen.has(id))
                    return;
                seen.add(id);
                const name = $(element).attr('title')?.trim()
                    || $(element).find('span').first().clone().children().remove().end().text().trim()
                    || $(element).text().trim();
                links.push({ id, name, group });
            });
        });
        if (!links.length && !$('.book-title').length && !$('[id^="chapter-list-"]').length) {
            throw new Error('看漫画回應了，但找不到章節清單。若網站可以正常瀏覽，請回報此錯誤以更新解析器。');
        }
        return (0, helpers_1.numberChapters)(links).map((chapter) => App.createChapter({
            id: chapter.id,
            chapNum: chapter.chapNum,
            volume: chapter.volume,
            name: chapter.name,
            group: chapter.group,
            langCode: 'zh'
        }));
    }
    async getChapterDetails(mangaId, chapterId) {
        const request = App.createRequest({ url: `${BASE_URL}/comic/${mangaId}/${chapterId}.html`, method: 'GET' });
        const response = await this.requestManager.schedule(request, 1);
        if (response.status >= 400)
            throw new Error(`看漫画網站回應錯誤（HTTP ${response.status}）。請稍後再試。`);
        const html = typeof response.data === 'string' ? response.data : '';
        const data = (0, helpers_1.chapterImageData)(html);
        if (!data) {
            if (/\/cdn-cgi\/challenge-platform\/|<title>Just a moment/i.test(html)) {
                throw new Error('看漫画需要瀏覽器驗證。請在來源設定使用 Cloudflare 驗證按鈕，看到網站首頁後返回並重新整理。');
            }
            throw new Error('看漫画的章節頁面無法解析（找不到圖片資料）。若網站上可以閱讀，請回報此錯誤。');
        }
        const pages = (0, helpers_1.chapterImageUrls)(data, IMAGE_SERVER);
        if (!pages.length)
            throw new Error('看漫画沒有提供此章節的圖片。This chapter has no pages on Manhuagui.');
        return App.createChapterDetails({ id: chapterId, mangaId, pages });
    }
    async getSearchTags() {
        return exports.FILTER_GROUPS.map((group) => App.createTagSection({
            id: group.id,
            label: group.label,
            tags: group.tags.map(([value, label]) => App.createTag({ id: `${group.id}:${value}`, label }))
        }));
    }
    async getTags() { return this.getSearchTags(); }
    async supportsTagExclusion() { return false; }
    async supportsSearchOperators() { return false; }
    async getSearchResults(query, metadata) {
        if (query.excludedTags?.length)
            throw new Error('Manhuagui does not support excluding tags.');
        const page = Number.isInteger(metadata?.page) && metadata.page > 0 ? metadata.page : 1;
        const title = query.title?.trim() ?? '';
        if (query.includedTags?.length) {
            if (title)
                throw new Error('使用標籤時請清空搜尋文字。Clear the search text to browse by tags.');
            const chosen = new Map();
            for (const tag of query.includedTags) {
                const [group, value] = tag.id.split(':');
                if (!group || !value || !exports.FILTER_GROUPS.some((g) => g.id === group && g.tags.some(([v]) => v === value))) {
                    throw new Error('Please select filters from the Manhuagui search filter list.');
                }
                if (chosen.has(group) && chosen.get(group) !== value)
                    throw new Error('每組只能選一項。Select only one tag in each group.');
                chosen.set(group, value);
            }
            const path = exports.FILTER_GROUPS.map((group) => chosen.get(group.id)).filter(Boolean).join('_');
            return this.getListPage(path, 'view', page);
        }
        if (!title)
            return App.createPagedResults({ results: [] });
        const $ = await this.getDocument(`${BASE_URL}/s/${encodeURIComponent(title)}_p${page}.html`);
        const results = [];
        const seen = new Set();
        $('.book-result li.cf, .book-result > ul > li').each((_index, element) => {
            const item = $(element);
            const link = item.find('.book-detail dt a').first();
            const mangaId = this.mangaIdFromHref(link.attr('href') ?? item.find('a.bcover').attr('href') ?? '');
            if (!mangaId || seen.has(mangaId))
                return;
            seen.add(mangaId);
            results.push(App.createPartialSourceManga({
                mangaId,
                title: link.attr('title')?.trim() || link.text().trim() || mangaId,
                image: this.imageOf(item.find('.book-cover img').first()),
                subtitle: item.find('.book-detail .tags.status span.red').first().text().trim() || undefined
            }));
        });
        return App.createPagedResults({
            results,
            metadata: results.length && this.hasNextPage($) ? { page: page + 1 } : undefined
        });
    }
    getMangaShareUrl(mangaId) {
        return `${BASE_URL}/comic/${mangaId}/`;
    }
}
exports.Manhuagui = Manhuagui;

},{"./helpers":63,"@paperback/types":61}],63:[function(require,module,exports){
"use strict";
// Pure helpers for the Manhuagui source. They need no app runtime, so the
// tests can load them directly. The Paperback 0.9 build keeps an identical
// copy in paperback-0.9/src/Manhuagui/helpers.ts.
Object.defineProperty(exports, "__esModule", { value: true });
exports.numberChapters = exports.chapterNumberFromName = exports.chapterImageUrls = exports.chapterImageData = exports.unpack = exports.decompressFromBase64 = void 0;
const LZ_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=';
// LZString.decompressFromBase64, as used by Manhuagui to pack chapter image
// lists and the hidden chapter list of some titles.
function decompressFromBase64(input) {
    if (!input)
        return '';
    const reverse = {};
    for (let i = 0; i < LZ_BASE64.length; i++)
        reverse[LZ_BASE64.charAt(i)] = i;
    const value = (index) => reverse[input.charAt(index)] ?? 0;
    const length = input.length;
    const resetValue = 32;
    const dictionary = ['0', '1', '2'];
    let enlargeIn = 4, dictSize = 4, numBits = 3;
    let val = value(0), position = resetValue, index = 1;
    const readBits = (count) => {
        let bits = 0, power = 1;
        const maxPower = 2 ** count;
        while (power !== maxPower) {
            const bit = val & position;
            position >>= 1;
            if (position === 0) {
                position = resetValue;
                val = value(index++);
            }
            bits |= (bit > 0 ? 1 : 0) * power;
            power <<= 1;
        }
        return bits;
    };
    let w;
    switch (readBits(2)) {
        case 0:
            w = String.fromCharCode(readBits(8));
            break;
        case 1:
            w = String.fromCharCode(readBits(16));
            break;
        default: return '';
    }
    dictionary[3] = w;
    const result = [w];
    for (;;) {
        if (index > length)
            return undefined;
        let code = readBits(numBits);
        if (code === 0 || code === 1) {
            dictionary[dictSize++] = String.fromCharCode(readBits(code === 0 ? 8 : 16));
            code = dictSize - 1;
            enlargeIn--;
        }
        else if (code === 2) {
            return result.join('');
        }
        if (enlargeIn === 0) {
            enlargeIn = 2 ** numBits;
            numBits++;
        }
        let entry;
        const known = dictionary[code];
        if (known !== undefined && code < dictSize)
            entry = known;
        else if (code === dictSize)
            entry = w + w.charAt(0);
        else
            return undefined;
        result.push(entry);
        dictionary[dictSize++] = w + entry.charAt(0);
        enlargeIn--;
        w = entry;
        if (enlargeIn === 0) {
            enlargeIn = 2 ** numBits;
            numBits++;
        }
    }
}
exports.decompressFromBase64 = decompressFromBase64;
// Undoes Dean Edwards' `eval(function(p,a,c,k,e,d){…}('…',a,c,'…'.split('|'),0,{}))`
// packer without running any site code.
function unpack(payload, radix, count, words) {
    const encode = (value) => (value < radix ? '' : encode(Math.floor(value / radix)))
        + ((value %= radix) > 35 ? String.fromCharCode(value + 29) : value.toString(36));
    const dictionary = new Map();
    for (let i = count - 1; i >= 0; i--) {
        const key = encode(i);
        dictionary.set(key, words[i] || key);
    }
    return payload.replace(/\b\w+\b/g, (token) => dictionary.get(token) ?? token);
}
exports.unpack = unpack;
function unescapeJsString(value) {
    return value.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_match, escape) => {
        if (escape.length > 1 && (escape[0] === 'u' || escape[0] === 'x'))
            return String.fromCharCode(parseInt(escape.slice(1), 16));
        return { n: '\n', r: '\r', t: '\t' }[escape] ?? escape;
    });
}
// Manhuagui's reader page carries its image list in a packed script whose
// word list is LZString-compressed. Returns the decoded SMH.imgData object.
function chapterImageData(html) {
    const match = html.match(/\}\(\s*'((?:\\.|[^'\\])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\.|[^'\\])*)'\s*(?:\[\s*['"][^'"]+['"]\s*\]|\.split)\(/);
    if (!match)
        return undefined;
    const payload = unescapeJsString(match[1]);
    const packedWords = unescapeJsString(match[4]);
    // Older pages use a plain '|'-separated word list.
    const wordList = packedWords.includes('|') ? packedWords : decompressFromBase64(packedWords);
    if (wordList === undefined)
        return undefined;
    const script = unpack(payload, Number(match[2]), Number(match[3]), wordList.split('|'));
    const json = script.match(/imgData\(\s*(\{[\s\S]*\})\s*\)\s*\.preInit/)?.[1];
    if (!json)
        return undefined;
    let data;
    try {
        data = JSON.parse(json);
    }
    catch {
        return undefined;
    }
    if (!Array.isArray(data?.files) || typeof data.path !== 'string')
        return undefined;
    return data;
}
exports.chapterImageData = chapterImageData;
// Builds the image URLs for a decoded chapter. `sl` holds the signed e/m
// parameters the image host checks.
function chapterImageUrls(data, host) {
    const query = Object.entries(data.sl ?? {})
        .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
        .join('&');
    const encodePath = (value) => {
        let decoded = value;
        try {
            decoded = decodeURI(value);
        }
        catch { /* keep the raw value */ }
        return encodeURI(decoded);
    };
    return data.files
        .filter((file) => typeof file === 'string' && file.length > 0)
        .map((file) => host + encodePath(data.path + file) + (query ? '?' + query : ''));
}
exports.chapterImageUrls = chapterImageUrls;
// Reads the number from labels such as “第131话”, “第一百話”, “第303 標題” or “12 標題”.
// Extras such as “附录” or “特别篇” have none; a digit elsewhere in a title
// (for example “番外2”) must not be mistaken for a chapter number.
function chapterNumberFromName(name) {
    const marked = name.match(/第\s*(\d+(?:\.\d+)?|[零〇一二兩两三四五六七八九十百千]+)\s*(?:[話话回章集卷冊册]|(?![\d.季部零〇一二兩两三四五六七八九十百千]))/)?.[1]
        ?? name.match(/^\s*(?:[Vv]ol\.?\s*)?(\d+(?:\.\d+)?)(?![\d.])/)?.[1];
    if (!marked)
        return undefined;
    if (/^\d/.test(marked)) {
        const value = Number.parseFloat(marked);
        return Number.isFinite(value) ? value : undefined;
    }
    const digits = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 };
    const units = { 十: 10, 百: 100, 千: 1000 };
    let total = 0, digit = 0;
    for (const char of marked) {
        if (char in digits)
            digit = digits[char];
        else {
            total += (digit || 1) * units[char];
            digit = 0;
        }
    }
    return total + digit || undefined;
}
exports.chapterNumberFromName = chapterNumberFromName;
// Numbers chapters inside each section. Unnumbered extras become the
// previous chapter's number plus .1 (as the Baozimh source does), so they
// never collide with a real chapter. Volumes (单行本 / 卷) carry their number
// as the volume too. Chapter ids rise with upload order.
function numberChapters(links) {
    const groups = [];
    for (const link of links)
        if (!groups.includes(link.group))
            groups.push(link.group);
    const result = [];
    for (const group of groups) {
        const inGroup = links.filter((link) => link.group === group)
            .sort((a, b) => Number(a.id) - Number(b.id));
        const isVolumes = /单行本|單行本|卷/.test(group);
        // A section of extras (番外篇) numbers its entries on its own, so
        // “番外06” is 6 there.
        const isExtras = /番外|特别|特別|外传|外傳/.test(group);
        let previous = 0, extras = 0;
        for (const link of inGroup) {
            // An appendix such as “20卷附录” belongs right after volume 20.
            const appendixOf = link.name.match(/^\s*(?:第\s*)?(\d+(?:\.\d+)?)\s*[卷冊册话話回]\s*(?:附[录錄]|特典|番外|彩[页頁]|特[别別]篇)/)?.[1];
            if (appendixOf !== undefined) {
                result.push({ ...link, chapNum: Math.round((Number(appendixOf) + 0.1) * 10) / 10 });
                continue;
            }
            const number = chapterNumberFromName(link.name)
                ?? (isExtras ? (() => {
                    const value = Number.parseFloat(link.name.match(/\d+(?:\.\d+)?/)?.[0] ?? '');
                    return Number.isFinite(value) ? value : undefined;
                })() : undefined);
            let chapNum;
            if (number !== undefined) {
                previous = number;
                extras = 0;
                chapNum = number;
            }
            else {
                extras++;
                chapNum = Math.round((previous + Math.min(extras, 9) / 10) * 10) / 10;
            }
            const isVolume = isVolumes || /第\s*[\d零〇一二兩两三四五六七八九十百千]+\s*[卷冊册]/.test(link.name);
            result.push({
                ...link,
                chapNum,
                volume: isVolume && number !== undefined ? number : undefined
            });
        }
    }
    return result;
}
exports.numberChapters = numberChapters;

},{}]},{},[62])(62)
});

'use strict'
// Minimal stand-in for the Paperback 0.8 runtime so the compiled source can
// run under Node. Requests go through the source's interceptor like in the app.
const cheerio = require('cheerio')
const path = require('node:path')

const DEFAULT_USER_AGENT = 'Mozilla/5.0 (iPad; CPU OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Mobile/15E148 Safari/604.1'

// Paperback's Request is a native object whose fields are not own enumerable
// properties, so `{...request}` loses them. Model that so the tests catch it.
class NativeRequest {
    #url
    constructor(info) {
        if (typeof info.url !== 'string') {
            throw new Error(`Invalid type for key url; expected String got ${typeof info.url}`)
        }
        this.#url = info.url
        this.method = info.method ?? 'GET'
        this.headers = info.headers ?? {}
        this.data = info.data
    }
    get url() { return this.#url }
}

// `transport(request)` returns {status, headers, data}. Defaults to real HTTP.
let transport = async (request) => {
    const response = await fetch(request.url, {
        method: request.method,
        headers: request.headers,
        body: request.data,
        redirect: 'follow',
        signal: AbortSignal.timeout(30000)
    })
    const type = response.headers.get('content-type') ?? ''
    const data = /^(text|application\/(json|xml|xhtml))/i.test(type)
        ? await response.text()
        : Buffer.from(await response.arrayBuffer())
    return { status: response.status, headers: Object.fromEntries(response.headers), data, url: response.url }
}

const log = []

function createRequestManager(info) {
    const interceptor = info.interceptor
    const manager = {
        async getDefaultUserAgent() { return DEFAULT_USER_AGENT },
        // Runs a request through the interceptor the way the app does,
        // including for reader page images.
        async send(request) {
            if (interceptor) request = await interceptor.interceptRequest(request)
            if (!(request instanceof NativeRequest)) throw new Error('interceptRequest must return the Request object')
            const started = Date.now()
            let response = await transport(request)
            log.push({ url: request.url, headers: { ...request.headers }, status: response.status, ms: Date.now() - started })
            response = { ...response, request }
            if (interceptor) response = await interceptor.interceptResponse(response)
            return response
        },
        async schedule(request, _retries) { return manager.send(request) }
    }
    return manager
}

const identity = (value) => value
global.App = {
    createRequest: (info) => new NativeRequest(info),
    createRequestManager,
    createPartialSourceManga: identity,
    createHomeSection: identity,
    createPagedResults: identity,
    createTagSection: identity,
    createTag: identity,
    createSourceManga: identity,
    createMangaInfo: identity,
    createChapter: identity,
    createChapterDetails: identity
}

function loadSource() {
    const compiled = path.join(__dirname, '..', 'tmp', 'build', 'Baozimh', 'Baozimh.js')
    const { Baozimh } = require(compiled)
    return new Baozimh(cheerio)
}

module.exports = {
    loadSource,
    NativeRequest,
    requestLog: log,
    setTransport(fn) { transport = fn },
    DEFAULT_USER_AGENT
}

// Pure helpers kept apart from main.ts so tests can load them without the app runtime.

const BASE_URL = 'https://www.baozimh.com'

// Baozimh answers with a JSON body such as {"error":"challenge_required",
// "challenge_url":"/__gatekeeper_challenge/..."} or with its HTML
// verification page while the visitor has not passed its browser check.
// Returns the page Paperback should open so the user can pass it.
export function verificationUrl(text: string, requestUrl: string): string | undefined {
    const origin = requestUrl.match(/^https?:\/\/[^/?#]+/)?.[0] ?? BASE_URL
    const trimmed = text.trimStart()
    if (trimmed.startsWith('{')) {
        let body: any
        try { body = JSON.parse(trimmed) }
        catch { return undefined }
        if (body?.error !== 'challenge_required') return undefined
        const path = body.challenge_url
        const relative = typeof path === 'string' && path.startsWith(origin + '/') ? path.slice(origin.length) : path
        const safe = typeof relative === 'string'
            && relative.startsWith('/__gatekeeper_challenge/')
            && !/[\\\s]/.test(relative)
        return safe ? origin + relative : origin + '/'
    }
    if (/\/__gatekeeper_challenge\/assets\/|\/cdn-cgi\/challenge-platform\/|id=["']challenge-form["']/i.test(text)) {
        return origin + '/'
    }
    return undefined
}

// Reads the number from labels such as “第131話”, “第一百話”, “第303 標題” or “12 標題”.
// Extras such as “公告” or “元旦快樂！” have none; a digit elsewhere in a
// title (for example “番外2”) must not be mistaken for a chapter number.
export function chapterNumberFromName(name: string): number | undefined {
    // The suffix is sometimes left out (“第303 新帝登基”), but 第3季 or
    // 第2部 name a season, not a chapter.
    const marked = name.match(/第\s*(\d+(?:\.\d+)?|[零〇一二兩三四五六七八九十百千]+)\s*(?:[話话回章集]|(?![\d.季部卷零〇一二兩三四五六七八九十百千]))/)?.[1]
        ?? name.match(/^\s*(\d+(?:\.\d+)?)(?![\d.])/)?.[1]
    if (!marked) return undefined
    if (/^\d/.test(marked)) {
        const value = Number.parseFloat(marked)
        return Number.isFinite(value) ? value : undefined
    }
    const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
    const units: Record<string, number> = { 十: 10, 百: 100, 千: 1000 }
    let total = 0, digit = 0
    for (const char of marked) {
        if (char in digits) digit = digits[char]!
        else {
            total += (digit || 1) * units[char]!
            digit = 0
        }
    }
    return total + digit || undefined
}

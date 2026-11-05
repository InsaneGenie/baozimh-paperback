// Pure helpers for the Manhuagui source. They need no app runtime, so the
// tests can load them directly. This is a copy of src/Manhuagui/helpers.ts
// (the Paperback 0.8 build); keep the two identical.

const LZ_BASE64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/='

// LZString.decompressFromBase64, as used by Manhuagui to pack chapter image
// lists and the hidden chapter list of some titles.
export function decompressFromBase64(input: string): string | undefined {
    if (!input) return ''
    const reverse: Record<string, number> = {}
    for (let i = 0; i < LZ_BASE64.length; i++) reverse[LZ_BASE64.charAt(i)] = i
    const value = (index: number): number => reverse[input.charAt(index)] ?? 0
    const length = input.length
    const resetValue = 32

    const dictionary: string[] = ['0', '1', '2']
    let enlargeIn = 4, dictSize = 4, numBits = 3
    let val = value(0), position = resetValue, index = 1
    const readBits = (count: number): number => {
        let bits = 0, power = 1
        const maxPower = 2 ** count
        while (power !== maxPower) {
            const bit = val & position
            position >>= 1
            if (position === 0) {
                position = resetValue
                val = value(index++)
            }
            bits |= (bit > 0 ? 1 : 0) * power
            power <<= 1
        }
        return bits
    }

    let w: string
    switch (readBits(2)) {
        case 0: w = String.fromCharCode(readBits(8)); break
        case 1: w = String.fromCharCode(readBits(16)); break
        default: return ''
    }
    dictionary[3] = w
    const result: string[] = [w]
    for (;;) {
        if (index > length) return undefined
        let code = readBits(numBits)
        if (code === 0 || code === 1) {
            dictionary[dictSize++] = String.fromCharCode(readBits(code === 0 ? 8 : 16))
            code = dictSize - 1
            enlargeIn--
        }
        else if (code === 2) {
            return result.join('')
        }
        if (enlargeIn === 0) {
            enlargeIn = 2 ** numBits
            numBits++
        }
        let entry: string
        const known = dictionary[code]
        if (known !== undefined && code < dictSize) entry = known
        else if (code === dictSize) entry = w + w.charAt(0)
        else return undefined
        result.push(entry)
        dictionary[dictSize++] = w + entry.charAt(0)
        enlargeIn--
        w = entry
        if (enlargeIn === 0) {
            enlargeIn = 2 ** numBits
            numBits++
        }
    }
}

// Undoes Dean Edwards' `eval(function(p,a,c,k,e,d){…}('…',a,c,'…'.split('|'),0,{}))`
// packer without running any site code.
export function unpack(payload: string, radix: number, count: number, words: string[]): string {
    const encode = (value: number): string =>
        (value < radix ? '' : encode(Math.floor(value / radix)))
        + ((value %= radix) > 35 ? String.fromCharCode(value + 29) : value.toString(36))
    const dictionary = new Map<string, string>()
    for (let i = count - 1; i >= 0; i--) {
        const key = encode(i)
        dictionary.set(key, words[i] || key)
    }
    return payload.replace(/\b\w+\b/g, (token) => dictionary.get(token) ?? token)
}

function unescapeJsString(value: string): string {
    return value.replace(/\\(u[0-9a-fA-F]{4}|x[0-9a-fA-F]{2}|.)/g, (_match, escape: string) => {
        if (escape.length > 1 && (escape[0] === 'u' || escape[0] === 'x')) return String.fromCharCode(parseInt(escape.slice(1), 16))
        return ({ n: '\n', r: '\r', t: '\t' } as Record<string, string>)[escape] ?? escape
    })
}

export interface ChapterImageData {
    bid?: number
    bname?: string
    cid?: number
    cname?: string
    files: string[]
    path: string
    sl?: Record<string, string | number>
}

// Manhuagui's reader page carries its image list in a packed script whose
// word list is LZString-compressed. Returns the decoded SMH.imgData object.
export function chapterImageData(html: string): ChapterImageData | undefined {
    const match = html.match(/\}\(\s*'((?:\\.|[^'\\])*)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'((?:\\.|[^'\\])*)'\s*(?:\[\s*['"][^'"]+['"]\s*\]|\.split)\(/)
    if (!match) return undefined
    const payload = unescapeJsString(match[1]!)
    const packedWords = unescapeJsString(match[4]!)
    // Older pages use a plain '|'-separated word list.
    const wordList = packedWords.includes('|') ? packedWords : decompressFromBase64(packedWords)
    if (wordList === undefined) return undefined
    const script = unpack(payload, Number(match[2]), Number(match[3]), wordList.split('|'))
    const json = script.match(/imgData\(\s*(\{[\s\S]*\})\s*\)\s*\.preInit/)?.[1]
    if (!json) return undefined
    let data: any
    try { data = JSON.parse(json) }
    catch { return undefined }
    if (!Array.isArray(data?.files) || typeof data.path !== 'string') return undefined
    return data
}

// Builds the image URLs for a decoded chapter. `sl` holds the signed e/m
// parameters the image host checks.
export function chapterImageUrls(data: ChapterImageData, host: string): string[] {
    const query = Object.entries(data.sl ?? {})
        .map(([key, value]) => encodeURIComponent(key) + '=' + encodeURIComponent(String(value)))
        .join('&')
    const encodePath = (value: string): string => {
        let decoded = value
        try { decoded = decodeURI(value) }
        catch { /* keep the raw value */ }
        return encodeURI(decoded)
    }
    return data.files
        .filter((file): file is string => typeof file === 'string' && file.length > 0)
        .map((file) => host + encodePath(data.path + file) + (query ? '?' + query : ''))
}

// Reads the number from labels such as “第131话”, “第一百話”, “第303 標題” or “12 標題”.
// Extras such as “附录” or “特别篇” have none; a digit elsewhere in a title
// (for example “番外2”) must not be mistaken for a chapter number.
export function chapterNumberFromName(name: string): number | undefined {
    const marked = name.match(/第\s*(\d+(?:\.\d+)?|[零〇一二兩两三四五六七八九十百千]+)\s*(?:[話话回章集卷冊册]|(?![\d.季部零〇一二兩两三四五六七八九十百千]))/)?.[1]
        ?? name.match(/^\s*(?:[Vv]ol\.?\s*)?(\d+(?:\.\d+)?)(?![\d.])/)?.[1]
    if (!marked) return undefined
    if (/^\d/.test(marked)) {
        const value = Number.parseFloat(marked)
        return Number.isFinite(value) ? value : undefined
    }
    const digits: Record<string, number> = { 零: 0, 〇: 0, 一: 1, 二: 2, 兩: 2, 两: 2, 三: 3, 四: 4, 五: 5, 六: 6, 七: 7, 八: 8, 九: 9 }
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

export interface ChapterLink {
    // Manhuagui's chapter id, from /comic/<book>/<chapter>.html.
    id: string
    name: string
    // Section heading, such as 单话, 单行本 or 番外篇.
    group: string
}

export interface NumberedChapter extends ChapterLink {
    chapNum: number
    volume?: number
}

// Numbers chapters inside each section. Unnumbered extras become the
// previous chapter's number plus .1 (as the Baozimh source does), so they
// never collide with a real chapter. Volumes (单行本 / 卷) carry their number
// as the volume too. Chapter ids rise with upload order.
export function numberChapters(links: ChapterLink[]): NumberedChapter[] {
    const groups: string[] = []
    for (const link of links) if (!groups.includes(link.group)) groups.push(link.group)
    const result: NumberedChapter[] = []
    for (const group of groups) {
        const inGroup = links.filter((link) => link.group === group)
            .sort((a, b) => Number(a.id) - Number(b.id))
        const isVolumes = /单行本|單行本|卷/.test(group)
        // A section of extras (番外篇) numbers its entries on its own, so
        // “番外06” is 6 there.
        const isExtras = /番外|特别|特別|外传|外傳/.test(group)
        let previous = 0, extras = 0
        for (const link of inGroup) {
            // An appendix such as “20卷附录” belongs right after volume 20.
            const appendixOf = link.name.match(/^\s*(?:第\s*)?(\d+(?:\.\d+)?)\s*[卷冊册话話回]\s*(?:附[录錄]|特典|番外|彩[页頁]|特[别別]篇)/)?.[1]
            if (appendixOf !== undefined) {
                result.push({ ...link, chapNum: Math.round((Number(appendixOf) + 0.1) * 10) / 10 })
                continue
            }
            const number = chapterNumberFromName(link.name)
                ?? (isExtras ? (() => {
                    const value = Number.parseFloat(link.name.match(/\d+(?:\.\d+)?/)?.[0] ?? '')
                    return Number.isFinite(value) ? value : undefined
                })() : undefined)
            let chapNum: number
            if (number !== undefined) {
                previous = number
                extras = 0
                chapNum = number
            }
            else {
                extras++
                chapNum = Math.round((previous + Math.min(extras, 9) / 10) * 10) / 10
            }
            const isVolume = isVolumes || /第\s*[\d零〇一二兩两三四五六七八九十百千]+\s*[卷冊册]/.test(link.name)
            result.push({
                ...link,
                chapNum,
                volume: isVolume && number !== undefined ? number : undefined
            })
        }
    }
    return result
}

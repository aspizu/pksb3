// [UTF-8 bytes in JSON, inclusive start, exclusive end].
const CHARACTER_RANGES = [
    // Space and "!"; exclude double quote, which Scratch rewrites.
    [1, 0x20, 0x22],
    // "#", "$", "%"; exclude "&" and "'", which Scratch rewrites.
    [1, 0x23, 0x26],
    // "(" through ";", including digits; exclude rewritten "<".
    [1, 0x28, 0x3c],
    // "="; exclude ">", which Scratch rewrites.
    [1, 0x3d, 0x3e],
    // "?" through "[", including A-Z; handle backslash separately.
    [1, 0x3f, 0x5c],
    // "]" through DEL, including a-z; all serialize as one byte.
    [1, 0x5d, 0x80],
    // Backslash costs two bytes because JSON escapes it.
    [2, 0x5c, 0x5d],
    // Backspace, tab and line feed: JSON uses two-byte short escapes.
    [2, 0x08, 0x0b],
    // Form feed and carriage return: JSON uses two-byte short escapes.
    [2, 0x0c, 0x0e],
    // U+0080-U+07FF: two-byte UTF-8 characters.
    [2, 0x80, 0x800],
    // U+0800-U+D7FF: three-byte UTF-8; handle lone surrogates separately.
    [3, 0x800, 0xd800],
    // U+E000-U+FFFF: three-byte UTF-8, including XML-invalid noncharacters.
    [3, 0xe000, 0x10000],
    // U+10000-U+10FFFF: four-byte UTF-8, including astral characters.
    [4, 0x10000, 0x110000],
    // U+0000-U+0007: controls requiring six-byte JSON Unicode escapes.
    [6, 0x00, 0x08],
    // Vertical tab: JSON has no short escape, so it requires six bytes.
    [6, 0x0b, 0x0c],
    // U+000E-U+001F: the remaining six-byte JSON control escapes.
    [6, 0x0e, 0x20],
    // Lone surrogates use six-byte JSON escapes; pairs use the four-byte range.
    [6, 0xd800, 0xe000],
] as const

export class IdentifierGenerator {
    private _size = 1
    private _identifiers = this._generate(this._size)

    generate(): string {
        for (;;) {
            const next = this._identifiers.next()
            if (next.done) {
                this._identifiers = this._generate(++this._size)
                continue
            }
            const id = next.value
            const index = Number(id)
            if (
                Number.isInteger(index) &&
                index >= 0 &&
                index < 0xffffffff &&
                String(index) === id
            )
                continue
            return id
        }
    }

    private *_generate(size: number): Generator<string, void> {
        if (size === 0) {
            yield ""
            return
        }
        for (const [bytes, start, end] of CHARACTER_RANGES) {
            if (bytes > size) continue
            for (let codePoint = start; codePoint < end; codePoint++) {
                const character = String.fromCodePoint(codePoint)
                for (const suffix of this._generate(size - bytes)) {
                    const first = suffix.charCodeAt(0)
                    if (
                        codePoint >= 0xd800 &&
                        codePoint < 0xdc00 &&
                        first >= 0xdc00 &&
                        first < 0xe000
                    )
                        continue
                    yield character + suffix
                }
            }
        }
    }
}

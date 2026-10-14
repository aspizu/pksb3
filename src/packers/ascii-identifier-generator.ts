import {IdentifierGenerator} from "./identifier-generator.ts"

const SOUP =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ!#%()*+,-./:;=?@[]^_`{|}~"

export class AsciiIdentifierGenerator extends IdentifierGenerator {
    private _index = 0

    override generate(): string {
        let i = this._index++
        let str = ""
        while (i >= 0) {
            str = SOUP[i % SOUP.length] + str
            i = Math.floor(i / SOUP.length) - 1
        }
        return str
    }
}

import type {Sb3Block, Sb3Input, Sb3TopLevelPrimitive} from "../sb3.ts"
import {Packer} from "./packer.ts"

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

class IdentifierGenerator {
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

export class IdentifiersPacker extends Packer {
    override pack(): void {
        const references = new Map<string, number>()
        const skippedIds = this._collectSkippedIds()
        this._mapIdentifiers((id) => {
            references.set(id, (references.get(id) ?? 0) + 1)
            return id
        })
        const generator = new IdentifierGenerator()
        const identifiers = new Map<string, string>()
        for (const [id] of [...references].sort((a, b) => b[1] - a[1])) {
            let newId = generator.generate()
            while (skippedIds.has(newId)) {
                newId = generator.generate()
            }
            identifiers.set(id, newId)
        }
        this._mapIdentifiers((id) => identifiers.get(id) ?? id)
    }

    private _collectSkippedIds(): Set<string> {
        const skippedIds = new Set(["of"])
        for (const target of this._project.targets) {
            for (const id of Object.keys(target.broadcasts ?? {})) {
                skippedIds.add(id)
            }
        }
        for (const monitor of this._project.monitors ?? []) {
            if (
                monitor.opcode !== "data_variable" &&
                monitor.opcode !== "data_listcontents"
            ) {
                skippedIds.add(monitor.id)
            }
        }
        return skippedIds
    }

    private _mapIdentifiers(map: (id: string) => string): void {
        const cloudNames = new Map(
            this._project.targets.flatMap((target) =>
                Object.entries(target.variables ?? {})
                    .filter(([, variable]) => variable[2] === true)
                    .map(([id, variable]) => [id, variable[0]] as const),
            ),
        )
        function _mapName(id: string, newId: string): string {
            return cloudNames.get(id) ?? newId
        }
        for (const target of this._project.targets) {
            for (const key of ["variables", "lists"] as const) {
                if (target[key] === undefined) continue
                target[key] = Object.fromEntries(
                    Object.entries(target[key]).map(([id, value]) => {
                        const newId = map(id)
                        value[0] = _mapName(id, newId)
                        return [newId, value]
                    }),
                )
            }
            target.blocks = Object.fromEntries(
                Object.entries(target.blocks).map(([id, block]) => {
                    const newId = map(id)
                    this._mapBlockIdentifiers(block, map, _mapName)
                    return [newId, block]
                }),
            )
        }
        this._mapMonitorIdentifiers(map, _mapName)
    }

    private _mapMonitorIdentifiers(
        map: (id: string) => string,
        mapName: (id: string, newId: string) => string,
    ): void {
        for (const monitor of this._project.monitors ?? []) {
            let name: string
            if (monitor.opcode === "data_variable") {
                name = "VARIABLE"
            } else if (monitor.opcode === "data_listcontents") {
                name = "LIST"
            } else continue
            const id = monitor.id
            monitor.id = map(id)
            monitor.params[name] = mapName(id, monitor.id)
        }
    }

    private _mapBlockIdentifiers(
        block: Sb3Block | Sb3TopLevelPrimitive,
        map: (id: string) => string,
        mapName: (id: string, newId: string) => string,
    ): void {
        if (Array.isArray(block)) {
            const id = block[2]
            block[2] = map(id)
            block[1] = mapName(id, block[2])
            return
        }
        for (const key of ["parent", "next"] as const) {
            const id = block[key]
            if (typeof id === "string") {
                block[key] = map(id)
            }
        }
        for (const name of ["VARIABLE", "LIST"]) {
            const field = block.fields?.[name]
            if (field?.[1] === undefined) continue
            const id = field[1]
            field[1] = map(id)
            field[0] = mapName(id, field[1])
        }
        for (const input of Object.values(block.inputs ?? {})) {
            this._mapInputIdentifiers(input, map, mapName)
        }
    }

    private _mapInputIdentifiers(
        input: Sb3Input,
        map: (id: string) => string,
        mapName: (id: string, newId: string) => string,
    ): void {
        for (const [index, value] of input.entries()) {
            if (typeof value === "string") {
                input[index] = map(value)
            } else if (Array.isArray(value) && (value[0] === 12 || value[0] === 13)) {
                const id = value[2]
                value[2] = map(id)
                value[1] = mapName(id, value[2])
            }
        }
    }
}

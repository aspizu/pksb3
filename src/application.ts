import {readFile, writeFile} from "node:fs/promises"
import {createRequire} from "node:module"
import {parseArgs} from "node:util"

import JSZip from "jszip"
import pc from "picocolors"

import {packers} from "./packers/index.ts"
import {sb3Validator} from "./sb3-validator.ts"
import type {Sb3Project} from "./sb3.ts"

const {default: diffSequences} = createRequire(import.meta.url)(
    "@jest/diff-sequences",
) as typeof import("@jest/diff-sequences")

const usage = `usage: pksb3 [--diff] path/to/input.sb3 [path/to/output.sb3]

output is optional, default to <input_file_name>.pk.sb3
--diff prints the project.json diff`

export class Application {
    async run(): Promise<void> {
        const [input, target, diff] = this._parseArgs()
        const inputBuffer = await readFile(input)
        const zip = await JSZip.loadAsync(inputBuffer)
        const projectJson = zip.file("project.json")
        if (projectJson === null) {
            console.error(`project.json not found in ${input}`)
            process.exit(1)
        }
        const project = JSON.parse(await projectJson.async("string"))
        this._packProject(project, diff)

        const json = JSON.stringify(project)
        const errors = sb3Validator.validate(project, json)
        if (errors !== null) {
            console.error(errors)
            process.exit(1)
        }

        const out = new JSZip()
        out.file("project.json", json)
        for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir || path === "project.json") continue
            out.file(path, await entry.async("nodebuffer"))
        }
        const inputBytes = inputBuffer.byteLength
        const outputBytes = await out.generateAsync({
            type: "nodebuffer",
            compression: "DEFLATE",
            compressionOptions: {level: 9},
        })
        await writeFile(target, outputBytes)
        const ratio = (outputBytes.byteLength / inputBytes) * 100
        console.log(
            `${inputBytes} bytes -> ${outputBytes.byteLength} bytes (${ratio.toFixed(2)}%)`,
        )
        const size = outputBytes.byteLength
        const budgets: [budget: number, label: string][] = [
            [4096, "4k"],
            [8192, "8k"],
            [16384, "16k"],
            [32768, "32k"],
            [65536, "64k"],
        ]
        const next = budgets.find(([budget]) => size <= budget)
        const prev = budgets.findLast(([budget]) => size > budget)
        if (next !== undefined) {
            const remaining = next[0] - size
            console.log(
                `(${next[1]}) ${remaining} bytes (${((remaining / next[0]) * 100).toFixed(2)}%) remaining`,
            )
        }
        if (prev !== undefined) {
            const over = size - prev[0]
            console.log(
                `(${prev[1]}) ${over} bytes (${((over / prev[0]) * 100).toFixed(2)}%) over`,
            )
        }
    }

    private _packProject(project: Sb3Project, diff: boolean): void {
        let before = ""
        if (diff) {
            before = JSON.stringify(project, null, 2)
        }
        for (const Packer of packers) {
            new Packer(project).pack()
        }
        if (diff) {
            this._printDiff(before, JSON.stringify(project, null, 2))
        }
    }

    private _printDiff(before: string, after: string): void {
        const oldLines = before.split("\n")
        const newLines = after.split("\n")
        const lineIds = new Map<string, number>()
        const oldIds = oldLines.map(_getLineId)
        const newIds = newLines.map(_getLineId)
        const output: string[] = []
        let oldIndex = 0
        let newIndex = 0
        function _getLineId(line: string): number {
            let id = lineIds.get(line)
            if (id === undefined) {
                id = lineIds.size
                lineIds.set(line, id)
            }
            return id
        }
        function _append(
            lines: string[],
            start: number,
            end: number,
            prefix: string,
            color: (text: string) => string,
        ): void {
            for (let index = start; index < end; index++) {
                output.push(color(prefix + lines[index] + "\n"))
            }
        }
        function _foundSubsequence(
            count: number,
            oldStart: number,
            newStart: number,
        ): void {
            _append(oldLines, oldIndex, oldStart, "-", pc.red)
            _append(newLines, newIndex, newStart, "+", pc.green)
            oldIndex = oldStart + count
            newIndex = newStart + count
            _append(newLines, newStart, newIndex, " ", pc.dim)
        }
        diffSequences(
            oldLines.length,
            newLines.length,
            (oldIndex, newIndex) => oldIds[oldIndex] === newIds[newIndex],
            _foundSubsequence,
        )
        _foundSubsequence(0, oldLines.length, newLines.length)
        process.stdout.write(output.join(""))
    }

    private _parseArgs(): [input: string, output: string, diff: boolean] {
        const {positionals, values} = parseArgs({
            args: process.argv.slice(2),
            allowPositionals: true,
            options: {diff: {type: "boolean"}},
        })
        const [input, output] = positionals
        if (input === undefined || positionals.length > 2) {
            console.error(usage)
            process.exit(1)
        }
        return [
            input,
            output ?? input.replace(/\.sb3$/, "") + ".pk.sb3",
            values.diff === true,
        ]
    }
}

export const application = new Application()

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

const budgets = new Map<string, number>(
    [2, 4, 8, 16, 32, 64].map((size) => [`${size}kb`, size * 1024]),
)
const budgetOptions = [...budgets.keys()].join(", ")
const byteFormatter = new Intl.NumberFormat("en-US")

const usage = `usage: pksb3 [--diff] [--compression-level 0-9] [--budget 4kb] path/to/input.sb3 [path/to/output.sb3]

output is optional, default to <input_file_name>.pk.sb3
--diff prints the project.json diff
--compression-level sets ZIP compression from 0 (none) to 9 (maximum, default)
--budget compares the output with ${budgetOptions} (1kb = 1024 bytes)`

export class Application {
    async run(): Promise<void> {
        const {input, output, showDiff, compressionLevel, budget} = this._parseArgs()
        const inputBuffer = await readFile(input)
        const zip = await JSZip.loadAsync(inputBuffer)
        const projectJson = zip.file("project.json")
        if (projectJson === null) {
            console.error(`project.json not found in ${input}`)
            process.exit(1)
        }
        const project = JSON.parse(await projectJson.async("string"))
        this._packProject(project, showDiff)

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
        let compression: "STORE" | "DEFLATE" = "DEFLATE"
        if (compressionLevel === 0) {
            compression = "STORE"
        }
        const outputBuffer = await out.generateAsync({
            type: "nodebuffer",
            compression,
            compressionOptions: {level: compressionLevel},
        })
        await writeFile(output, outputBuffer)
        this._printSummary(inputBuffer.byteLength, outputBuffer.byteLength, budget)
    }

    private _printSummary(
        inputBytes: number,
        outputBytes: number,
        budget: number | undefined,
    ): void {
        const saved = ((inputBytes - outputBytes) / inputBytes) * 100
        let savedColor = pc.green
        if (outputBytes > inputBytes) {
            savedColor = pc.red
        }
        const input = byteFormatter.format(inputBytes)
        const output = byteFormatter.format(outputBytes)
        console.log(`${input}B -> ${output}B (${savedColor(`${saved.toFixed(2)}%`)})`)
        if (budget === undefined) return
        const label = `${budget / 1024}kB`
        const remaining = budget - outputBytes
        if (remaining === 0) {
            console.log(pc.green(`=${label} Perfect!`))
        } else if (remaining > 0) {
            console.log(
                pc.green(`<${label} (${byteFormatter.format(remaining)}B left)`),
            )
        } else {
            console.log(pc.red(`>${label} (${byteFormatter.format(-remaining)}B over)`))
        }
    }

    private _packProject(project: Sb3Project, showDiff: boolean): void {
        let before = ""
        if (showDiff) {
            before = JSON.stringify(project, null, 2)
        }
        for (const Packer of packers) {
            new Packer(project).pack()
        }
        if (showDiff) {
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
        function _appendLines(
            lines: string[],
            prefix: string,
            color: (text: string) => string,
        ): void {
            for (const line of lines) {
                output.push(color(prefix + line + "\n"))
            }
        }
        diffSequences(
            oldLines.length,
            newLines.length,
            (oldIndex, newIndex) => oldIds[oldIndex] === newIds[newIndex],
            (count, oldStart, newStart) => {
                _appendLines(oldLines.slice(oldIndex, oldStart), "-", pc.red)
                _appendLines(newLines.slice(newIndex, newStart), "+", pc.green)
                _appendLines(newLines.slice(newStart, newStart + count), " ", pc.dim)
                oldIndex = oldStart + count
                newIndex = newStart + count
            },
        )
        _appendLines(oldLines.slice(oldIndex), "-", pc.red)
        _appendLines(newLines.slice(newIndex), "+", pc.green)
        process.stdout.write(output.join(""))
    }

    private _parseArgs(): {
        input: string
        output: string
        showDiff: boolean
        compressionLevel: number
        budget: number | undefined
    } {
        const {positionals, values} = parseArgs({
            args: process.argv.slice(2),
            allowPositionals: true,
            options: {
                diff: {type: "boolean"},
                "compression-level": {type: "string"},
                budget: {type: "string"},
            },
        })
        const [input, output] = positionals
        if (input === undefined || positionals.length > 2) {
            console.error(usage)
            process.exit(1)
        }
        const compressionLevel = values["compression-level"] ?? "9"
        if (!/^[0-9]$/.test(compressionLevel)) {
            console.error("--compression-level must be an integer from 0 to 9")
            process.exit(1)
        }
        let budget: number | undefined
        if (values.budget !== undefined) {
            budget = budgets.get(values.budget.toLowerCase())
            if (budget === undefined) {
                console.error(`--budget must be one of: ${budgetOptions}`)
                process.exit(1)
            }
        }
        return {
            input,
            output: output ?? input.replace(/\.sb3$/, "") + ".pk.sb3",
            showDiff: values.diff === true,
            compressionLevel: Number(compressionLevel),
            budget,
        }
    }
}

export const application = new Application()

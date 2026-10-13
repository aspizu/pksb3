import {readFile, writeFile} from "node:fs/promises"
import {parseArgs} from "node:util"

import {diffLines} from "diff"
import JSZip from "jszip"
import pc from "picocolors"

import {packers} from "./packers/index.ts"
import {sb3Validator} from "./sb3-validator.ts"

const usage = `usage: pksb3 path/to/input.sb3 [path/to/output.sb3]

output is optional, default to <input_file_name>.pk.sb3`

export class Application {
    async run(): Promise<void> {
        const [input, target] = this._parseArgs()
        const zip = await JSZip.loadAsync(await readFile(input))
        const projectJson = zip.file("project.json")
        if (projectJson === null) {
            console.error(`project.json not found in ${input}`)
            process.exit(1)
        }
        const project = JSON.parse(await projectJson.async("string"))
        const before = JSON.stringify(project, null, 2) + "\n"
        for (const Packer of packers) {
            new Packer(project).pack()
        }
        this._printDiff(before, JSON.stringify(project, null, 2) + "\n")

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
        const inputBytes = (await readFile(input)).byteLength
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

    private _printDiff(before: string, after: string): void {
        for (const part of diffLines(before, after)) {
            let prefix: string
            let color: (text: string) => string
            if (part.added) {
                prefix = "+"
                color = pc.green
            } else if (part.removed) {
                prefix = "-"
                color = pc.red
            } else {
                prefix = " "
                color = pc.dim
            }
            for (const line of part.value.split("\n")) {
                if (line !== "") {
                    process.stdout.write(color(prefix + line + "\n"))
                }
            }
        }
    }

    private _parseArgs(): [input: string, output: string] {
        const {positionals} = parseArgs({
            args: process.argv.slice(2),
            allowPositionals: true,
        })
        const [input, output] = positionals
        if (input === undefined || positionals.length > 2) {
            console.error(usage)
            process.exit(1)
        }
        return [input, output ?? input.replace(/\.sb3$/, "") + ".pk.sb3"]
    }
}

export const application = new Application()

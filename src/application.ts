import {readFile, writeFile} from "node:fs/promises"
import {parseArgs} from "node:util"

import JSZip from "jszip"

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
        const json = await projectJson.async("string")
        const project = JSON.parse(json)

        const errors = sb3Validator.validate(project, json)
        if (errors !== null) {
            console.log(errors)
            process.exit(1)
        }
        console.log("BEFORE PACKING")
        console.log(JSON.stringify(project, null, 2))
        for (const packer of packers) {
            packer.pack(project)
        }
        console.log("AFTER PACKING")
        console.log(JSON.stringify(project, null, 2))

        const out = new JSZip()
        out.file("project.json", JSON.stringify(project))
        for (const [path, entry] of Object.entries(zip.files)) {
            if (entry.dir || path === "project.json") continue
            out.file(path, await entry.async("nodebuffer"))
        }
        await writeFile(
            target,
            await out.generateAsync({type: "nodebuffer", compression: "DEFLATE"}),
        )
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

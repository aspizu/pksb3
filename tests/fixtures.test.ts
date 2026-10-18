import assert from "node:assert/strict"
import {execFileSync} from "node:child_process"
import {mkdtemp, readFile, rm} from "node:fs/promises"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {test} from "node:test"

import {glob} from "glob"

import {packers} from "../src/packers/index.ts"
import {sb3Validator} from "../src/sb3-validator.ts"
import type {Sb3Project} from "../src/sb3.ts"

const fixtures = new URL("../fixtures/", import.meta.url)

for (const input of await glob("**/input.json", {cwd: fixtures})) {
    await test(input, async () => {
        const fixture = new URL(input, fixtures)
        const temporary = await mkdtemp(join(tmpdir(), "pksb3-fixture-"))
        try {
            const output = join(temporary, "output.json")
            execFileSync(
                "patch",
                [
                    "--batch",
                    "--fuzz=0",
                    "--output",
                    output,
                    "input.json",
                    "packed.patch",
                ],
                {cwd: new URL("./", fixture)},
            )
            const project = JSON.parse(await readFile(fixture, "utf8")) as Sb3Project
            const expected: unknown = JSON.parse(await readFile(output, "utf8"))
            for (const Packer of packers) {
                new Packer(project).pack()
            }
            assert.deepEqual(project, expected)
            assert.equal(sb3Validator.validate(project, JSON.stringify(project)), null)
        } finally {
            await rm(temporary, {recursive: true, force: true})
        }
    })
}

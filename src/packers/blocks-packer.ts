import type {Sb3Block} from "../sb3.ts"
import {Packer} from "./packer.ts"

const BLOCK_DEFAULTS = {
    shadow: false,
    topLevel: false,
}

export class BlocksPacker extends Packer {
    override pack(): void {
        for (const target of this._project.targets) {
            for (const [id, block] of Object.entries(target.blocks)) {
                const isFloatingReporter = Array.isArray(block)
                const isFloatingBlock =
                    !isFloatingReporter && !block.topLevel && block.parent === undefined
                if (isFloatingReporter || isFloatingBlock) {
                    delete target.blocks[id]
                    continue
                }
                const record = block as unknown as Record<string, unknown>
                for (const [key, value] of Object.entries(BLOCK_DEFAULTS)) {
                    if (record[key] === value) {
                        delete record[key]
                    }
                }
                this._removeUnusedFromBlock(block)
            }
        }
    }

    private _removeUnusedFromBlock(block: Sb3Block): void {
        delete block.comment
        delete block.x
        delete block.y
        this._removeUnusedInputs(block)
        if (block.fields !== undefined && Object.keys(block.fields).length === 0) {
            delete block.fields
        }
        if (
            block.opcode !== "procedures_call" &&
            block.opcode !== "procedures_prototype"
        )
            return
        const mutation = block.mutation
        if (mutation?.warp === false || mutation?.warp === "false") {
            delete mutation.warp
        }
    }

    private _removeUnusedInputs(block: Sb3Block): void {
        if (block.inputs === undefined) return
        for (const key of ["SUBSTACK", "SUBSTACK2"]) {
            const input = block.inputs[key]
            if (input?.[0] === 2 && input[1] === null && input.length === 2) {
                delete block.inputs[key]
            }
        }
        if (Object.keys(block.inputs).length === 0) {
            delete block.inputs
        }
    }
}

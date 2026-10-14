import type {Sb3Block, Sb3Target} from "../sb3.ts"
import {Packer} from "./packer.ts"

export class BlocksPacker extends Packer {
    override pack(): void {
        for (const target of this._project.targets) {
            this._packBlocks(target.blocks)
        }
    }

    private _packBlocks(blocks: Sb3Target["blocks"]): void {
        this._removeUnreachableBlocks(blocks)
        for (const block of Object.values(blocks)) {
            if (Array.isArray(block)) continue
            this._removeEditorMetadata(block)
            this._removeUnusedInputs(block)
            this._removeBlockDefaultFields(block)
            this._removeProcedureMutationDefaults(block)
        }
    }

    private _removeUnreachableBlocks(blocks: Sb3Target["blocks"]): void {
        const reachable = this._collectReachableBlocks(blocks)
        for (const id of Object.keys(blocks)) {
            if (!reachable.has(id)) {
                delete blocks[id]
            }
        }
    }

    private _collectReachableBlocks(blocks: Sb3Target["blocks"]): Set<string> {
        const reachable = new Set<string>()
        const pending = Object.entries(blocks)
            .filter(
                ([, block]) =>
                    !Array.isArray(block) &&
                    (block.opcode.startsWith("event_when") ||
                        block.opcode === "control_start_as_clone" ||
                        block.opcode === "procedures_definition"),
            )
            .map(([id]) => id)
        for (const id of pending) {
            if (reachable.has(id)) continue
            reachable.add(id)
            const block = blocks[id]
            if (block === undefined || Array.isArray(block)) continue
            if (typeof block.next === "string") {
                pending.push(block.next)
            }
            for (const input of Object.values(block.inputs ?? {})) {
                for (const value of input) {
                    if (typeof value === "string") {
                        pending.push(value)
                    }
                }
            }
        }
        return reachable
    }

    private _removeEditorMetadata(block: Sb3Block): void {
        delete block.comment
        delete block.x
        delete block.y
    }

    private _removeBlockDefaultFields(block: Sb3Block): void {
        if (block.shadow === false) {
            delete block.shadow
        }
        if (block.topLevel === false) {
            delete block.topLevel
        }
        if (block.fields !== undefined && Object.keys(block.fields).length === 0) {
            delete block.fields
        }
    }

    private _removeProcedureMutationDefaults(block: Sb3Block): void {
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

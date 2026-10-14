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
        const procedures = this._collectProcedureDefinitions(blocks)
        const reachable = new Set<string>()
        const pending = Object.entries(blocks)
            .filter(
                ([, block]) =>
                    !Array.isArray(block) &&
                    (block.opcode.startsWith("event_when") ||
                        block.opcode === "control_start_as_clone"),
            )
            .map(([id]) => id)
        for (const id of pending) {
            if (reachable.has(id)) continue
            reachable.add(id)
            const block = blocks[id]
            if (block === undefined || Array.isArray(block)) continue
            this._collectBlockReferences(block, procedures, pending)
        }
        return reachable
    }

    private _collectProcedureDefinitions(
        blocks: Sb3Target["blocks"],
    ): Map<string, string> {
        const procedures = new Map<string, string>()
        const definitions = Object.entries(blocks).filter(
            (entry): entry is [string, Sb3Block] =>
                !Array.isArray(entry[1]) && entry[1].opcode === "procedures_definition",
        )
        for (const [id, block] of definitions) {
            const prototypeId = block.inputs?.["custom_block"]?.[1]
            if (typeof prototypeId !== "string") continue
            const prototype = blocks[prototypeId]
            if (prototype === undefined || Array.isArray(prototype)) continue
            const proccode = prototype.mutation?.proccode
            if (proccode === undefined || procedures.has(proccode)) continue
            procedures.set(proccode, id)
        }
        return procedures
    }

    private _collectBlockReferences(
        block: Sb3Block,
        procedures: Map<string, string>,
        pending: string[],
    ): void {
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
        if (block.opcode !== "procedures_call") return
        const proccode = block.mutation?.proccode
        if (proccode === undefined) return
        const definition = procedures.get(proccode)
        if (definition !== undefined) {
            pending.push(definition)
        }
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

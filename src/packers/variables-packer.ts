import type {Sb3Block, Sb3List, Sb3Variable} from "../sb3.ts"
import {Packer} from "./packer.ts"

export class VariablesPacker extends Packer {
    override pack(): void {
        this._removeUnusedDefinitions()
        this._removeDefaultDefinitions()
    }

    private _removeUnusedDefinitions(): void {
        const used = this._collectUsedIds()
        for (const target of this._project.targets) {
            for (const key of ["variables", "lists"] as const) {
                const definitions = target[key] ?? {}
                for (const id of Object.keys(definitions)) {
                    if (!used.has(id)) {
                        delete definitions[id]
                    }
                }
            }
        }
    }

    private _removeDefaultDefinitions(): void {
        const monitored = this._collectMonitoredIds()
        for (const target of this._project.targets) {
            if (target.isStage) continue
            for (const key of ["variables", "lists"] as const) {
                const definitions = target[key] ?? {}
                for (const [id, definition] of Object.entries(definitions)) {
                    if (!monitored.has(id) && this._hasDefaultValue(definition)) {
                        delete definitions[id]
                    }
                }
            }
        }
    }

    private _hasDefaultValue(definition: Sb3Variable | Sb3List): boolean {
        if (definition[2] === true) {
            return false
        }
        const value = definition[1]
        return value === 0 || (Array.isArray(value) && value.length === 0)
    }

    private _collectUsedIds(): Set<string> {
        const ids = this._collectMonitoredIds()
        for (const target of this._project.targets) {
            for (const block of Object.values(target.blocks)) {
                if (Array.isArray(block)) {
                    ids.add(block[2])
                    continue
                }
                this._collectBlockReferences(block, ids)
            }
        }
        return ids
    }

    private _collectMonitoredIds(): Set<string> {
        const ids = new Set<string>()
        for (const monitor of this._project.monitors ?? []) {
            if (
                monitor.opcode === "data_variable" ||
                monitor.opcode === "data_listcontents"
            ) {
                ids.add(monitor.id)
            }
        }
        return ids
    }

    private _collectBlockReferences(block: Sb3Block, ids: Set<string>): void {
        for (const name of ["VARIABLE", "LIST"]) {
            const id = block.fields?.[name]?.[1]
            if (id === undefined) continue
            ids.add(id)
        }
        this._collectInputReferences(block, ids)
    }

    private _collectInputReferences(block: Sb3Block, ids: Set<string>): void {
        for (const input of Object.values(block.inputs ?? {})) {
            for (const value of input) {
                if (Array.isArray(value) && (value[0] === 12 || value[0] === 13)) {
                    ids.add(value[2])
                }
            }
        }
    }
}

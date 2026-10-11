import type {Sb3Block, Sb3Costume, Sb3Project, Sb3Target} from "../sb3.ts"
import type {IPacker} from "./index.ts"

export class MetadataPacker implements IPacker {
    pack(project: Sb3Project): void {
        this._removeUnused(project)
    }

    private _removeUnused(project: Sb3Project): void {
        delete project.extensions
        delete project.meta.agent
        delete project.meta.origin
        if (project.monitors !== undefined && project.monitors.length === 0) {
            delete project.monitors
        }
        for (const target of project.targets) {
            this._removeUnusedFromTarget(target)
        }
    }

    private _removeUnusedFromTarget(target: Sb3Target): void {
        for (const key of ["lists", "broadcasts"] as const) {
            const value = target[key]
            if (value !== undefined && Object.keys(value).length === 0) {
                delete target[key]
            }
        }
        delete target.comments
        for (const costume of target.costumes) {
            this._removeUnusedFromCostume(costume)
        }
        for (const [id, block] of Object.entries(target.blocks)) {
            const isFloatingReporter = Array.isArray(block)
            const isFloatingBlock =
                !isFloatingReporter && !block.topLevel && block.parent === undefined
            if (isFloatingReporter || isFloatingBlock) {
                delete target.blocks[id]
            } else {
                this._removeUnusedFromBlock(block)
            }
        }
    }

    private _removeUnusedFromCostume(costume: Sb3Costume): void {
        if (costume.bitmapResolution === 2) {
            delete costume.bitmapResolution
        }
    }

    private _removeUnusedFromBlock(block: Sb3Block): void {
        delete block.comment
        if (block.next === null) {
            delete block.next
        }
        if (block.parent === null) {
            delete block.parent
        }
        if (block.inputs !== undefined && Object.keys(block.inputs).length === 0) {
            delete block.inputs
        }
        if (block.fields !== undefined && Object.keys(block.fields).length === 0) {
            delete block.fields
        }
        delete block.x
        delete block.y
    }
}

export const metadataPacker = new MetadataPacker()

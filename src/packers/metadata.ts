import type {Sb3Block, Sb3Costume, Sb3Field, Sb3Project, Sb3Target} from "../sb3.ts"
import type {IPacker} from "./index.ts"

export class MetadataPacker implements IPacker {
    private static readonly _targetDefaults = {
        volume: 100,
        currentCostume: 0,
        textToSpeechLanguage: null,
        tempo: 60,
        videoTransparency: 50,
        videoState: "on",
        visible: true,
        x: 0,
        y: 0,
        size: 100,
        direction: 90,
        draggable: false,
        rotationStyle: "all around",
    }

    pack(project: Sb3Project): void {
        this._removeUnused(project)
    }

    private _removeUnused(project: Sb3Project): void {
        delete project.extensions
        delete project.meta.agent
        delete project.meta.origin
        if (project.monitors !== undefined) {
            const shownIds = this._collectShownMonitorIds(project)
            project.monitors = project.monitors.filter(
                (monitor) => monitor.visible !== false || shownIds.has(monitor.id),
            )
            if (project.monitors.length === 0) {
                delete project.monitors
            }
        }
        for (const target of project.targets) {
            this._removeUnusedFromTarget(target)
        }
    }

    private _collectShownMonitorIds(project: Sb3Project): Set<string> {
        const ids = new Set<string>()
        for (const target of project.targets) {
            for (const block of Object.values(target.blocks)) {
                if (Array.isArray(block)) continue
                let field: Sb3Field | undefined
                if (block.opcode === "data_showvariable") {
                    field = block.fields?.["VARIABLE"]
                } else if (block.opcode === "data_showlist") {
                    field = block.fields?.["LIST"]
                }
                if (field !== undefined && field[1] !== undefined) {
                    ids.add(field[1])
                }
            }
        }
        return ids
    }

    private _removeUnusedFromTarget(target: Sb3Target): void {
        this._removeDefaults(target, MetadataPacker._targetDefaults)
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

    private _removeDefaults(target: Sb3Target, defaults: object): void {
        const record = target as unknown as Record<string, unknown>
        for (const [key, value] of Object.entries(defaults)) {
            if (record[key] === value) {
                delete record[key]
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

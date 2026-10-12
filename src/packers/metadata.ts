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

    private static readonly _monitorDefaults = {
        mode: "default",
        spriteName: null,
        sliderMin: 0,
        sliderMax: 100,
        isDiscrete: true,
        width: 0,
        height: 0,
        x: null,
        y: null,
    }

    private static readonly _blockDefaults = {
        shadow: false,
        topLevel: false,
    }

    pack(project: Sb3Project): void {
        this._removeUnusedMeta(project)
        this._removeUnusedMonitors(project)
        this._removeUnusedLayerOrder(project)
        for (const target of project.targets) {
            this._removeUnusedFromTarget(target)
        }
    }

    private _removeUnusedMeta(project: Sb3Project): void {
        delete project.extensions
        delete project.meta.agent
        delete project.meta.origin
        delete project.meta.vm
    }

    private _removeUnusedMonitors(project: Sb3Project): void {
        if (project.monitors !== undefined) {
            const shownIds = this._collectShownMonitorIds(project)
            project.monitors = project.monitors.filter(
                (monitor) => monitor.visible !== false || shownIds.has(monitor.id),
            )
            if (project.monitors.length === 0) {
                delete project.monitors
            } else {
                for (const monitor of project.monitors) {
                    this._removeDefaults(monitor, MetadataPacker._monitorDefaults)
                }
            }
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

    private _removeUnusedLayerOrder(project: Sb3Project): void {
        let previousLayerOrder = -Infinity
        for (const target of project.targets) {
            if (
                target.layerOrder === undefined ||
                target.layerOrder < previousLayerOrder
            )
                return
            previousLayerOrder = target.layerOrder
        }
        for (const target of project.targets) {
            delete target.layerOrder
        }
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
        for (const sound of target.sounds) {
            delete sound.rate
            delete sound.sampleCount
        }
        this._removeUnusedBlocks(target)
    }

    private _removeUnusedBlocks(target: Sb3Target): void {
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

    private _removeDefaults(object: object, defaults: object): void {
        const record = object as Record<string, unknown>
        for (const [key, value] of Object.entries(defaults)) {
            if (record[key] === value) {
                delete record[key]
            }
        }
    }

    private _removeUnusedFromCostume(costume: Sb3Costume): void {
        if (
            costume.bitmapResolution === 2 ||
            (costume.dataFormat === "svg" && costume.bitmapResolution === 1)
        ) {
            delete costume.bitmapResolution
        }
        if (costume.md5ext === `${costume.assetId}.${costume.dataFormat}`) {
            delete costume.md5ext
        }
    }

    private _removeUnusedFromBlock(block: Sb3Block): void {
        this._removeDefaults(block, MetadataPacker._blockDefaults)
        delete block.comment
        this._removeUnusedInputs(block)
        if (block.fields !== undefined && Object.keys(block.fields).length === 0) {
            delete block.fields
        }
        const mutation = block.mutation
        if (
            (block.opcode === "procedures_call" ||
                block.opcode === "procedures_prototype") &&
            (mutation?.warp === false || mutation?.warp === "false")
        ) {
            delete mutation.warp
        }
        delete block.x
        delete block.y
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

export const metadataPacker = new MetadataPacker()

import type {Sb3Field} from "../sb3.ts"
import {Packer} from "./packer.ts"

const MONITOR_DEFAULTS = {
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

export class MetadataPacker extends Packer {
    override pack(): void {
        delete this._project.extensions
        delete this._project.meta.agent
        delete this._project.meta.origin
        delete this._project.meta.vm
        this._removeUnusedMonitors()
    }

    private _removeUnusedMonitors(): void {
        if (this._project.monitors === undefined) return
        const shownIds = this._collectShownMonitorIds()
        this._project.monitors = this._project.monitors.filter(
            (monitor) => monitor.visible !== false || shownIds.has(monitor.id),
        )
        if (this._project.monitors.length === 0) {
            delete this._project.monitors
            return
        }
        for (const monitor of this._project.monitors) {
            const record = monitor as unknown as Record<string, unknown>
            for (const [key, value] of Object.entries(MONITOR_DEFAULTS)) {
                if (record[key] === value) {
                    delete record[key]
                }
            }
        }
    }

    private _collectShownMonitorIds(): Set<string> {
        const ids = new Set<string>()
        for (const target of this._project.targets) {
            for (const block of Object.values(target.blocks)) {
                if (Array.isArray(block)) continue
                let field: Sb3Field | undefined
                if (block.opcode === "data_showvariable") {
                    field = block.fields?.["VARIABLE"]
                } else if (block.opcode === "data_showlist") {
                    field = block.fields?.["LIST"]
                }
                if (field?.[1] === undefined) continue
                ids.add(field[1])
            }
        }
        return ids
    }
}

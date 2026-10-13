import type {Sb3Costume, Sb3Target} from "../sb3.ts"
import {Packer} from "./packer.ts"

const TARGET_DEFAULTS = {
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

export class SpritePacker extends Packer {
    override pack(): void {
        this._removeUnusedLayerOrder()
        for (const target of this._project.targets) {
            this._removeUnusedFromTarget(target)
        }
    }

    private _removeUnusedLayerOrder(): void {
        let previousLayerOrder = -Infinity
        for (const target of this._project.targets) {
            if (
                target.layerOrder === undefined ||
                target.layerOrder < previousLayerOrder
            )
                return
            previousLayerOrder = target.layerOrder
        }
        for (const target of this._project.targets) {
            delete target.layerOrder
        }
    }

    private _removeUnusedFromTarget(target: Sb3Target): void {
        const record = target as unknown as Record<string, unknown>
        for (const [key, value] of Object.entries(TARGET_DEFAULTS)) {
            if (record[key] === value) {
                delete record[key]
            }
        }
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
}

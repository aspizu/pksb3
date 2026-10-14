import type {Sb3Block, Sb3Input, Sb3Target} from "../sb3.ts"
import {Packer} from "./packer.ts"

export class ShadowsPacker extends Packer {
    override pack(): void {
        for (const target of this._project.targets) {
            for (const block of Object.values(target.blocks)) {
                if (Array.isArray(block)) continue
                this._packBlock(block, target.blocks)
            }
        }
    }

    private _packBlock(block: Sb3Block, blocks: Sb3Target["blocks"]): void {
        for (const input of Object.values(block.inputs ?? {})) {
            this._removeShadow(input, blocks)
        }
    }

    private _removeShadow(input: Sb3Input, blocks: Sb3Target["blocks"]): void {
        if (input[0] !== 3) return
        const shadow = input[2]
        if (typeof shadow === "string") {
            delete blocks[shadow]
        }
        input[0] = 2
        input.length = 2
    }
}

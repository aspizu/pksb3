import type {Sb3Block, Sb3Input} from "../sb3.ts"
import {Packer} from "./packer.ts"

export class InputsPacker extends Packer {
    override pack(): void {
        for (const target of this._project.targets) {
            for (const block of Object.values(target.blocks)) {
                if (Array.isArray(block)) continue
                this._packBlock(block)
            }
        }
    }

    private _packBlock(block: Sb3Block): void {
        for (const input of Object.values(block.inputs ?? {})) {
            for (const index of input.keys()) {
                this._packColor(input, index)
                this._packText(input, index)
            }
        }
    }

    private _packColor(input: Sb3Input, index: number): void {
        const primitive = input[index]
        const isColor = Array.isArray(primitive) && primitive[0] === 9
        if (!isColor) return
        input[index] = [4, Number.parseInt(primitive[1].slice(1), 16)]
    }

    private _packText(input: Sb3Input, index: number): void {
        const primitive = input[index]
        const isText = Array.isArray(primitive) && primitive[0] === 10
        if (!isText) return
        input[index] = [4, primitive[1]]
    }
}

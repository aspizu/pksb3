import {Packer} from "./packer.ts"

export class ShadowsPacker extends Packer {
    override pack(): void {
        for (const target of this._project.targets) {
            for (const block of Object.values(target.blocks)) {
                if (Array.isArray(block)) continue
                for (const input of Object.values(block.inputs ?? {})) {
                    if (input[0] !== 3) continue
                    const shadow = input[2]
                    if (typeof shadow === "string") {
                        delete target.blocks[shadow]
                    }
                    input[0] = 2
                    input.length = 2
                }
            }
        }
    }
}

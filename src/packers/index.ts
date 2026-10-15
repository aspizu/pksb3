import {BlocksPacker} from "./blocks-packer.ts"
import {IdentifiersPacker} from "./identifiers-packer.ts"
import {InputsPacker} from "./inputs-packer.ts"
import {MetadataPacker} from "./metadata-packer.ts"
import {ShadowsPacker} from "./shadows-packer.ts"
import {SpritePacker} from "./sprite-packer.ts"
import {VariablesPacker} from "./variables-packer.ts"

export {Packer} from "./packer.ts"
export {
    MetadataPacker,
    SpritePacker,
    BlocksPacker,
    ShadowsPacker,
    InputsPacker,
    VariablesPacker,
    IdentifiersPacker,
}

export const packers = [
    BlocksPacker,
    ShadowsPacker,
    InputsPacker,
    MetadataPacker,
    VariablesPacker,
    SpritePacker,
    IdentifiersPacker,
]

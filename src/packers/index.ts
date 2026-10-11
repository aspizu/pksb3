import type {Sb3Project} from "../sb3.ts"
import {metadataPacker} from "./metadata.ts"

export interface IPacker {
    pack(project: Sb3Project): void
}

export {MetadataPacker} from "./metadata.ts"

export const packers: IPacker[] = [metadataPacker]

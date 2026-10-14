import type {Sb3Project} from "../sb3.ts"
import type {IdentifierGenerator} from "./identifier-generator.ts"

export interface PackerOptions {
    identifierGenerator?: new () => IdentifierGenerator
}

export abstract class Packer {
    protected readonly _project: Sb3Project
    protected readonly _options: PackerOptions

    constructor(project: Sb3Project, options: PackerOptions = {}) {
        this._project = project
        this._options = options
    }

    abstract pack(): void
}

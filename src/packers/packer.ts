import type {Sb3Project} from "../sb3.ts"

export abstract class Packer {
    protected readonly _project: Sb3Project

    constructor(project: Sb3Project) {
        this._project = project
    }

    abstract pack(): void
}

import {type ValidateFunction, Ajv} from "ajv"
import betterAjvErrors from "better-ajv-errors"

import definitions from "./sb3_definitions.json" with {type: "json"}
import schema from "./sb3_schema.json" with {type: "json"}

export class SB3Validator {
    private readonly _validate: ValidateFunction

    constructor() {
        const ajv = new Ajv({strict: false})
        ajv.addSchema(definitions)
        this._validate = ajv.compile(schema)
    }

    validate(project: unknown, json: string): string | null {
        if (this._validate(project)) {
            return null
        }
        return betterAjvErrors(schema, project, this._validate.errors ?? [], {json})
    }
}

export const sb3Validator = new SB3Validator()

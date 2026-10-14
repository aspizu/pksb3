import {$enum} from "../enum.ts"
import type {
    Sb3Block,
    Sb3Input,
    Sb3Mutation,
    Sb3Target,
    Sb3TopLevelPrimitive,
} from "../sb3.ts"
import {IdentifierGenerator} from "./identifier-generator.ts"
import {
    type DataDictionaryReference,
    type DictionaryReference,
    type JsonArrayReference,
    type Reference,
    rebuildDictionary,
    renameReference,
} from "./identifier-reference.ts"
import {Packer} from "./packer.ts"

const IdentifierType = $enum("Block", "Variable", "List", "Argument", "Procedure")
type IdentifierType = $enum<typeof IdentifierType>

interface Identifier {
    type: IdentifierType
    value: string
    references: Reference[]
}

const FIELD_TYPES = [
    ["VARIABLE", IdentifierType.Variable],
    ["LIST", IdentifierType.List],
] as const

export class IdentifiersPacker extends Packer {
    private _identifiers = new Map<string, Identifier>()
    private _dictionaries: DictionaryReference[] = []
    private _jsonArrays: JsonArrayReference[] = []
    private _cloudVariables = new Set<string>()
    private _skippedIds = new Set<string>()

    override pack(): void {
        this._collectIdentifiers()
        this._renameIdentifiers()
    }

    private _collectIdentifiers(): void {
        this._identifiers.clear()
        this._dictionaries = []
        this._jsonArrays = []
        this._cloudVariables.clear()
        this._skippedIds = new Set(["of"])
        this._collectPreservedIdentifiers()
        for (const target of this._project.targets) {
            this._collectTargetIdentifiers(target)
        }
        this._collectMonitorIdentifiers()
    }

    private _collectPreservedIdentifiers(): void {
        for (const target of this._project.targets) {
            for (const [id, variable] of Object.entries(target.variables ?? {})) {
                if (variable[2] === true) {
                    this._cloudVariables.add(id)
                }
            }
            for (const id of Object.keys(target.broadcasts ?? {})) {
                this._skippedIds.add(id)
            }
        }
    }

    private _collectTargetIdentifiers(target: Sb3Target): void {
        const argumentIds = this._collectArgumentIds(target.blocks)
        if (target.variables !== undefined) {
            this._collectDataIdentifiers(IdentifierType.Variable, {
                target,
                key: "variables",
                entries: Object.entries(target.variables),
            })
        }
        if (target.lists !== undefined) {
            this._collectDataIdentifiers(IdentifierType.List, {
                target,
                key: "lists",
                entries: Object.entries(target.lists),
            })
        }
        const entries = Object.entries(target.blocks)
        this._dictionaries.push({target, key: "blocks", entries})
        for (const entry of entries) {
            this._addReference(IdentifierType.Block, {target: entry, key: 0}, entry[0])
            this._collectBlockIdentifiers(entry[1], argumentIds)
        }
    }

    private _collectDataIdentifiers(
        type: IdentifierType,
        reference: DataDictionaryReference,
    ): void {
        this._dictionaries.push(reference)
        for (const entry of reference.entries) {
            const [id, value] = entry
            this._addReference(type, {target: entry, key: 0}, id)
            this._addNameReference(type, {target: value, key: 0}, id)
        }
    }

    private _collectArgumentIds(blocks: Sb3Target["blocks"]): Map<string, string> {
        const argumentIds = new Map<string, string>()
        for (const block of Object.values(blocks)) {
            if (Array.isArray(block) || block.opcode !== "procedures_prototype")
                continue
            const mutation = block.mutation
            if (!mutation?.argumentids || !mutation.argumentnames) continue
            const ids = JSON.parse(mutation.argumentids) as string[]
            const names = JSON.parse(mutation.argumentnames) as string[]
            for (const [index, name] of names.entries()) {
                argumentIds.set(name, ids[index] ?? name)
            }
        }
        return argumentIds
    }

    private _collectBlockIdentifiers(
        block: Sb3Block | Sb3TopLevelPrimitive,
        argumentIds: Map<string, string>,
    ): void {
        if (Array.isArray(block)) {
            this._collectPrimitiveIdentifiers(block)
            return
        }
        for (const key of ["parent", "next"] as const) {
            const id = block[key]
            if (typeof id === "string") {
                this._addReference(IdentifierType.Block, {target: block, key}, id)
            }
        }
        for (const [key, type] of FIELD_TYPES) {
            const field = block.fields?.[key]
            if (field?.[1] === undefined) continue
            this._addReference(type, {target: field, key: 1}, field[1])
            this._addNameReference(type, {target: field, key: 0}, field[1])
        }
        for (const input of Object.values(block.inputs ?? {})) {
            this._collectInputIdentifiers(input)
        }
        this._collectProcedureIdentifiers(block, argumentIds)
    }

    private _collectPrimitiveIdentifiers(primitive: Sb3TopLevelPrimitive): void {
        let type: IdentifierType = IdentifierType.Variable
        if (primitive[0] === 13) {
            type = IdentifierType.List
        }
        this._addReference(type, {target: primitive, key: 2}, primitive[2])
        this._addNameReference(type, {target: primitive, key: 1}, primitive[2])
    }

    private _collectInputIdentifiers(input: Sb3Input): void {
        for (const [index, value] of input.entries()) {
            if (typeof value === "string") {
                this._addReference(
                    IdentifierType.Block,
                    {target: input, key: index},
                    value,
                )
            } else if (Array.isArray(value) && (value[0] === 12 || value[0] === 13)) {
                this._collectPrimitiveIdentifiers(value)
            }
        }
    }

    private _collectProcedureIdentifiers(
        block: Sb3Block,
        argumentIds: Map<string, string>,
    ): void {
        if (block.opcode.startsWith("argument_reporter_")) {
            const field = block.fields?.["VALUE"]
            if (field !== undefined) {
                const id = argumentIds.get(field[0]) ?? field[0]
                this._addReference(IdentifierType.Argument, {target: field, key: 0}, id)
            }
            return
        }
        const mutation = block.mutation
        if (mutation?.proccode === undefined) return
        this._addReference(
            IdentifierType.Procedure,
            {target: mutation, key: "proccode"},
            mutation.proccode,
        )
        this._collectArgumentIdentifiers(mutation, argumentIds)
        if (block.inputs === undefined) return
        const entries = Object.entries(block.inputs)
        this._dictionaries.push({target: block, key: "inputs", entries})
        for (const entry of entries) {
            this._addReference(
                IdentifierType.Argument,
                {target: entry, key: 0},
                entry[0],
            )
        }
    }

    private _collectArgumentIdentifiers(
        mutation: Sb3Mutation,
        argumentIds: Map<string, string>,
    ): void {
        for (const key of ["argumentids", "argumentnames"] as const) {
            const value = mutation[key]
            if (value === undefined) continue
            const values = JSON.parse(value) as string[]
            this._jsonArrays.push({target: mutation, key, values})
            for (const [index, name] of values.entries()) {
                let id = name
                if (key === "argumentnames") {
                    id = argumentIds.get(name) ?? name
                }
                this._addReference(
                    IdentifierType.Argument,
                    {target: values, key: index},
                    id,
                )
            }
        }
    }

    private _collectMonitorIdentifiers(): void {
        for (const monitor of this._project.monitors ?? []) {
            let type: IdentifierType
            let key: "VARIABLE" | "LIST"
            switch (monitor.opcode) {
                case "data_variable":
                    type = IdentifierType.Variable
                    key = "VARIABLE"
                    break
                case "data_listcontents":
                    type = IdentifierType.List
                    key = "LIST"
                    break
                default:
                    this._skippedIds.add(monitor.id)
                    continue
            }
            this._addReference(type, {target: monitor, key: "id"}, monitor.id)
            this._addNameReference(type, {target: monitor.params, key}, monitor.id)
        }
    }

    private _addNameReference(type: IdentifierType, ref: Reference, id: string): void {
        if (type === IdentifierType.Variable && this._cloudVariables.has(id)) return
        this._addReference(type, ref, id)
    }

    private _addReference(
        type: IdentifierType,
        reference: Reference,
        id: string,
    ): void {
        const mapKey = `${type}:${id}`
        let identifier = this._identifiers.get(mapKey)
        if (identifier === undefined) {
            identifier = {type, value: id, references: []}
            this._identifiers.set(mapKey, identifier)
        }
        identifier.references.push(reference)
    }

    private _renameIdentifiers(): void {
        const frequencies: Identifier[][] = []
        for (const identifier of this._identifiers.values()) {
            const count = identifier.references.length
            const bucket = frequencies[count] ?? []
            bucket.push(identifier)
            frequencies[count] = bucket
        }
        const generator = new IdentifierGenerator()
        const procedureGenerator = new IdentifierGenerator()
        for (let count = frequencies.length - 1; count >= 0; count--) {
            for (const identifier of frequencies[count] ?? []) {
                const value = this._generateIdentifier(
                    identifier,
                    generator,
                    procedureGenerator,
                )
                for (const reference of identifier.references) {
                    renameReference(reference, value)
                }
            }
        }
        for (const reference of this._dictionaries) {
            rebuildDictionary(reference)
        }
        for (const reference of this._jsonArrays) {
            reference.target[reference.key] = JSON.stringify(reference.values)
        }
    }

    private _generateIdentifier(
        identifier: Identifier,
        generator: IdentifierGenerator,
        procedureGenerator: IdentifierGenerator,
    ): string {
        if (identifier.type === IdentifierType.Procedure) {
            let name = procedureGenerator.generate()
            while (name.trim() !== name || /[%\\]/.test(name)) {
                name = procedureGenerator.generate()
            }
            return [name, ...(identifier.value.match(/(?<!\\)%[nbs]/g) ?? [])].join(" ")
        }
        let id = generator.generate()
        while (this._skippedIds.has(id)) {
            id = generator.generate()
        }
        return id
    }
}

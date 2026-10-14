import type {
    Sb3Block,
    Sb3Field,
    Sb3Input,
    Sb3List,
    Sb3Monitor,
    Sb3Mutation,
    Sb3Target,
    Sb3TopLevelPrimitive,
    Sb3Variable,
} from "../sb3.ts"

type DictionaryEntry = [
    string,
    Sb3Block | Sb3Input | Sb3List | Sb3TopLevelPrimitive | Sb3Variable,
]

export type Reference =
    | {target: string[] | Sb3Input; key: number}
    | {target: DictionaryEntry | Sb3List | Sb3Variable; key: 0}
    | {target: Sb3Field; key: 0 | 1}
    | {target: Sb3TopLevelPrimitive; key: 1 | 2}
    | {target: Sb3Block; key: "parent" | "next"}
    | {target: Sb3Mutation; key: "proccode"}
    | {target: Sb3Monitor; key: "id"}
    | {target: Sb3Monitor["params"]; key: "VARIABLE" | "LIST"}

export type DataDictionaryReference =
    | {target: Sb3Target; key: "variables"; entries: [string, Sb3Variable][]}
    | {target: Sb3Target; key: "lists"; entries: [string, Sb3List][]}

export type DictionaryReference =
    | DataDictionaryReference
    | {
          target: Sb3Target
          key: "blocks"
          entries: [string, Sb3Block | Sb3TopLevelPrimitive][]
      }
    | {target: Sb3Block; key: "inputs"; entries: [string, Sb3Input][]}

export interface JsonArrayReference {
    target: Sb3Mutation
    key: "argumentids" | "argumentnames"
    values: string[]
}

export function renameReference(reference: Reference, value: string): void {
    switch (reference.key) {
        case "parent":
        case "next":
            reference.target[reference.key] = value
            break
        case "proccode":
            reference.target.proccode = value
            break
        case "id":
            reference.target.id = value
            break
        case "VARIABLE":
        case "LIST":
            reference.target[reference.key] = value
            break
        default:
            reference.target[reference.key] = value
    }
}

export function rebuildDictionary(reference: DictionaryReference): void {
    switch (reference.key) {
        case "variables":
            reference.target.variables = Object.fromEntries(reference.entries)
            break
        case "lists":
            reference.target.lists = Object.fromEntries(reference.entries)
            break
        case "blocks":
            reference.target.blocks = Object.fromEntries(reference.entries)
            break
        case "inputs":
            reference.target.inputs = Object.fromEntries(reference.entries)
    }
}

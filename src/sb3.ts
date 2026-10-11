export type ScalarValue = string | number | boolean

export interface Sb3Meta {
    semver: string
    vm?: string
    agent?: string
    origin?: string
}

export interface Sb3Costume {
    assetId: string
    bitmapResolution?: number
    dataFormat: "png" | "svg" | "jpeg" | "jpg" | "bmp" | "gif"
    md5ext?: string
    name: string
    rotationCenterX?: number
    rotationCenterY?: number
}

export interface Sb3Sound {
    assetId: string
    dataFormat: "wav" | "wave" | "mp3"
    md5ext?: string
    name: string
    rate?: number
    sampleCount?: number
}

export type Sb3Variable = [name: string, value: ScalarValue, isCloud?: true]

export type Sb3List = [name: string, contents: ScalarValue[]]

export interface Sb3Comment {
    blockId?: string | null
    text: string
    minimized?: boolean
    x?: number
    y?: number
    width?: number
    height?: number
}

export type Sb3VariablePrimitive = [12, name: string, id: string, ...number[]]

export type Sb3ListPrimitive = [13, name: string, id: string, ...number[]]

export type Sb3InputPrimitive =
    | [4 | 5 | 6 | 7 | 8, string | number]
    | [9, string]
    | [10, string | number]
    | [11, name: string, id: string]
    | Sb3VariablePrimitive
    | Sb3ListPrimitive

export type Sb3TopLevelPrimitive = Sb3VariablePrimitive | Sb3ListPrimitive

export type Sb3Input = [1 | 2 | 3, ...(string | Sb3InputPrimitive)[]]

export interface Sb3Mutation {
    tagName: "mutation"
    children?: unknown[]
    proccode?: string
    argumentids?: string
    warp?: "true" | "false" | "null" | boolean | null
    hasnext?: "true" | "false" | "null" | boolean | null
}

export interface Sb3Block {
    opcode: string
    next?: string | null
    parent?: string | null
    inputs?: Record<string, Sb3Input>
    fields?: Record<string, Sb3Field>
    shadow?: boolean
    topLevel?: boolean
    x?: number
    y?: number
    comment?: string
    mutation?: Sb3Mutation
}

interface Sb3TargetBase {
    name: string
    variables: Record<string, Sb3Variable>
    lists: Record<string, Sb3List>
    blocks: Record<string, Sb3Block | Sb3TopLevelPrimitive>
    costumes: Sb3Costume[]
    sounds: Sb3Sound[]
    broadcasts?: Record<string, string>
    comments?: Record<string, Sb3Comment>
    currentCostume?: number
    volume?: number
    textToSpeechLanguage?: string | null
    layerOrder?: number
}

export interface Sb3Stage extends Sb3TargetBase {
    isStage: true
    name: "Stage"
    tempo?: number
    videoTransparency?: number
    videoState?: "on" | "off" | "on-flipped"
}

export interface Sb3Sprite extends Sb3TargetBase {
    isStage: false
    visible?: boolean
    x?: number
    y?: number
    size?: number
    direction?: number
    draggable?: boolean
    rotationStyle?: "all around" | "don't rotate" | "left-right"
}

export type Sb3Target = Sb3Stage | Sb3Sprite

export type Sb3Field = [name: string, id?: string]

export interface Sb3Monitor {
    id: string
    mode: string
    opcode: string
    params: Record<string, unknown>
    spriteName: string | null
    value: unknown
    width: number
    height: number
    x: number
    y: number
    visible?: boolean
    sliderMin?: number
    sliderMax?: number
    isDiscrete?: boolean
}

export interface Sb3Project {
    meta: Sb3Meta
    targets: Sb3Target[]
    monitors?: Sb3Monitor[]
    extensions?: string[]
}

export type $enum<T extends Readonly<Record<string, string>>> = T[keyof T]

export function $enum<const T extends string>(...values: T[]): {readonly [K in T]: K} {
    const entries: [T, T][] = []
    for (const value of values) {
        entries.push([value, value])
    }
    return Object.freeze(Object.fromEntries(entries)) as {readonly [K in T]: K}
}

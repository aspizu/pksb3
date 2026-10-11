import {defineConfig} from "oxfmt"

export default defineConfig({
    ignorePatterns: ["**/*.gs"],
    tabWidth: 4,
    semi: false,
    bracketSpacing: false,
    printWidth: 88,
    sortImports: true,
})

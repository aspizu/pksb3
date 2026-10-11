import {defineConfig} from "oxlint"

export default defineConfig({
    jsPlugins: ["oxlint-plugin-aspizuism"],
    rules: {
        complexity: ["error", {max: 10}],
        "no-ternary": "error",
        "typescript/no-non-null-assertion": "error",
        "max-lines": ["error", {max: 300, skipBlankLines: true, skipComments: true}],
        "aspizuism/block-style": "error",
        "aspizuism/func-style": "error",
        "aspizuism/private-prefix": "error",
    },
    options: {typeAware: true},
})

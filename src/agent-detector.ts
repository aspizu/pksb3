import {stat, writeFile} from "node:fs/promises"
import {join} from "node:path"

import {glob} from "glob"

const NONEMPTY_ENV_VARS = [
    "AMP_CURRENT_THREAD_ID",
    "ANTIGRAVITY_AGENT",
    "ANTIGRAVITY_PROJECT_ID",
    "AUGMENT_AGENT",
    "CLAUDECODE",
    "CLAUDE_CODE",
    "CLAUDE_CODE_ENTRYPOINT",
    "CLAUDE_CODE_EXECPATH",
    "CLAUDE_CODE_IS_COWORK",
    "CLAUDE_CODE_SESSION_ID",
    "CLINE_ACTIVE",
    "CLINE_TASK_ID",
    "CODEBUDDY",
    "CODEBUDDY_PROJECT_DIR",
    "CODEBUDDY_SESSION_ID",
    "CODEX_CI",
    "CODEX_ROOT",
    "CODEX_SANDBOX",
    "CODEX_SANDBOX_NETWORK_DISABLED",
    "CODEX_THREAD_ID",
    "COPILOT_AGENT",
    "COPILOT_AGENT_JOB_ID",
    "COPILOT_AGENT_SESSION_ID",
    "COPILOT_CLI",
    "CRUSH",
    "CURSOR_AGENT",
    "CURSOR_SANDBOX",
    "CURSOR_TRACE_ID",
    "FIREBENDER_TERMINAL",
    "GEMINI_CLI",
    "GOOSE_TERMINAL",
    "IFLOW_CLI",
    "KIRO_AGENT_PATH",
    "OPENCODE",
    "OPENCODE_APP_INFO",
    "OPENCODE_BIN_PATH",
    "OPENCODE_CLIENT",
    "OPENCODE_MODES",
    "OPENCODE_PID",
    "OPENCODE_SERVER",
    "OZ_RUN_ID",
    "PI_CODING_AGENT",
    "QWEN_CODE",
    "ROO_CODE_TASK_ID",
    "TRAE_AI_SHELL_ID",
    "VECLI_DIR",
    "VECLI_SANDBOX",
]

const NONBLANK_ENV_VARS = [
    "CODEX_SESSION_ID",
    "GROK_SESSION_ID",
    "HERMES_SESSION_ID",
    "JUNIE_SHIM_PATH",
    "PI_SESSION_ID",
]

const EXACT_ENV_VALUES = [
    ["CLAUDE_CODE_CHILD_SESSION", "1"],
    ["DSH_SHELL", "1"],
    ["HERMES_AGENT", "true"],
    ["KILO", "1"],
    ["OPENCLAW_SHELL", "exec"],
    ["VTCODE", "1"],
] as const

const INSTRUCTION_FILES = [
    "AGENTS.md",
    "AGENTS.override.md",
    "CLAUDE.md",
    "GEMINI.md",
    "CONVENTIONS.md",
    ".aider.conf.yml",
    ".cursorrules",
    ".windsurfrules",
    ".clinerules",
    ".roorules",
    ".github/copilot-instructions.md",
    ".junie/AGENTS.md",
    ".junie/playbook.md",
    ".junie/guidelines.md",
]

const INSTRUCTION_GLOBS = [
    ".github/instructions/**/*.instructions.md",
    ".cursor/rules/**/*.mdc",
    ".devin/rules/**/*.md",
    ".windsurf/rules/**/*.md",
    ".clinerules/**/*.md",
    ".cline/rules/**/*.md",
    ".roo/rules/**/*",
    ".roo/rules-*/**/*",
    ".roorules-*",
    ".continue/rules/**/*.md",
    ".amazonq/rules/**/*.md",
    ".junie/rules/*.md",
    ".junie/guidelines/**/*",
]

export class AgentDetector {
    private _isDetected = false

    async detect(): Promise<void> {
        const isAiEnv = this._isAiEnv()
        const hasAiInstructions = await this._hasAiInstructions()
        if (isAiEnv && !hasAiInstructions) {
            await this._createAgentsMd()
        }
        this._isDetected = isAiEnv || hasAiInstructions
    }

    get isDetected(): boolean {
        return this._isDetected
    }

    private _isAiEnv(): boolean {
        return (
            this._envIsNonempty(NONEMPTY_ENV_VARS) ||
            this._envIsNonblank(NONBLANK_ENV_VARS) ||
            this._envEquals(EXACT_ENV_VALUES) ||
            this._envIsEnabled(["AGENT", "AI_AGENT"]) ||
            (process.env["CURSOR_EXTENSION_HOST_ROLE"] ?? "").trim() === "agent-exec" ||
            this._envContains(["AWS_EXECUTION_ENV"], "AmazonQ-For-CLI") ||
            (this._envIsNonempty(["AGENT_CONTEXT_OUT"]) &&
                this._envIsNonempty(["AGENT_DISPLAY_OUT"])) ||
            this._envContains(["PS1", "PROMPT_COMMAND"], "###PS1JSON###")
        )
    }

    private async _hasAiInstructions(): Promise<boolean> {
        for (const name of INSTRUCTION_FILES) {
            if (await this._isFile(name)) {
                return true
            }
        }
        for (const pattern of INSTRUCTION_GLOBS) {
            for (const path of await glob(pattern)) {
                if (await this._isFile(path)) {
                    return true
                }
            }
        }
        return false
    }

    private async _isFile(path: string): Promise<boolean> {
        try {
            return (await stat(join(process.cwd(), path))).isFile()
        } catch {
            return false
        }
    }

    private async _createAgentsMd(): Promise<void> {
        try {
            await writeFile(
                join(process.cwd(), "AGENTS.md"),
                "See the [pksb3 documentation](https://aspiz.uk/pksb3/docs).\n",
                {flag: "wx"},
            )
        } catch {}
    }

    private _envIsNonempty(names: readonly string[]): boolean {
        return names.some((name) => (process.env[name] ?? "") !== "")
    }

    private _envIsNonblank(names: readonly string[]): boolean {
        return names.some((name) => (process.env[name] ?? "").trim() !== "")
    }

    private _envEquals(values: readonly (readonly [string, string])[]): boolean {
        return values.some(([name, expected]) => process.env[name] === expected)
    }

    private _envIsEnabled(names: readonly string[]): boolean {
        return names.some((name) => {
            const value = (process.env[name] ?? "").trim()
            return (
                value !== "" &&
                !["0", "false", "no", "off"].includes(value.toLowerCase())
            )
        })
    }

    private _envContains(names: readonly string[], marker: string): boolean {
        return names.some((name) => (process.env[name] ?? "").includes(marker))
    }
}

export const agentDetector = new AgentDetector()

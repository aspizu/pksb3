#!/usr/bin/env node
import {agentDetector} from "./agent-detector.ts"
import {application} from "./application.ts"

await agentDetector.detect()
await application.run()

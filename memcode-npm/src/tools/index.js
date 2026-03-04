"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.MCPServer = void 0;
exports.runServer = runServer;
const readline = __importStar(require("readline"));
class MCPServer {
    constructor(loader) {
        this.tools = new Map();
        this.loader = loader;
        this.registerTools();
    }
    registerTools() {
        // Tool: memory_code_read
        this.tools.set("memory_code_read", {
            description: "Read file content from memory",
            inputSchema: {
                type: "object",
                properties: {
                    path: { type: "string", description: "File path (relative or absolute)" },
                },
                required: ["path"],
            },
            handler: async (params) => {
                const content = this.loader.read(params.path);
                if (content === null) {
                    return { content: [{ type: "text", text: `File not found: ${params.path}` }] };
                }
                return { content: [{ type: "text", text: content }] };
            },
        });
        // Tool: memory_code_grep
        this.tools.set("memory_code_grep", {
            description: "Search for pattern in code",
            inputSchema: {
                type: "object",
                properties: {
                    pattern: { type: "string", description: "Regex pattern to search for" },
                    path: { type: "string", description: "Optional file path to search in" },
                },
                required: ["pattern"],
            },
            handler: async (params) => {
                const results = this.loader.grep(params.pattern, params.path);
                if (results.length === 0) {
                    return { content: [{ type: "text", text: JSON.stringify([{ message: `No matches found for: ${params.pattern}` }]) }] };
                }
                const maxResults = 1000;
                const limitedResults = results.slice(0, maxResults);
                if (results.length > maxResults) {
                    limitedResults.push({ message: `... and ${results.length - maxResults} more matches (truncated)` });
                }
                return { content: [{ type: "text", text: JSON.stringify(limitedResults) }] };
            },
        });
        // Tool: memory_code_glob
        this.tools.set("memory_code_glob", {
            description: "Find files matching pattern",
            inputSchema: {
                type: "object",
                properties: {
                    pattern: { type: "string", description: "Glob pattern (e.g., '*.ts', 'src/**/*.js')" },
                },
                required: ["pattern"],
            },
            handler: async (params) => {
                const results = this.loader.glob(params.pattern);
                if (results.length === 0) {
                    return { content: [{ type: "text", text: JSON.stringify([`No files match pattern: ${params.pattern}`]) }] };
                }
                return { content: [{ type: "text", text: JSON.stringify(results) }] };
            },
        });
        // Tool: memory_code_stats
        this.tools.set("memory_code_stats", {
            description: "Get code loading statistics",
            inputSchema: { type: "object", properties: {} },
            handler: async () => {
                const stats = this.loader.getStats();
                const sizeMb = stats.totalSize / (1024 * 1024);
                return { content: [{ type: "text", text: JSON.stringify({ ...stats, totalSizeMb: Math.round(sizeMb * 100) / 100 }) }] };
            },
        });
    }
    async run() {
        const rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            terminal: false,
        });
        let buffer = "";
        rl.on("line", async (line) => {
            buffer += line;
            try {
                const msg = JSON.parse(buffer);
                buffer = "";
                const response = await this.handleMessage(msg);
                if (response) {
                    console.log(JSON.stringify(response));
                }
            }
            catch {
                // Wait for more input
            }
        });
    }
    async handleMessage(msg) {
        const id = msg.id;
        if (msg.method === "initialize") {
            return {
                jsonrpc: "2.0",
                id,
                result: {
                    protocolVersion: "2024-11-05",
                    capabilities: { tools: {} },
                    serverInfo: { name: "memcode", version: "1.0.0" },
                },
            };
        }
        if (msg.method === "tools/list") {
            const tools = Array.from(this.tools.entries()).map(([name, tool]) => ({
                name,
                description: tool.description,
                inputSchema: tool.inputSchema,
            }));
            return { jsonrpc: "2.0", id, result: { tools } };
        }
        if (msg.method === "tools/call") {
            const toolName = msg.params.name;
            const toolArgs = msg.params.arguments || {};
            const tool = this.tools.get(toolName);
            if (!tool) {
                return { jsonrpc: "2.0", id, error: { code: -32601, message: `Tool not found: ${toolName}` } };
            }
            try {
                const result = await tool.handler(toolArgs);
                return { jsonrpc: "2.0", id, result };
            }
            catch (error) {
                return { jsonrpc: "2.0", id, error: { code: -32603, message: String(error) } };
            }
        }
        return null;
    }
}
exports.MCPServer = MCPServer;
async function runServer(loader) {
    const server = new MCPServer(loader);
    await server.run();
}

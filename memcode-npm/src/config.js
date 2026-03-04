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
exports.parseArgs = parseArgs;
const commander_1 = require("commander");
const path = __importStar(require("path"));
function parseArgs(argv) {
    const program = new commander_1.Command();
    program
        .name('memcode')
        .description('MCP Server that loads code into memory')
        .requiredOption('-p, --path <path>', 'Path to the code directory to load')
        .option('--port <port>', 'Server port', '8765')
        .option('--exclude <dirs>', 'Comma-separated directories to exclude', '.git,node_modules,__pycache__,venv,.venv')
        .option('--include <exts>', 'Comma-separated file extensions to include', '.py,.js,.ts,.jsx,.tsx,.go,.java,.c,.cpp,.h,.rs,.md,.json,.yaml,.yml')
        .option('--watch', 'Enable file watching for live reload', true)
        .option('--no-watch', 'Disable file watching')
        .option('--debounce <ms>', 'Debounce delay in milliseconds', '500');
    program.parse(argv);
    const options = program.opts();
    // Validate path
    const codePath = path.resolve(options.path);
    const fs = require('fs');
    if (!fs.existsSync(codePath)) {
        throw new Error(`Path does not exist: ${codePath}`);
    }
    const stats = fs.statSync(codePath);
    if (!stats.isDirectory()) {
        throw new Error(`Path is not a directory: ${codePath}`);
    }
    // Parse exclude dirs
    const excludeDirs = options.exclude.split(',').map((d) => d.trim());
    // Parse include extensions
    const includeExtensions = options.include.split(',').map((e) => e.trim());
    // Handle watch option
    const watchEnabled = options.watch && !program.opts().noWatch;
    return {
        codePath,
        port: parseInt(options.port, 10),
        excludeDirs,
        includeExtensions,
        watchEnabled,
        debounceMs: parseInt(options.debounce, 10),
    };
}

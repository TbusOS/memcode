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
exports.CodeLoader = void 0;
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const chokidar = __importStar(require("chokidar"));
const events_1 = require("events");
class CodeLoader extends events_1.EventEmitter {
    constructor(codePath, excludeDirs, includeExtensions, watchEnabled = true, debounceMs = 500) {
        super();
        this.codebase = new Map();
        this.watcher = null;
        // Stats
        this._fileCount = 0;
        this._totalSize = 0;
        this._loadTime = 0;
        this.codePath = path.resolve(codePath);
        this.excludeDirs = new Set(excludeDirs);
        this.includeExtensions = new Set(includeExtensions);
        this.watchEnabled = watchEnabled;
        this.debounceMs = debounceMs;
    }
    /**
     * Load all code files into memory
     */
    load() {
        const startTime = Date.now();
        this.codebase.clear();
        this._fileCount = 0;
        this._totalSize = 0;
        this.walkDirectory(this.codePath);
        this._loadTime = Date.now() - startTime;
        // Start file watching
        if (this.watchEnabled) {
            this.startWatching();
        }
        return this.getStats();
    }
    /**
     * Walk directory and load files
     */
    walkDirectory(dirPath) {
        let entries;
        try {
            entries = fs.readdirSync(dirPath, { withFileTypes: true });
        }
        catch (error) {
            console.warn(`Warning: Cannot read directory: ${dirPath}`);
            return;
        }
        for (const entry of entries) {
            const fullPath = path.join(dirPath, entry.name);
            if (entry.isDirectory()) {
                // Skip excluded directories
                if (this.excludeDirs.has(entry.name)) {
                    continue;
                }
                this.walkDirectory(fullPath);
            }
            else if (entry.isFile()) {
                // Check if file should be included
                const ext = path.extname(entry.name);
                if (this.includeExtensions.has(ext)) {
                    this.loadFile(fullPath);
                }
            }
        }
    }
    /**
     * Load a single file into memory
     */
    loadFile(filePath) {
        try {
            const relativePath = path.relative(this.codePath, filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            this.codebase.set(relativePath, content);
            this._fileCount++;
            this._totalSize += content.length;
        }
        catch (error) {
            console.warn(`Warning: Failed to load file: ${filePath}`);
        }
    }
    /**
     * Check if file should be included
     */
    shouldInclude(filePath) {
        const relativePath = path.relative(this.codePath, filePath);
        const parts = relativePath.split(path.sep);
        // Check if any part is in exclude dirs
        if (parts.some(part => this.excludeDirs.has(part))) {
            return false;
        }
        // Check extension
        const ext = path.extname(filePath);
        return this.includeExtensions.has(ext);
    }
    /**
     * Read file content from memory
     */
    read(filePath) {
        // Try direct match first
        if (this.codebase.has(filePath)) {
            return this.codebase.get(filePath);
        }
        // Try as relative path
        try {
            const relativePath = path.relative(this.codePath, path.resolve(filePath));
            return this.codebase.get(relativePath) || null;
        }
        catch {
            return null;
        }
    }
    /**
     * Search for pattern in code
     */
    grep(pattern, filePath) {
        const results = [];
        const regex = new RegExp(pattern);
        const filesToSearch = filePath
            ? new Map([[filePath, this.codebase.get(filePath)]].filter((v) => v[1] !== undefined))
            : this.codebase;
        for (const [filename, content] of filesToSearch) {
            const lines = content.split('\n');
            for (let i = 0; i < lines.length; i++) {
                if (regex.test(lines[i])) {
                    results.push({
                        file: filename,
                        line: i + 1,
                        content: lines[i].trimEnd(),
                    });
                }
            }
        }
        return results;
    }
    /**
     * Find files matching pattern
     */
    glob(pattern) {
        // Convert glob pattern to regex
        let regexPattern = pattern
            .replace(/\./g, '\\.')
            .replace(/\*\*/g, '.*')
            .replace(/\*/g, '[^/]*')
            .replace(/\?/g, '[^/]');
        regexPattern = `^${regexPattern}$`;
        let regex;
        try {
            regex = new RegExp(regexPattern);
        }
        catch {
            return [];
        }
        const results = [];
        for (const file of this.codebase.keys()) {
            if (regex.test(file)) {
                results.push(file);
            }
        }
        return results.sort();
    }
    /**
     * Get loading statistics
     */
    getStats() {
        return {
            fileCount: this._fileCount,
            totalSize: this._totalSize,
            loadTime: this._loadTime,
            watchEnabled: this.watchEnabled,
            codePath: this.codePath,
        };
    }
    /**
     * Reload a single file
     */
    reloadFile(filePath) {
        if (!this.shouldInclude(filePath)) {
            return;
        }
        try {
            const relativePath = path.relative(this.codePath, filePath);
            const oldSize = this.codebase.get(relativePath)?.length || 0;
            const content = fs.readFileSync(filePath, 'utf-8');
            this.codebase.set(relativePath, content);
            this._totalSize = this._totalSize - oldSize + content.length;
            this.emit('change', 'modified', relativePath);
        }
        catch (error) {
            console.warn(`Warning: Failed to reload file: ${filePath}`);
        }
    }
    /**
     * Add a new file
     */
    addFile(filePath) {
        if (!this.shouldInclude(filePath)) {
            return;
        }
        try {
            const relativePath = path.relative(this.codePath, filePath);
            const content = fs.readFileSync(filePath, 'utf-8');
            this.codebase.set(relativePath, content);
            this._fileCount = this.codebase.size;
            this._totalSize += content.length;
            this.emit('change', 'added', relativePath);
        }
        catch (error) {
            console.warn(`Warning: Failed to add file: ${filePath}`);
        }
    }
    /**
     * Remove a file
     */
    removeFile(filePath) {
        try {
            const relativePath = path.relative(this.codePath, filePath);
            if (this.codebase.has(relativePath)) {
                const oldSize = this.codebase.get(relativePath).length;
                this.codebase.delete(relativePath);
                this._fileCount = this.codebase.size;
                this._totalSize -= oldSize;
                this.emit('change', 'deleted', relativePath);
            }
        }
        catch (error) {
            console.warn(`Warning: Failed to remove file: ${filePath}`);
        }
    }
    /**
     * Start watching for file changes
     */
    startWatching() {
        if (this.watcher) {
            return;
        }
        this.watcher = chokidar.watch(this.codePath, {
            persistent: true,
            ignoreInitial: true,
            ignored: (filePath) => {
                // Skip excluded directories
                const relativePath = path.relative(this.codePath, filePath);
                const parts = relativePath.split(path.sep);
                return parts.some(part => this.excludeDirs.has(part));
            },
        });
        // Debounce helper
        const debounceTimers = new Map();
        const debounce = (filePath, fn) => {
            const existing = debounceTimers.get(filePath);
            if (existing) {
                clearTimeout(existing);
            }
            debounceTimers.set(filePath, setTimeout(() => {
                debounceTimers.delete(filePath);
                fn();
            }, this.debounceMs));
        };
        this.watcher
            .on('change', (filePath) => {
            debounce(filePath, () => this.reloadFile(filePath));
        })
            .on('add', (filePath) => {
            debounce(filePath, () => this.addFile(filePath));
        })
            .on('unlink', (filePath) => {
            debounce(filePath, () => this.removeFile(filePath));
        });
        console.log(`File watching enabled for: ${this.codePath}`);
    }
    /**
     * Stop watching for file changes
     */
    stopWatching() {
        if (this.watcher) {
            this.watcher.close();
            this.watcher = null;
        }
    }
}
exports.CodeLoader = CodeLoader;

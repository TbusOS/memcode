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
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
const os = __importStar(require("os"));
const config_1 = require("@src/config");
describe('Config', () => {
    const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memcode-test-'));
    describe('parseArgs()', () => {
        afterAll(() => {
            // Clean up temp directory
            fs.rmSync(tempDir, { recursive: true, force: true });
        });
        it('should parse required --path option', () => {
            const args = ['node', 'memcode', '--path', tempDir];
            const config = (0, config_1.parseArgs)(args);
            expect(config.codePath).toBe(tempDir);
        });
        it('should parse --port option', () => {
            const args = ['node', 'memcode', '--path', tempDir, '--port', '9000'];
            const config = (0, config_1.parseArgs)(args);
            expect(config.port).toBe(9000);
        });
        it('should use default port', () => {
            const args = ['node', 'memcode', '--path', tempDir];
            const config = (0, config_1.parseArgs)(args);
            expect(config.port).toBe(8765);
        });
        it('should parse --exclude option', () => {
            const args = ['node', 'memcode', '--path', tempDir, '--exclude', 'node_modules,.git,dist'];
            const config = (0, config_1.parseArgs)(args);
            expect(config.excludeDirs).toContain('node_modules');
            expect(config.excludeDirs).toContain('.git');
            expect(config.excludeDirs).toContain('dist');
        });
        it('should parse --include option', () => {
            const args = ['node', 'memcode', '--path', tempDir, '--include', '.ts,.js,.tsx'];
            const config = (0, config_1.parseArgs)(args);
            expect(config.includeExtensions).toContain('.ts');
            expect(config.includeExtensions).toContain('.js');
            expect(config.includeExtensions).toContain('.tsx');
        });
        it('should parse --watch option', () => {
            const args = ['node', 'memcode', '--path', tempDir, '--watch'];
            const config = (0, config_1.parseArgs)(args);
            expect(config.watchEnabled).toBe(true);
        });
        it('should parse --no-watch option', () => {
            const args = ['node', 'memcode', '--path', tempDir, '--no-watch'];
            const config = (0, config_1.parseArgs)(args);
            expect(config.watchEnabled).toBe(false);
        });
        it('should parse --debounce option', () => {
            const args = ['node', 'memcode', '--path', tempDir, '--debounce', '1000'];
            const config = (0, config_1.parseArgs)(args);
            expect(config.debounceMs).toBe(1000);
        });
        it('should throw for non-existent path', () => {
            const args = ['node', 'memcode', '--path', '/non/existent/path'];
            expect(() => (0, config_1.parseArgs)(args)).toThrow('Path does not exist');
        });
        it('should throw for non-directory path', () => {
            // Create a temporary file
            const tempFile = path.join(tempDir, 'file.txt');
            fs.writeFileSync(tempFile, 'test');
            const args = ['node', 'memcode', '--path', tempFile];
            expect(() => (0, config_1.parseArgs)(args)).toThrow('Path is not a directory');
        });
    });
});

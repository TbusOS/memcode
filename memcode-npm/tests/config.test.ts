import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { parseArgs } from '@src/config';

describe('Config', () => {
  const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memcode-test-'));

  describe('parseArgs()', () => {
    afterAll(() => {
      // Clean up temp directory
      fs.rmSync(tempDir, { recursive: true, force: true });
    });

    it('should parse required --path option', () => {
      const args = ['node', 'memcode', '--path', tempDir];
      const config = parseArgs(args);

      expect(config.codePath).toBe(tempDir);
    });

    it('should parse --port option', () => {
      const args = ['node', 'memcode', '--path', tempDir, '--port', '9000'];
      const config = parseArgs(args);

      expect(config.port).toBe(9000);
    });

    it('should use default port', () => {
      const args = ['node', 'memcode', '--path', tempDir];
      const config = parseArgs(args);

      expect(config.port).toBe(8765);
    });

    it('should parse --exclude option', () => {
      const args = ['node', 'memcode', '--path', tempDir, '--exclude', 'node_modules,.git,dist'];
      const config = parseArgs(args);

      expect(config.excludeDirs).toContain('node_modules');
      expect(config.excludeDirs).toContain('.git');
      expect(config.excludeDirs).toContain('dist');
    });

    it('should parse --include option', () => {
      const args = ['node', 'memcode', '--path', tempDir, '--include', '.ts,.js,.tsx'];
      const config = parseArgs(args);

      expect(config.includeExtensions).toContain('.ts');
      expect(config.includeExtensions).toContain('.js');
      expect(config.includeExtensions).toContain('.tsx');
    });

    it('should parse --watch option', () => {
      const args = ['node', 'memcode', '--path', tempDir, '--watch'];
      const config = parseArgs(args);

      expect(config.watchEnabled).toBe(true);
    });

    it('should parse --no-watch option', () => {
      const args = ['node', 'memcode', '--path', tempDir, '--no-watch'];
      const config = parseArgs(args);

      expect(config.watchEnabled).toBe(false);
    });

    it('should parse --debounce option', () => {
      const args = ['node', 'memcode', '--path', tempDir, '--debounce', '1000'];
      const config = parseArgs(args);

      expect(config.debounceMs).toBe(1000);
    });

    it('should throw for non-existent path', () => {
      const args = ['node', 'memcode', '--path', '/non/existent/path'];
      expect(() => parseArgs(args)).toThrow('Path does not exist');
    });

    it('should throw for non-directory path', () => {
      // Create a temporary file
      const tempFile = path.join(tempDir, 'file.txt');
      fs.writeFileSync(tempFile, 'test');

      const args = ['node', 'memcode', '--path', tempFile];
      expect(() => parseArgs(args)).toThrow('Path is not a directory');
    });
  });
});

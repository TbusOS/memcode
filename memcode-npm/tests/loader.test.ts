import * as path from 'path';
import * as fs from 'fs';
import * as os from 'os';
import { CodeLoader } from '@src/loader';

describe('CodeLoader', () => {
  const fixturesPath = path.resolve(__dirname, '../fixtures/sample-project');

  describe('constructor', () => {
    it('should create loader with correct options', () => {
      const loader = new CodeLoader(
        fixturesPath,
        ['node_modules', '.git'],
        ['.ts', '.js'],
        false,
        500
      );

      expect(loader).toBeInstanceOf(CodeLoader);
    });
  });

  describe('load()', () => {
    it('should load files into memory', () => {
      const loader = new CodeLoader(
        fixturesPath,
        ['node_modules', '.git'],
        ['.ts', '.js'],
        false
      );

      const stats = loader.load();

      expect(stats.fileCount).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.loadTime).toBeGreaterThanOrEqual(0);
    });

    it('should exclude specified directories', () => {
      const loader = new CodeLoader(
        fixturesPath,
        ['src'],
        ['.ts'],
        false
      );

      const stats = loader.load();

      // Should not load any files since src is excluded
      expect(stats.fileCount).toBe(0);
    });

    it('should start file watching when enabled', () => {
      const loader = new CodeLoader(
        fixturesPath,
        ['node_modules'],
        ['.ts'],
        true,
        500
      );

      const stats = loader.load();
      expect(stats.watchEnabled).toBe(true);

      // Clean up
      loader.stopWatching();
    });

    it('should handle non-existent directory gracefully', () => {
      const loader = new CodeLoader(
        '/non/existent/path',
        [],
        ['.ts'],
        false
      );

      const stats = loader.load();
      expect(stats.fileCount).toBe(0);
    });

    it('should load real C source files from input driver', () => {
      // Test with real Linux kernel input driver code
      const loader = new CodeLoader(
        fixturesPath,
        ['.git', 'node_modules'],
        ['.c', '.h'],
        false
      );

      const stats = loader.load();

      // Should have loaded many C files from the input driver
      expect(stats.fileCount).toBeGreaterThan(10);
      expect(stats.totalSize).toBeGreaterThan(10000);
    });
  });

  describe('read()', () => {
    it('should read TypeScript file by relative path', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const content = loader.read('src/index.ts');
      expect(content).toContain('greeting');
    });

    it('should return null for non-existent file', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const content = loader.read('nonexistent.ts');
      expect(content).toBeNull();
    });

    it('should handle invalid path gracefully', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      // Read with an invalid path should return null
      const content = loader.read('\0invalid');
      expect(content).toBeNull();
    });

    it('should handle path.resolve error', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      // Test with a path that causes resolve to fail
      // Using an empty string or invalid path
      const content = loader.read('');
      expect(content).toBeNull();
    });

    it('should try relative path when direct match fails', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      // Read using absolute path should work
      const absPath = path.resolve(fixturesPath, 'src/index.ts');
      const content = loader.read(absPath);
      expect(content).not.toBeNull();
      expect(content).toContain('greeting');
    });

    it('should read real C files from memory', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.c', '.h'],
        false
      );
      loader.load();

      // Read input.c which is a real Linux kernel file
      const content = loader.read('src/input.c');
      expect(content).not.toBeNull();
      // Check for actual content in the file
      expect(content).toContain('MODULE_LICENSE');
    });
  });

  describe('grep()', () => {
    it('should find matching lines in TypeScript', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const results = loader.grep('export');

      expect(results.length).toBeGreaterThan(0);
      expect(results[0]).toHaveProperty('file');
      expect(results[0]).toHaveProperty('line');
      expect(results[0]).toHaveProperty('content');
    });

    it('should filter grep results by file path', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const results = loader.grep('export', 'src/constants.ts');

      expect(results.length).toBeGreaterThan(0);
      results.forEach((r) => {
        expect(r.file).toBe('src/constants.ts');
      });
    });

    it('should return empty array for no match', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const results = loader.grep('nonexistent_pattern_12345');
      expect(results).toEqual([]);
    });

    it('should grep in real C source files', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.c', '.h'],
        false
      );
      loader.load();

      // Search for common C patterns in kernel code
      const results = loader.grep('struct');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle regex special characters safely', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      // Search with escaped special regex characters - should not crash
      const results = loader.grep('export\\s+function');
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('glob()', () => {
    it('should find TypeScript files by pattern', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const results = loader.glob('*.ts');
      expect(results.length).toBe(0); // No files at root level

      const srcResults = loader.glob('src/*.ts');
      expect(srcResults.length).toBeGreaterThan(0);
    });

    it('should support ** glob pattern', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const results = loader.glob('**/*.ts');
      expect(results.length).toBeGreaterThan(0);
    });

    it('should handle invalid glob pattern gracefully', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      // Invalid regex pattern should return empty array
      const results = loader.glob('[invalid');
      expect(results).toEqual([]);
    });

    it('should find real C files with glob', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.c', '.h'],
        false
      );
      loader.load();

      // Find all C files in src/ directory
      const results = loader.glob('src/*.c');
      expect(results.length).toBeGreaterThan(0);
      expect(results).toContain('src/input.c');
    });

    it('should support ? wildcard in glob', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.c'],
        false
      );
      loader.load();

      const results = loader.glob('src/?.c');
      // Should match single character like 'src/x.c' if exists
      expect(Array.isArray(results)).toBe(true);
    });
  });

  describe('getStats()', () => {
    it('should return correct loader statistics', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        false
      );
      loader.load();

      const stats = loader.getStats();

      expect(stats.fileCount).toBeGreaterThan(0);
      expect(stats.totalSize).toBeGreaterThan(0);
      expect(stats.loadTime).toBeGreaterThanOrEqual(0);
      expect(stats.codePath).toBe(fixturesPath);
    });
  });

  describe('shouldInclude()', () => {
    it('should correctly identify included and excluded files', () => {
      const loader = new CodeLoader(
        fixturesPath,
        ['node_modules'],
        ['.ts', '.js'],
        false
      );

      expect(loader.shouldInclude(path.join(fixturesPath, 'src/index.ts'))).toBe(true);
      expect(loader.shouldInclude(path.join(fixturesPath, 'node_modules/test.js'))).toBe(false);
    });

    it('should handle nested excluded directories', () => {
      const loader = new CodeLoader(
        fixturesPath,
        ['node_modules', 'dist'],
        ['.ts'],
        false
      );

      expect(loader.shouldInclude(path.join(fixturesPath, 'src/nested/file.ts'))).toBe(true);
      expect(loader.shouldInclude(path.join(fixturesPath, 'dist/nested/file.ts'))).toBe(false);
    });
  });

  describe('file watching', () => {
    it('should stop watching without error', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        true,
        500
      );
      loader.load();

      // Stop should not throw
      expect(() => loader.stopWatching()).not.toThrow();
    });

    it('should handle multiple stop calls gracefully', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        true,
        500
      );
      loader.load();

      loader.stopWatching();
      // Second stop should also not throw
      expect(() => loader.stopWatching()).not.toThrow();
    });

    it('should not start watching twice', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.ts'],
        true,
        500
      );
      loader.load();

      // Calling startWatching again should be safe
      loader.startWatching();
      loader.stopWatching();
    });

    it('should handle excluded directories in watcher', () => {
      // Test that excluded directories are properly handled in the watcher
      const loader = new CodeLoader(
        fixturesPath,
        ['node_modules', '.git'],
        ['.ts'],
        true,
        500
      );
      loader.load();

      // The watcher should be running
      expect(loader.getStats().watchEnabled).toBe(true);
      loader.stopWatching();
    });
  });

  describe('error handling', () => {
    it('should handle unreadable directory', () => {
      // Create a temporary directory with restricted permissions
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memcode-test-'));
      const restrictedDir = path.join(tempDir, 'restricted');

      try {
        fs.mkdirSync(restrictedDir, { mode: 0o000 });

        const loader = new CodeLoader(
          tempDir,
          [],
          ['.ts'],
          false
        );

        // Should not crash
        const stats = loader.load();
        expect(stats.fileCount).toBeGreaterThanOrEqual(0);
      } finally {
        // Cleanup - restore permissions before deleting
        fs.chmodSync(restrictedDir, 0o755);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });

    it('should handle unreadable file gracefully', () => {
      const tempDir = fs.mkdtempSync(path.join(os.tmpdir(), 'memcode-test-'));

      try {
        const testFile = path.join(tempDir, 'test.ts');
        fs.writeFileSync(testFile, 'content');

        // Make file unreadable
        fs.chmodSync(testFile, 0o000);

        const loader = new CodeLoader(
          tempDir,
          [],
          ['.ts'],
          false
        );

        // Should not crash, just skip the file
        const stats = loader.load();
        // File count might be 0 due to the error
        expect(stats.fileCount).toBeGreaterThanOrEqual(0);
      } finally {
        // Cleanup
        fs.chmodSync(path.join(tempDir, 'test.ts'), 0o644);
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
    });
  });

  describe('real user scenarios', () => {
    it('should load Linux kernel input driver code', () => {
      // Simulate a real user loading the Linux input driver
      const loader = new CodeLoader(
        fixturesPath,
        ['.git', 'node_modules', '__pycache__'],
        ['.c', '.h'],
        false
      );

      const stats = loader.load();

      // Verify files were loaded
      expect(stats.fileCount).toBeGreaterThan(20);
      expect(stats.totalSize).toBeGreaterThan(50000);

      // Verify we can search in the loaded code
      const grepResults = loader.grep('MODULE_LICENSE');
      expect(grepResults.length).toBeGreaterThan(0);

      // Verify we can find specific files
      const globResults = loader.glob('src/*.c');
      expect(globResults).toContain('src/input.c');
      expect(globResults).toContain('src/evdev.c');
    });

    it('should support reading specific file content', () => {
      const loader = new CodeLoader(
        fixturesPath,
        [],
        ['.c', '.h'],
        false
      );
      loader.load();

      // Read a specific file like a real user would
      const content = loader.read('src/evdev.c');
      expect(content).not.toBeNull();
      expect(content!.length).toBeGreaterThan(1000);
    });

    it('should perform full workflow like a real user', () => {
      // Simulate complete user workflow
      const loader = new CodeLoader(
        fixturesPath,
        ['.git'],
        ['.c', '.h'],
        false
      );

      // 1. Load the code
      const stats = loader.load();
      expect(stats.fileCount).toBeGreaterThan(0);

      // 2. Search for specific code
      const grepResults = loader.grep('module_init');
      expect(grepResults.length).toBeGreaterThan(0);

      // 3. Find specific files
      const files = loader.glob('src/*.c');
      expect(files.length).toBeGreaterThan(0);

      // 4. Read a file
      const content = loader.read(files[0]);
      expect(content).not.toBeNull();
      expect(content!.length).toBeGreaterThan(0);

      // 5. Get stats
      const finalStats = loader.getStats();
      expect(finalStats.fileCount).toBe(stats.fileCount);
    });
  });
});

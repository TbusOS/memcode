import * as fs from 'fs';
import * as path from 'path';
import * as chokidar from 'chokidar';
import { EventEmitter } from 'events';

export interface LoaderStats {
  fileCount: number;
  totalSize: number;
  loadTime: number;
  watchEnabled: boolean;
  codePath: string;
}

export class CodeLoader extends EventEmitter {
  private codebase: Map<string, string> = new Map();
  private codePath: string;
  private excludeDirs: Set<string>;
  private includeExtensions: Set<string>;
  private watchEnabled: boolean;
  private debounceMs: number;
  private watcher: chokidar.FSWatcher | null = null;

  // Stats
  private _fileCount = 0;
  private _totalSize = 0;
  private _loadTime = 0;

  constructor(
    codePath: string,
    excludeDirs: string[],
    includeExtensions: string[],
    watchEnabled: boolean = true,
    debounceMs: number = 500
  ) {
    super();
    this.codePath = path.resolve(codePath);
    this.excludeDirs = new Set(excludeDirs);
    this.includeExtensions = new Set(includeExtensions);
    this.watchEnabled = watchEnabled;
    this.debounceMs = debounceMs;
  }

  /**
   * Load all code files into memory
   */
  load(): LoaderStats {
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
  private walkDirectory(dirPath: string): void {
    let entries: fs.Dirent[];
    try {
      entries = fs.readdirSync(dirPath, { withFileTypes: true });
    } catch (error) {
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
      } else if (entry.isFile()) {
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
  private loadFile(filePath: string): void {
    try {
      const relativePath = path.relative(this.codePath, filePath);
      const content = fs.readFileSync(filePath, 'utf-8');
      this.codebase.set(relativePath, content);
      this._fileCount++;
      this._totalSize += content.length;
    } catch (error) {
      console.warn(`Warning: Failed to load file: ${filePath}`);
    }
  }

  /**
   * Check if file should be included
   */
  shouldInclude(filePath: string): boolean {
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
  read(filePath: string): string | null {
    // Try direct match first
    if (this.codebase.has(filePath)) {
      return this.codebase.get(filePath)!;
    }

    // Try as relative path
    try {
      const relativePath = path.relative(this.codePath, path.resolve(filePath));
      return this.codebase.get(relativePath) || null;
    } catch {
      return null;
    }
  }

  /**
   * Search for pattern in code
   */
  grep(pattern: string, filePath?: string): Array<{ file: string; line: number; content: string }> {
    const results: Array<{ file: string; line: number; content: string }> = [];
    const regex = new RegExp(pattern);

    const filesToSearch = filePath
      ? new Map([[filePath, this.codebase.get(filePath)]].filter((v): v is [string, string] => v[1] !== undefined))
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
  glob(pattern: string): string[] {
    // Convert glob pattern to regex
    let regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '.*')
      .replace(/\*/g, '[^/]*')
      .replace(/\?/g, '[^/]');

    regexPattern = `^${regexPattern}$`;

    let regex: RegExp;
    try {
      regex = new RegExp(regexPattern);
    } catch {
      return [];
    }

    const results: string[] = [];
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
  getStats(): LoaderStats {
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
  private reloadFile(filePath: string): void {
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
    } catch (error) {
      console.warn(`Warning: Failed to reload file: ${filePath}`);
    }
  }

  /**
   * Add a new file
   */
  private addFile(filePath: string): void {
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
    } catch (error) {
      console.warn(`Warning: Failed to add file: ${filePath}`);
    }
  }

  /**
   * Remove a file
   */
  private removeFile(filePath: string): void {
    try {
      const relativePath = path.relative(this.codePath, filePath);
      if (this.codebase.has(relativePath)) {
        const oldSize = this.codebase.get(relativePath)!.length;
        this.codebase.delete(relativePath);
        this._fileCount = this.codebase.size;
        this._totalSize -= oldSize;

        this.emit('change', 'deleted', relativePath);
      }
    } catch (error) {
      console.warn(`Warning: Failed to remove file: ${filePath}`);
    }
  }

  /**
   * Start watching for file changes
   */
  startWatching(): void {
    if (this.watcher) {
      return;
    }

    this.watcher = chokidar.watch(this.codePath, {
      persistent: true,
      ignoreInitial: true,
      ignored: (filePath: string) => {
        // Skip excluded directories
        const relativePath = path.relative(this.codePath, filePath);
        const parts = relativePath.split(path.sep);
        return parts.some(part => this.excludeDirs.has(part));
      },
    });

    // Debounce helper
    const debounceTimers = new Map<string, NodeJS.Timeout>();

    const debounce = (filePath: string, fn: () => void) => {
      const existing = debounceTimers.get(filePath);
      if (existing) {
        clearTimeout(existing);
      }
      debounceTimers.set(
        filePath,
        setTimeout(() => {
          debounceTimers.delete(filePath);
          fn();
        }, this.debounceMs)
      );
    };

    this.watcher
      .on('change', (filePath: string) => {
        debounce(filePath, () => this.reloadFile(filePath));
      })
      .on('add', (filePath: string) => {
        debounce(filePath, () => this.addFile(filePath));
      })
      .on('unlink', (filePath: string) => {
        debounce(filePath, () => this.removeFile(filePath));
      });

    console.log(`File watching enabled for: ${this.codePath}`);
  }

  /**
   * Stop watching for file changes
   */
  stopWatching(): void {
    if (this.watcher) {
      this.watcher.close();
      this.watcher = null;
    }
  }
}

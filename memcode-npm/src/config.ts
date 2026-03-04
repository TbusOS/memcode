import { Command } from 'commander';
import * as path from 'path';

export interface Config {
  codePath: string;
  port: number;
  excludeDirs: string[];
  includeExtensions: string[];
  watchEnabled: boolean;
  debounceMs: number;
}

export function parseArgs(argv: string[]): Config {
  const program = new Command();

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
  const excludeDirs = options.exclude.split(',').map((d: string) => d.trim());

  // Parse include extensions
  const includeExtensions = options.include.split(',').map((e: string) => e.trim());

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

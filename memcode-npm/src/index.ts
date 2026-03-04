#!/usr/bin/env node

import { parseArgs, Config } from './config';
import { CodeLoader } from './loader';
import { runServer } from './tools/index';

async function main(): Promise<void> {
  let config: Config;

  try {
    config = parseArgs(process.argv);
  } catch (error) {
    console.error('Error:', error instanceof Error ? error.message : 'Invalid arguments');
    process.exit(1);
  }

  console.log('memcode starting...');
  console.log(`  Code path: ${config.codePath}`);
  console.log(`  Watch: ${config.watchEnabled}`);

  // Create loader
  const loader = new CodeLoader(
    config.codePath,
    config.excludeDirs,
    config.includeExtensions,
    config.watchEnabled,
    config.debounceMs
  );

  // Register change callback
  loader.on('change', (action: string, filepath: string) => {
    console.log(`  [Change detected] ${action}: ${filepath}`);
  });

  // Load code into memory
  console.log('\nLoading code into memory...');
  const stats = loader.load();

  console.log(`  Files loaded: ${stats.fileCount}`);
  console.log(`  Total size: ${(stats.totalSize / (1024 * 1024)).toFixed(2)} MB`);
  console.log(`  Load time: ${stats.loadTime}ms`);
  console.log(`  Watch enabled: ${stats.watchEnabled}`);

  // Handle shutdown
  const shutdown = () => {
    console.log('\nShutting down...');
    loader.stopWatching();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Run server
  console.log('\nStarting MCP server...');
  await runServer(loader);
}

main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

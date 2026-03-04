# Memcode Technical Documentation

## Overview

This document explains the core principles of memcode's implementation, why MCP is used, and how the system works internally.

## Problem Statement

When Claude Code reads code files through the filesystem, it needs to perform disk I/O operations repeatedly. For large codebases, this can be slow and inefficient.

**Solution**: Load all code into memory once, then serve file content directly from memory instead of reading from disk every time.

## Architecture

### Core Components

```
┌─────────────────────────────────────────────────────────────────┐
│                        Claude Code                               │
│                     (VSCode Extension)                          │
└──────────────────────────┬──────────────────────────────────────┘
                          │ stdio (stdin/stdout)
                          │ JSON-RPC 2.0
┌──────────────────────────▼──────────────────────────────────────┐
│                          memcode                                 │
│  ┌─────────────────────────────────────────────────────────┐   │
│  │                    MCP Protocol Layer                    │   │
│  │         (JSON-RPC request/response handling)            │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────────────┐   │
│  │                   In-Memory File Cache                  │   │
│  │   ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐    │   │
│  │   │ file1   │ │ file2   │ │ file3   │ │ fileN   │    │   │
│  │   │ .go     │ │ .ts     │ │ .py     │ │ .md     │    │   │
│  │   └─────────┘ └─────────┘ └─────────┘ └─────────┘    │   │
│  └────────────────────────┬────────────────────────────────┘   │
│                          │                                      │
│  ┌───────────────────────▼────────────────────────────────┐   │
│  │                  File Watcher (Optional)                 │   │
│  │              (fsnotify / chokidar)                      │   │
│  └─────────────────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────────────────┘
```

### Communication Flow

```
1. Claude Code wants to read a file
      │
      ▼
2. Sends JSON-RPC request via stdin
   {
     "jsonrpc": "2.0",
     "id": 1,
     "method": "tools/call",
     "params": {
       "name": "memory_code_read",
       "arguments": { "path": "src/main.go" }
     }
   }
      │
      ▼
3. memcode receives the request
      │
      ▼
4. Looks up file content from in-memory cache
      │
      ▼
5. Returns result via stdout
   {
     "jsonrpc": "2.0",
     "id": 1,
     "result": {
       "content": "package main\n..."
     }
   }
```

## Why MCP?

### Is MCP Required?

**No.** MCP is not strictly required. The core functionality can be implemented without MCP:

```
# Without MCP - custom protocol
echo '{"path": "src/main.go"}' | ./memcode --protocol custom
```

### Why We Use MCP Anyway

| Aspect | Without MCP | With MCP |
|--------|-------------|----------|
| Protocol | Custom design | Industry standard |
| Integration | Manual implementation | Built-in support |
| Configuration | Complex | Simple JSON |
| Ecosystem | Locked in | Interoperable |
| Documentation | Write from scratch | Follow conventions |

**In summary**: MCP provides a standardized way to:
1. Define available tools
2. Handle request/response format
3. Integrate with Claude Code seamlessly

## Available Tools

Memcode exposes these MCP tools:

### 1. memory_code_read

Read file content from memory cache.

```typescript
// Parameters
{
  path: string  // Relative or absolute file path
}

// Response
{
  content: string,  // File content
  size: number      // File size in bytes
}
```

### 2. memory_code_grep

Search for patterns in cached files.

```typescript
// Parameters
{
  pattern: string,   // Regex pattern
  path?: string      // Optional: search in specific directory
}

// Response
{
  matches: Array<{
    file: string,
    line: number,
    content: string
  }>
}
```

### 3. memory_code_glob

Find files matching a glob pattern.

```typescript
// Parameters
{
  pattern: string  // Glob pattern (e.g., "src/**/*.ts")
}

// Response
{
  files: string[]  // List of matching file paths
}
```

### 4. memory_code_stats

Get cache statistics.

```typescript
// Response
{
  totalFiles: number,
  totalSize: number,
  lastReload: string  // ISO timestamp
}
```

## Implementation Details

### Go Version

**File Loading**: Walk directory recursively, read files into `map[string]string`

**File Watching**: Uses `fsnotify` library to monitor file changes

**MCP Protocol**: Custom JSON-RPC 2.0 implementation over stdio

### npm/TypeScript Version

**File Loading**: Uses `fast-glob` for file discovery

**File Watching**: Uses `chokidar` for cross-platform file watching

**MCP Protocol**: Uses `@modelcontextprotocol/server` SDK

## Performance Characteristics

| Operation | Disk I/O | In-Memory |
|-----------|----------|-----------|
| Read file | ~1-10ms | ~0.01ms |
| Grep | ~10-100ms | ~1-10ms |
| Glob | ~5-50ms | ~0.1-1ms |

**Typical improvement**: 10-100x faster for repeated operations

## Memory Usage

In-memory storage typically uses **1.5-3x more memory** than the original file size.

### Overhead Sources

| Source | Description |
|--------|-------------|
| **String copies** | Go's string is immutable, data is copied on read |
| **Map keys** | File paths stored as keys |
| **Map load factor** | Go map ~15% empty space |
| **String headers** | 16-32 bytes overhead per string |

### Example

For a 10MB codebase:

| Item | Size |
|------|------|
| Source files | 10 MB |
| Memory usage (estimated) | 15-25 MB |
| Additional overhead | 5-15 MB |

### Trade-off

```
Reading a file 1000 times:
  Disk I/O: 1000 × ~5ms = 5 seconds
  Memory:   1000 × ~0.01ms = 0.01 seconds
```

The extra memory cost is worth it for 100-500x faster read speeds in code editing scenarios.

### Optimization Tips

If memory is a bottleneck:

1. **Reduce included file types** - Use `--include` to load only core code
2. **Exclude large directories** - Use `--exclude` to skip test, vendor, etc.
3. **Future** - LRU eviction strategy to keep only recently accessed files

## Configuration

### Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--path` | (required) | Code directory path |
| `--exclude` | .git,node_modules,__pycache__,venv | Directories to exclude |
| `--include` | .js,.ts,.jsx,.tsx,.py,.go,.java,.c,.cpp,.h,.rs,.md,.json | File extensions to include |
| `--watch` | true | Enable file watching |
| `--no-watch` | - | Disable file watching |
| `--debounce` | 500 | Debounce delay (ms) |

### Example

```bash
# Load /path/to/project into memory
./memcode --path /path/to/project

# Exclude additional directories
./memcode --path /path/to/project --exclude .git,node_modules,vendor

# Only include specific extensions
./memcode --path /path/to/project --include .go,.ts,.py
```

## Limitations

1. **Initial Load**: First load takes time proportional to codebase size
2. **Sync Delay**: File watcher may have slight delay before updates reflect in cache
3. **Binary Files**: Not recommended for large binary files

## Future Enhancements

- Lazy loading for large codebases
- Incremental updates
- LRU cache eviction
- Distributed caching

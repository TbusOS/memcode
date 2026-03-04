# Memcode npm

MCP Server that loads code into memory for faster access by Claude Code in VSCode.

## Why memcode npm?

- **Faster access**: Code is loaded into memory, no repeated disk I/O
- **Live reload**: File changes are automatically detected and updated
- **Easy install**: Use npm or npx directly
- **VSCode ready**: Works with Claude Code in VSCode

## Installation

### Option 1: Run directly with npx (Recommended)

```bash
npx memcode --path /your/code/path
```

### Option 2: Install globally

```bash
npm install -g memcode
memcode --path /your/code/path
```

### Option 3: Build from source

```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-npm
npm install
npm run build
node dist/index.js --path /your/code/path
```

### Option 4: Build executable yourself

```bash
cd memcode-npm
npm install -D pkg
npm run build:exe
```

## Usage

### 1. Start the server

```bash
# Using npx
npx memcode --path /your/code/path

# Using node
node dist/index.js --path /your/code/path

# Using installed binary
memcode --path /your/code/path
```

### 2. Configure MCP

MCP server configuration needs to be added to VSCode settings. Choose one of the following:

#### Option 1: Project-level config (Recommended)

Create or edit `.vscode/settings.json` in your project root:

**File path:**
- Windows: `C:\your\project\path\.vscode\settings.json`
- macOS/Linux: `/your/project/path/.vscode/settings.json`

**Using npx:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "npx",
      "args": ["memcode", "--path", "your/code/path"]
    }
  }
}
```

**Windows Example:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "npx",
      "args": ["memcode", "--path", "D:\\projects\\myapp"]
    }
  }
}
```

**macOS/Linux Example:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "npx",
      "args": ["memcode", "--path", "/Users/zhangsan/projects/myapp"]
    }
  }
}
```

**If installed globally:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "memcode",
      "args": ["--path", "your/code/path"]
    }
  }
}
```

#### Option 2: Global config

To use memcode in all projects, configure global settings:

**File path:**
- Windows: `C:\Users\your-username\AppData\Roaming\Code\User\settings.json`
- macOS: `~/Library/Application Support/Code/User/settings.json`
- Linux: `~/.config/Code/User/settings.json`

### 3. Configure Claude CLI

If you're not using VSCode, but using Claude CLI directly, you can use the `--mcp` flag:

**One-time use:**

```bash
# Using npx
claude --mcp "npx,memcode,--path,/your/code/path"

# If installed globally
claude --mcp "memcode,--path,/your/code/path"
```

**Windows Example:**
```bash
claude --mcp "npx,memcode,--path,D:\projects\myapp"
```

**macOS/Linux Example:**
```bash
claude --mcp "npx,memcode,--path,/Users/john/projects/myapp"
```

**Persistent configuration (Recommended):**

Add MCP server to your Claude CLI config file:

**File path:**
- Windows: `C:\Users\your-username\.claude\settings.json`
- macOS: `~/.claude/settings.json`
- Linux: `~/.claude/settings.json`

**Using npx:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "npx",
      "args": ["memcode", "--path", "/your/code/path"]
    }
  }
}
```

**If installed globally:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "memcode",
      "args": ["--path", "/your/code/path"]
    }
  }
}
```

### 4. Restart VSCode

That's it! Claude Code in VSCode can now read code directly from memory.

## Command Line Options

| Option | Default | Description |
|--------|---------|-------------|
| `--path` | (required) | Code directory path |
| `--exclude` | .git,node_modules,__pycache__,venv | Comma-separated directories to exclude |
| `--include` | .js,.ts,.jsx,.tsx,.py,.go,.java,.c,.cpp,.h,.rs,.md,.json | File extensions to include |
| `--watch` | true | Enable file watching for live reload |
| `--no-watch` | - | Disable file watching |
| `--debounce` | 500 | Debounce delay in milliseconds |

## Available Tools

| Tool | Parameters | Description |
|------|------------|-------------|
| `memory_code_read` | path: string | Read file content from memory |
| `memory_code_grep` | pattern: string, path?: string | Search for pattern in code |
| `memory_code_glob` | pattern: string | Find files matching pattern |
| `memory_code_stats` | - | Get loading statistics |

## Development

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Run tests
npm test
```

## Project Structure

```
memcode-npm/
├── src/
│   ├── index.ts      # Main entry point
│   ├── loader.ts     # Code loading logic
│   ├── mcp.ts        # MCP protocol implementation
│   └── watcher.ts    # File watching
├── tests/            # Test files
├── package.json
└── tsconfig.json
```

## License

MIT

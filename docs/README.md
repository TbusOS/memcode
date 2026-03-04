# Memcode

MCP Server that loads code into memory for faster access.

## Why memcode?

- **Faster access**: Code is loaded into memory, no repeated disk I/O
- **Live reload**: File changes are automatically detected and updated
- **Cross-platform**: Works on Windows, Linux, and macOS
- **VSCode ready**: Works with Claude Code in VSCode

## Installation

Choose one of the following methods:

### Option 1: Download Pre-built Executable (Recommended)

Download the pre-built executable from [Releases](https://github.com/TbusOS/memcode/releases):

```bash
# Windows
memcode.exe --path C:\your\code\path

# Linux
./memcode-linux --path /your/code/path

# macOS (Intel)
./memcode-darwin-x64 --path /your/code/path

# macOS (Apple Silicon)
./memcode-darwin-arm64 --path /your/code/path
```

### Option 2: Install via npm (npx)

```bash
# Run directly without installing
npx memcode --path /your/code/path
```

### Option 3: Build from Source

#### TypeScript version
```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-npm
npm install
npm run build
node dist/index.js --path /your/code/path
```

#### Go version (single binary, no dependencies)
```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-go
go build -o memcode
./memcode --path /your/code/path
```

### Option 4: Build Executable Yourself

```bash
# TypeScript version
cd memcode-npm
npm install -D pkg
npm run build:exe

# Go version
cd memcode-go
go build -o memcode
```

## Usage

### 1. Start the server

```bash
# Using Go binary (recommended)
./memcode --path /your/code/path

# Using npx
npx memcode --path /your/code/path

# Using node
node dist/index.js --path /your/code/path
```

### 2. Configure MCP

MCP server configuration needs to be added to VSCode settings. Choose one of the following:

#### Option 1: Project-level config (Recommended)

Create or edit `.vscode/settings.json` in your project root:

**File path:**
- Windows: `C:\your\project\path\.vscode\settings.json`
- macOS/Linux: `/your/project/path/.vscode/settings.json`

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

**Windows Example:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "C:\\tools\\memcode.exe",
      "args": ["--path", "D:\\projects\\myapp"]
    }
  }
}
```

**macOS Example:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "/usr/local/bin/memcode",
      "args": ["--path", "/Users/john/projects/myapp"]
    }
  }
}
```

**Linux Example:**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "/usr/local/bin/memcode",
      "args": ["--path", "/home/john/projects/myapp"]
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
# Launch Claude CLI with memcode
claude --mcp "/path/to/memcode,--path,/your/code/path"
```

**Windows Example:**
```bash
claude --mcp "C:\tools\memcode.exe,--path,D:\projects\myapp"
```

**macOS/Linux Example:**
```bash
claude --mcp "/usr/local/bin/memcode,--path,/home/john/projects/myapp"
```

**Persistent configuration (Recommended):**

Add MCP server to your Claude CLI config file:

**File path:**
- Windows: `C:\Users\your-username\.claude\settings.json`
- macOS: `~/.claude/settings.json`
- Linux: `~/.claude/settings.json`

```json
{
  "mcpServers": {
    "memcode": {
      "command": "/path/to/memcode",
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
| `--include` | .py,.js,.ts,.jsx,.tsx,.go,.java,.c,.cpp,.h,.rs,.md,.json | File extensions to include |
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

## Project Structure

```
memcode/
├── memcode-npm/          # TypeScript version (npm)
│   ├── src/
│   ├── tests/
│   └── package.json
├── memcode-go/           # Go version (single binary)
│   ├── main.go
│   ├── loader.go
│   └── go.mod
└── docs/
    └── README.md
```

## License

MIT

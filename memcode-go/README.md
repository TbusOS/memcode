# Memcode Go

High-performance MCP Server that loads code into memory for faster access by Claude Code in VSCode.

## Why memcode Go?

- **Faster access**: Code is loaded into memory, no repeated disk I/O
- **Live reload**: File changes are automatically detected and updated
- **Single binary**: No dependencies, just one executable file
- **Cross-platform**: Works on Windows, Linux, and macOS
- **VSCode ready**: Works with Claude Code in VSCode

## Installation

### Option 1: Download Pre-built Executable (Recommended)

Go to GitHub Releases page to download the pre-built version for your platform:
https://github.com/TbusOS/memcode/releases

**Manual download:**
1. Open the Releases page above
2. Download the archive for your platform:
   - `memcode-windows-amd64.zip` - Windows x64
   - `memcode-linux-amd64.tar.gz` - Linux x64
   - `memcode-darwin-amd64.tar.gz` - macOS Intel (x64)
   - `memcode-darwin-arm64.tar.gz` - macOS Apple Silicon (M1/M2/M3)
3. Extract and move the executable to a suitable location

**Using command line (macOS/Linux):**

```bash
# Create install directory
mkdir -p ~/memcode
cd ~/memcode

# Download macOS Apple Silicon
curl -L -o memcode.tar.gz https://github.com/TbusOS/memcode/releases/latest/download/memcode-darwin-arm64.tar.gz

# Or download macOS Intel
curl -L -o memcode.tar.gz https://github.com/TbusOS/memcode/releases/latest/download/memcode-darwin-amd64.tar.gz

# Or download Linux
curl -L -o memcode.tar.gz https://github.com/TbusOS/memcode/releases/latest/download/memcode-linux-amd64.tar.gz

# Extract
tar -xzf memcode.tar.gz

# Move to system path
chmod +x memcode
sudo mv memcode /usr/local/bin/
```

**Windows users:**
1. Download the `.zip` file from Releases page
2. Extract to get `memcode.exe`
3. Move it to a suitable location (e.g., `C:\tools\`)

**Usage:**

```bash
# Windows
C:\tools\memcode.exe --path C:\your\code\path

# Linux
/usr/local/bin/memcode --path /your/code/path

# macOS
./memcode --path /your/code/path
```

### Option 2: Build from Source

```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-go
go build -o memcode
./memcode --path /your/code/path
```

## Usage

### 1. Start the server

```bash
./memcode --path /your/code/path
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
      "args": ["--path", "/Users/zhangsan/projects/myapp"]
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
      "args": ["--path", "/home/zhangsan/projects/myapp"]
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

### 4. Restart

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
memcode-go/
├── main.go           # Main program + MCP protocol
├── loader.go        # Code loading + file watching
├── go.mod           # Go module definition
├── test_e2e.js     # E2E tests
├── test_watch.js   # File watching tests
└── fixtures/        # Test data
```

## License

MIT

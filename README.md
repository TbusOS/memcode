# Memcode

MCP Server that loads code into memory for faster access by Claude Code in VSCode.

## Why Memcode?

- **Faster access**: Code is loaded into memory, no repeated disk I/O
- **Live reload**: File changes are automatically detected and updated
- **Cross-platform**: Works on Windows, Linux, and macOS
- **VSCode ready**: Works with Claude Code in VSCode
- **Two implementations**: Choose Go (single binary) or npm (Node.js)

## Quick Start

### Go Version (Recommended)

Single binary, no dependencies:

```bash
# Download pre-built or build from source
cd memcode-go
go build -o memcode
./memcode --path /your/code/path
```

### npm Version

```bash
# Using npx
npx memcode --path /your/code/path
```

## Configure MCP

After starting the server, configure VSCode to use memcode. See detailed instructions in:
- [Go Version Guide](memcode-go/README.md) - for Go binary configuration
- [npm Version Guide](memcode-npm/README.md) - for npm/npx configuration

## Choose Your Version

| Feature | Go | npm |
|---------|-----|-----|
| Binary size | ~10MB | N/A |
| Dependencies | None | Node.js |
| Performance | Faster | Good |
| Build once | Yes | No |

## Available Tools

Both versions provide the same MCP tools:

| Tool | Parameters | Description |
|------|------------|-------------|
| `memory_code_read` | path: string | Read file content from memory |
| `memory_code_grep` | pattern: string, path?: string | Search for pattern in code |
| `memory_code_glob` | pattern: string | Find files matching pattern |
| `memory_code_stats` | - | Get loading statistics |

## Project Structure

```
memcode/
├── memcode-go/          # Go version (single binary)
│   ├── main.go
│   ├── loader.go
│   └── README.md
├── memcode-npm/         # npm version (Node.js)
│   ├── src/
│   ├── tests/
│   └── README.md
└── docs/                # Documentation
    └── README.md
```

## Documentation

- [Go Version Guide](memcode-go/README.md)
- [npm Version Guide](memcode-npm/README.md)
- [详细文档](docs/README.md)

## License

MIT

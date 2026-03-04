# Memcode

将代码加载到内存中以便更快访问的 MCP 服务器。

## 为什么选择 Memcode?

- **更快访问**: 代码加载到内存中，无需重复磁盘 I/O
- **热重载**: 自动检测文件变更并更新
- **跨平台**: 支持 Windows、Linux 和 macOS
- **VSCode 兼容**: 支持 VSCode 中的 Claude Code

## 安装

选择以下方式之一：

### 选项 1: 下载预编译版本（推荐）

从 [Releases](https://github.com/TbusOS/memcode/releases) 下载预编译版本：

```bash
# Windows
memcode.exe --path C:\your\code\path

# Linux
./memcode-linux --path /your/code/path

# macOS (Intel)
./memcode-darwin-amd64 --path /your/code/path

# macOS (Apple Silicon)
./memcode-darwin-arm64 --path /your/code/path
```

### 选项 2: 使用 npm (npx)

```bash
# 直接运行，无需安装
npx memcode --path /your/code/path
```

### 选项 3: 从源码构建

#### TypeScript 版本
```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-npm
npm install
npm run build
node dist/index.js --path /your/code/path
```

#### Go 版本（单一二进制文件，无依赖）
```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-go
go build -o memcode
./memcode --path /your/code/path
```

### 选项 4: 自己构建可执行文件

```bash
# TypeScript 版本
cd memcode-npm
npm install -D pkg
npm run build:exe

# Go 版本
cd memcode-go
go build -o memcode
```

## 使用方法

### 1. 启动服务器

```bash
# 使用 Go 二进制文件（推荐）
./memcode --path /your/code/path

# 使用 npx
npx memcode --path /your/code/path

# 使用 node
node dist/index.js --path /your/code/path
```

### 2. 配置 MCP

MCP 服务器配置需要添加到 VSCode 设置文件中。根据你的需求选择以下方式之一：

#### 方式一：项目级别配置（推荐）

在项目根目录下创建或编辑 `.vscode/settings.json`：

**文件路径：**
- Windows: `C:\你的项目路径\.vscode\settings.json`
- macOS/Linux: `/你的项目路径/.vscode/settings.json`

```json
{
  "mcpServers": {
    "memcode": {
      "command": "memcode",
      "args": ["--path", "你的代码路径"]
    }
  }
}
```

**Windows 示例:**
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

**macOS 示例:**
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

**Linux 示例:**
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

#### 方式二：全局配置

如果你想在所有项目中使用 memcode，可以配置全局设置：

**文件路径：**
- Windows: `C:\Users\你的用户名\AppData\Roaming\Code\User\settings.json`
- macOS: `~/Library/Application Support/Code/User/settings.json`
- Linux: `~/.config/Code/User/settings.json`

### 3. 配置 Claude CLI

如果你不使用 VSCode，而是直接使用 Claude CLI，可以通过 `--mcp` 参数来使用 memcode：

**一次性使用：**

```bash
# 启动 Claude CLI 并加载 memcode
claude --mcp "/path/to/memcode,--path,/your/code/path"
```

**Windows 示例：**
```bash
claude --mcp "C:\tools\memcode.exe,--path,D:\projects\myapp"
```

**macOS/Linux 示例：**
```bash
claude --mcp "/usr/local/bin/memcode,--path,/home/zhangsan/projects/myapp"
```

**持久化配置（推荐）：**

将 MCP 服务器配置添加到 Claude CLI 配置文件中：

**文件路径：**
- Windows: `C:\Users\你的用户名\.claude\settings.json`
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

### 4. 重启 VSCode

完成！VSCode 中的 Claude Code 现在可以直接从内存中读取代码了。

## 命令行选项

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `--path` | （必填） | 代码目录路径 |
| `--exclude` | .git,node_modules,__pycache__,venv | 要排除的目录，逗号分隔 |
| `--include` | .py,.js,.ts,.jsx,.tsx,.go,.java,.c,.cpp,.h,.rs,.md,.json | 要包含的文件扩展名 |
| `--watch` | true | 启用文件监视实现热重载 |
| `--no-watch` | - | 禁用文件监视 |
| `--debounce` | 500 | 防抖延迟时间（毫秒） |

## 可用工具

| 工具 | 参数 | 描述 |
|------|------|------|
| `memory_code_read` | path: string | 从内存中读取文件内容 |
| `memory_code_grep` | pattern: string, path?: string | 在代码中搜索模式 |
| `memory_code_glob` | pattern: string | 查找匹配模式的文件 |
| `memory_code_stats` | - | 获取加载统计信息 |

## 项目结构

```
memcode/
├── memcode-npm/          # TypeScript 版本（npm）
│   ├── src/
│   ├── tests/
│   └── package.json
├── memcode-go/           # Go 版本（单一二进制）
│   ├── main.go
│   ├── loader.go
│   └── go.mod
└── docs/
    └── README.md
```

## 许可证

MIT

# Memcode npm

将代码加载到内存中以便更快访问的 MCP 服务器，专为 VSCode 中的 Claude Code 设计。

## 为什么选择 Memcode npm?

- **更快访问**: 代码加载到内存中，无需重复磁盘 I/O
- **热重载**: 自动检测文件变更并更新
- **易于安装**: 直接使用 npm 或 npx
- **VSCode 兼容**: 支持 VSCode 中的 Claude Code

## 安装

### 选项 1: 使用 npx 直接运行（推荐）

```bash
npx memcode --path /your/code/path
```

### 选项 2: 全局安装

```bash
npm install -g memcode
memcode --path /your/code/path
```

### 选项 3: 从源码构建

```bash
git clone https://github.com/TbusOS/memcode.git
cd memcode/memcode-npm
npm install
npm run build
node dist/index.js --path /your/code/path
```

### 选项 4: 自己构建可执行文件

```bash
cd memcode-npm
npm install -D pkg
npm run build:exe
```

## 使用方法

### 1. 启动服务器

```bash
# 使用 npx
npx memcode --path /your/code/path

# 使用 node
node dist/index.js --path /your/code/path

# 使用已安装的二进制文件
memcode --path /your/code/path
```

### 2. 配置 MCP

MCP 服务器配置需要添加到 VSCode 设置文件中。根据你的需求选择以下方式之一：

#### 方式一：项目级别配置（推荐）

在项目根目录下创建或编辑 `.vscode/settings.json`：

**文件路径：**
- Windows: `C:\你的项目路径\.vscode\settings.json`
- macOS/Linux: `/你的项目路径/.vscode/settings.json`

**使用 npx 运行：**
```json
{
  "mcpServers": {
    "memcode": {
      "command": "npx",
      "args": ["memcode", "--path", "你的代码路径"]
    }
  }
}
```

**Windows 示例:**
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

**macOS/Linux 示例:**
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

**如果是全局安装：**
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
# 使用 npx
claude --mcp "npx,memcode,--path,/your/code/path"

# 如果是全局安装
claude --mcp "memcode,--path,/your/code/path"
```

**Windows 示例：**
```bash
claude --mcp "npx,memcode,--path,D:\projects\myapp"
```

**macOS/Linux 示例：**
```bash
claude --mcp "npx,memcode,--path,/home/zhangsan/projects/myapp"
```

**持久化配置（推荐）：**

将 MCP 服务器配置添加到 Claude CLI 配置文件中：

**文件路径：**
- Windows: `C:\Users\你的用户名\.claude\settings.json`
- macOS: `~/.claude/settings.json`
- Linux: `~/.claude/settings.json`

**使用 npx：**
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

**如果是全局安装：**
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

### 4. 重启 VSCode

完成！VSCode 中的 Claude Code 现在可以直接从内存中读取代码了。

## 命令行选项

| 选项 | 默认值 | 描述 |
|------|--------|------|
| `--path` | （必填） | 代码目录路径 |
| `--exclude` | .git,node_modules,__pycache__,venv | 要排除的目录，逗号分隔 |
| `--include` | .js,.ts,.jsx,.tsx,.py,.go,.java,.c,.cpp,.h,.rs,.md,.json | 要包含的文件扩展名 |
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

## 开发

```bash
# 安装依赖
npm install

# 构建 TypeScript
npm run build

# 运行测试
npm test
```

## 项目结构

```
memcode-npm/
├── src/
│   ├── index.ts      # 主入口
│   ├── loader.ts     # 代码加载逻辑
│   ├── mcp.ts       # MCP 协议实现
│   └── watcher.ts   # 文件监视
├── tests/           # 测试文件
├── package.json
└── tsconfig.json
```

## 许可证

MIT

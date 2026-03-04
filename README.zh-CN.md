# Memcode

将代码加载到内存中以便更快访问的 MCP 服务器，专为 VSCode 中的 Claude Code 设计。

## 为什么选择 Memcode?

- **更快访问**: 代码加载到内存中，无需重复磁盘 I/O
- **热重载**: 自动检测文件变更并更新
- **跨平台**: 支持 Windows、Linux 和 macOS
- **VSCode 兼容**: 支持 VSCode 中的 Claude Code
- **双版本实现**: 可选择 Go 版本（单二进制）或 npm 版本（Node.js）

## 快速开始

### Go 版本（推荐）

单一二进制文件，无需依赖：

```bash
# 下载预编译版本或从源码构建
cd memcode-go
go build -o memcode
./memcode --path /your/code/path
```

### npm 版本

```bash
# 使用 npx
npx memcode --path /your/code/path
```

## 配置 MCP

启动服务器后，需要配置 VSCode 以使用 memcode。详细说明请参考：
- [Go 版本指南](memcode-go/README.zh-CN.md) - Go 二进制配置
- [npm 版本指南](memcode-npm/README.zh-CN.md) - npm/npx 配置

## 选择你的版本

| 特性 | Go | npm |
|------|-----|-----|
| 二进制大小 | ~10MB | 不适用 |
| 依赖项 | 无 | Node.js |
| 性能 | 更快 | 良好 |
| 一次构建 | 是 | 否 |

## 可用工具

两个版本提供相同的 MCP 工具：

| 工具 | 参数 | 描述 |
|------|------|------|
| `memory_code_read` | path: string | 从内存中读取文件内容 |
| `memory_code_grep` | pattern: string, path?: string | 在代码中搜索模式 |
| `memory_code_glob` | pattern: string | 查找匹配模式的文件 |
| `memory_code_stats` | - | 获取加载统计信息 |

## 项目结构

```
memcode/
├── memcode-go/          # Go 版本（单一二进制）
│   ├── main.go
│   ├── loader.go
│   └── README.md
├── memcode-npm/         # npm 版本（Node.js）
│   ├── src/
│   ├── tests/
│   └── README.md
└── docs/                # 文档
    └── README.md
```

## 文档

- [Go 版本指南](memcode-go/README.md)
- [npm 版本指南](memcode-npm/README.md)
- [English Documentation](docs/README.md)

## 许可证

MIT

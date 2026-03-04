# memcode 计划文档

## 1. 项目概述

- **项目名称**: memcode
- **项目类型**: MCP Server (Model Context Protocol Server)
- **核心功能**: 把代码库加载到内存中，通过 MCP 协议提供服务，替代文件系统操作
- **目标用户**: 使用 Claude Code 的开发者
- **开源地址**: GitHub (待创建)

## 2. 背景与动机

### 问题
- 频繁读取磁盘 I/O 速度慢
- 重复读取相同文件效率低

### 解决方案
- 开发一个 MCP Server，启动时把代码库加载到内存
- 通过 MCP 协议提供内存中的代码查询服务
- Claude Code 只通过 MCP 工具操作，不再直接读写文件系统

## 3. 功能需求

### 3.1 核心功能

| 功能 | 描述 |
|------|------|
| 代码加载 | 启动时把指定目录的代码加载到内存 |
| 文件读取 | 根据路径返回文件内容 |
| 文本搜索 | 在内存中搜索匹配的文本行 |
| 文件查找 | 按模式匹配文件路径 |
| 状态查询 | 查看加载的文件数量、大小等 |

### 3.2 配置选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| --path | (必填) | 代码库路径 |
| --port | 8765 | 服务端口 |
| --exclude | .git,node_modules,__pycache__ | 排除的目录 |
| --include | .py,.js,.ts,.go,.java,.md | 包含的文件类型 |

### 3.3 跨平台支持

- [x] Windows
- [x] Linux
- [x] macOS

## 4. 技术方案

### 4.1 技术选型

- **语言**: TypeScript / Node.js
- **框架**: @modelcontextprotocol/server (官方 MCP SDK)
- **文件监听**: chokidar
- **打包**: TypeScript 编译 + ncc / pkg

### 4.2 架构

```
┌─────────────────┐      ┌─────────────────┐      ┌─────────────────┐
│   Claude Code   │─────▶│  memcode MCP   │─────▶│   内存中的代码   │
│                 │      │    Server      │      │   (Map 结构)    │
└─────────────────┘      └─────────────────┘      └─────────────────┘
```

### 4.3 核心数据结构

```typescript
// 内存中的代码库结构
const codebase: Map<string, string> = new Map([
  ['path/to/file.py', 'file content here...'],
  ['path/to/main.js', "console.log('hello')"],
]);
```

## 5. MCP 工具定义

| 工具名 | 参数 | 返回 |
|--------|------|------|
| memory_code_read | path: string | 文件内容 |
| memory_code_grep | pattern: string, path?: string | 匹配结果列表 |
| memory_code_glob | pattern: string | 文件路径列表 |
| memory_code_stats | - | 加载统计信息 |

## 6. 目录结构

```
memcode/
├── src/
│   ├── index.ts              # 主程序入口
│   ├── config.ts             # 配置解析
│   ├── loader.ts             # 代码加载器
│   └── tools/                # MCP 工具实现
│       ├── index.ts          # 工具注册
│       ├── read.ts
│       ├── grep.ts
│       ├── glob.ts
│       └── stats.ts
├── tests/                    # 测试目录
│   ├── loader.test.ts        # 加载器单元测试
│   ├── config.test.ts       # 配置解析测试
│   └── tools/               # 工具测试
│       ├── read.test.ts
│       ├── grep.test.ts
│       ├── glob.test.ts
│       └── stats.test.ts
├── fixtures/                 # 测试 fixtures
│   └── sample-project/      # 示例项目
│       ├── src/
│       │   └── index.ts
│       └── package.json
├── package.json              # 依赖
├── tsconfig.json            # TypeScript 配置
├── jest.config.js           # Jest 配置
├── README.md                # 使用说明
└── PLAN.md                  # 本计划文档
```

## 7. 实现步骤

### Phase 1: 基础框架
- [ ] 初始化 Node.js 项目
- [ ] 安装依赖 (@modelcontextprotocol/server, chokidar)
- [ ] 实现配置解析 (config.ts)
- [ ] 实现代码加载器 (loader.ts)

### Phase 2: MCP 工具
- [ ] 实现 memory_code_read
- [ ] 实现 memory_code_grep
- [ ] 实现 memory_code_glob
- [ ] 实现 memory_code_stats

### Phase 3: 测试与文档
- [ ] 本地测试
- [ ] 配置 MCP
- [ ] 编写 README
- [ ] 开源发布

## 8. 测试方案

### 8.1 测试框架

- **测试框架**: Jest
- **原因**: 成熟稳定、社区支持好、与 TypeScript 集成良好

### 8.2 测试类型

| 测试类型 | 覆盖内容 | 测试方式 |
|----------|----------|----------|
| 单元测试 | config.ts, loader.ts 核心逻辑 | Mock 文件系统 |
| 工具测试 | 各个 MCP 工具的输入输出 | 模拟 loader |
| 集成测试 | 完整加载流程 | 使用 fixtures |

### 8.3 测试覆盖目标

- **覆盖率目标**: >= 80%
- **核心模块**: loader.ts (必须高覆盖)

### 8.4 Fixtures

```typescript
// fixtures/sample-project 结构
sample-project/
├── src/
│   ├── index.ts       // 入口文件
│   ├── utils.ts       // 工具函数
│   └── constants.ts   // 常量
├── tests/
│   └── index.test.ts  // 测试文件
├── package.json
├── tsconfig.json
└── README.md
```

### 8.6 依赖

```json
{
  "dependencies": {
    "@modelcontextprotocol/server": "^1.0.0",
    "chokidar": "^3.5.3",
    "commander": "^11.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "jest": "^29.0.0",
    "ts-jest": "^29.0.0",
    "typescript": "^5.0.0"
  }
}
```

```bash
# 运行所有测试
npm test

# 监听模式
npm test -- --watch

# 生成覆盖率报告
npm test -- --coverage

# 运行特定测试
npm test -- loader.test.ts
```

## 8. 使用流程

```bash
# 1. 安装
npm install

# 2. 构建
npm run build

# 3. 启动服务
./dist/index.js --path /your/code/path --port 8765

# 4. 配置 MCP (在 ~/.claude/settings.json)
{
  "mcpServers": {
    "memcode": {
      "command": "node",
      "args": ["/path/to/memcode/dist/index.js", "--path", "/your/code/path"]
    }
  }
}

# 5. 重启 Claude Code，开始使用
```

## 9. 风险与限制

1. **内存占用**: 大型代码库可能占用较多内存
2. **代码更新**: 服务启动后代码变更会自动更新（增量加载）

## 10. 待确认问题

- [x] 是否需要支持代码写入功能？→ **否，只做只读**
- [x] 是否需要增量加载？→ **是，需要监听文件变化自动更新**
- [x] 是否需要认证？→ **否，不需要认证**

## 11. 增量加载设计

### 11.1 实现方案

使用 Node.js 的 `chokidar` 库监听文件变化：

```typescript
import chokidar from 'chokidar';

const watcher = chokidar.watch(codePath, {
  ignored: /(^|[\/\\])\../,  // 忽略隐藏文件
  persistent: true,
  ignoreInitial: true,
});

watcher
  .on('change', (path) => reloadFile(path))
  .on('add', (path) => addFile(path))
  .on('unlink', (path) => removeFile(path));
```

### 11.2 配置选项

| 选项 | 默认值 | 说明 |
|------|--------|------|
| --watch | true | 是否启用文件监听 |
| --debounce | 500 | 防抖延迟(毫秒) |

### 11.3 工作流程

1. 启动时全量加载代码到内存
2. 后台启动文件监听
3. 文件变化时增量更新内存中的代码
4. Claude Code 查询时直接读内存（始终最新）

## 12. VSCode 插件规划

后续可扩展为 VSCode 插件，复用核心逻辑：

```
memcode/
├── core/              # 核心逻辑 (可共用)
│   ├── loader.ts
│   └── types.ts
├── server/            # MCP Server (当前)
│   └── ...
└── extension/         # VSCode 插件 (后续)
    └── ...
```

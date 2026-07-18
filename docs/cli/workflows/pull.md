# 拉取远端资源

`kb pull` 将远端站点资源写入当前本地项目。它可以拉取全部资源、指定目录或文件，也可以只刷新类型定义。

## 使用前准备

确认项目根目录的 `.env` 已包含：

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

拉取会覆盖同路径的本地文件。执行前先提交、暂存或备份需要保留的本地改动，并停止当前项目正在运行的 `kb sync`。

## 拉取全部资源

```bash
kb pull
```

该命令会刷新类型定义，并拉取 CLI 支持的站点资源、内容文件、图片、MCP 工具和在线模块。

## 只刷新类型定义

```bash
kb pull type
```

只需要更新本地类型提示时使用该命令。它不会拉取其他站点资源。

## 按路径拉取

优先使用路径限定范围：

```bash
kb pull code
kb pull code/server
kb pull code/server/order.ts
kb pull images/gallery
kb pull images/gallery/hero.png
kb pull content-file/assets
kb pull mcp-tools/weather.ts
kb pull module/shop
```

路径可以省略开头的 `src/`。例如 `kb pull src/code/server` 与 `kb pull code/server` 指向同一范围。

指定路径没有匹配远端资源时，CLI 会提示没有匹配项，不会自动改为全量拉取。

## 兼容资源类型写法

CLI 仍支持按资源类型和名称拉取：

```bash
kb pull api
kb pull api user.get
```

新工作流建议使用路径写法，因为目录、文件和模块范围更直观。

## 拉取后的检查

```bash
git status --short
git diff --stat
```

重点确认：

- 哪些本地文件被覆盖或新增；
- 类型定义是否更新；
- 目标路径是否与预期一致；
- 本地未提交改动是否仍完整。

`kb pull` 不是 Git 合并工具。需要同时保留本地和远端修改时，先保护本地版本，再通过 Git diff 手工合并。

## 相关文档

- [项目资源与目录](../project/resources.md)
- [推送本地资源](./push.md)
- [持续同步](./sync.md)

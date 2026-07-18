# 新建或克隆项目

新项目可以使用 `kb new` 创建远端站点并生成本地项目；已有站点使用 `kb clone` 拉取为本地项目。

## 新建站点项目

```bash
kb new my-site
```

如果需要指定 Kooboo 服务器：

```bash
kb new my-site --host https://example.com
```

执行过程中，CLI 会根据需要询问账号、密码、站点名称和项目模板。创建成功后，本地目录中会包含项目文件以及目标站点的环境配置。

`kb new` 会创建远端站点。确认服务器地址和站点名称后再继续，避免在错误环境中产生新站点。

## 克隆已有站点

```bash
kb clone https://example.com
```

指定本地目录：

```bash
kb clone https://example.com my-site
```

指定项目模板：

```bash
kb clone https://example.com my-site --template vitest
```

不指定模板时，CLI 会交互式询问目标目录、项目能力和包管理器，并以空项目为基础完成克隆。克隆完成后，支持的站点资源和类型定义会写入本地项目。

## 初始化本地项目

进入创建或克隆出的目录并安装依赖：

```bash
cd my-site
pnpm install
```

然后检查 `.env`：

```ini
KOOBOO_SITE_URL=https://example.com
KOOBOO_USERNAME=your-username
KOOBOO_PASSWORD=your-password
```

不要提交包含真实账号密码的 `.env`。

## 创建与克隆的区别

| 方式 | 远端结果 | 本地结果 |
|------|----------|----------|
| `kb new` | 创建新站点 | 根据选择的模板生成项目 |
| `kb clone` | 不创建站点 | 拉取已有站点资源并生成项目 |

克隆已有站点后，建议先运行 `git status` 并建立初始提交，再开始修改。新建项目准备首次发布时，先了解 [`kb push`](../workflows/push.md) 和 [`kb sync --init`](../workflows/sync.md) 的远端影响。

## 相关文档

- [项目资源与目录](../project/resources.md)
- [拉取远端资源](../workflows/pull.md)
- [推送本地资源](../workflows/push.md)

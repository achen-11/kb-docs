# 持续同步

`kb sync` 会持续监听当前项目中的站点资源。文件新增、修改或删除后，CLI 会把对应变化写入远端站点。

## 启动同步

```bash
kb sync
```

如果项目的 `package.json` 将 `dev` 配置为 `kb sync`，也可以运行：

```bash
pnpm dev
```

启动成功后，进程会持续运行。保持终端打开，按 `Ctrl+C` 停止监听。

## 首次初始化同步

```bash
kb sync --init
```

普通 `kb sync` 只处理监听开始后的变化。`--init` 会在启动时同时处理资源目录中已有的文件，因此可能一次修改大量远端资源。

首次初始化前，建议先执行：

```bash
git status --short
kb check
```

确认本地项目确实应该成为目标站点的资源来源后，再运行 `kb sync --init`。

## 临时指定连接信息

```bash
kb sync \
  --site-url https://example.com \
  --username your-username \
  --password your-password
```

命令参数只影响本次同步。日常开发仍建议使用项目 `.env`，减少误连站点的风险。

## 同步共享模块文件

需要把一个公共目录镜像到项目中的各个模块时，可以指定：

```bash
kb sync --common-module-path ../common-module
```

公共目录的新增、修改和删除会同步到各模块对应位置，并继续按正常资源流程写入远端。使用前确认模块之间确实应共享同一份文件。

## 远端影响

同步进程会处理：

- 新增文件：创建或更新远端资源；
- 修改文件：覆盖对应远端资源；
- 删除文件：删除对应远端资源；
- Page 和 API：需要有效的 `@k-url`；
- 不支持的扩展名：不会作为对应资源保存。

停止 `kb sync` 只会停止后续监听，不会撤销已经写入远端的修改。

## 与 `.pushignore` 的区别

`.pushignore` 只影响 `kb push`。`kb sync` 不读取 `.pushignore`。

如果某些文件不应同步：

- 不要把它们放入 CLI 监听的资源目录；
- 修改临时文件前先停止 `kb sync`；
- 使用单独的源码或构建目录，再把最终产物复制到资源目录。

## 使用建议

- 纯本地编辑时不要保持 `kb sync` 常驻；
- 需要远端实时联调时再启动；
- 同一项目不要同时运行多个同步进程；
- 切换站点前先停止同步，再修改 `.env`；
- 大范围重命名或删除前先提交 Git，以便审查和恢复。

## 相关文档

- [项目资源与目录](../project/resources.md)
- [推送本地资源](./push.md)
- [资源对账与远端清理](./check-and-prune.md)

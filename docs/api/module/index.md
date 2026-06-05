# k.module

> 脚本模块（**开发 → 模块**）运行时的 KScript API

## 概述

**模块**是带独立目录与路由的扩展包（`view/`、`api/`、`code/`、`module.config` 等），在站点中注册为 `/_模块名/{part}`。`k.module` 提供当前模块上下文信息、配置、定时任务、本地文件与数据库，以及模块包管理（导入/导出/应用商店）等能力。

::: tip 先配后台
在 [模块（CMS）](/cms/development/modules) 中 **创建** 或 **导入** 模块，在开发模式编辑文件，并在列表 **设置** 中保存 `module.config` 定义的运行参数。
:::

::: warning 执行上下文
许多成员（如 `baseUrl`、`config`、`name`、`localFile`、`task`）仅在 **模块脚本** 执行时可用（模块 view/api/code、或 `module:` / `ModuleApi:` 加载的入口）。在普通站点 Code / API 中访问会抛出：`part of k.module only available under Module execution context`。

站点级列表、创建、删除等可在任意有权限的脚本中调用（如 `k.module.list()`）。
:::

::: info 与 k.site 的区别
| API | 作用域 |
|-----|--------|
| `k.site.*` | 当前站点页面、布局、Code 等资源 |
| `k.module.*` | 当前 **模块包** 目录、配置与模块路由 |

模块内引用其它脚本：

```ts
import { helper } from "module:myModule/code/utils"
// 模块 API 入口
import api from "ModuleApi:myModule/api/hello"
```

解析规则见 `ModuleLoader`（`code/`、`api/` 目录）。
:::

## 模块内常用成员

### baseUrl

当前模块对外根 URL（含模块路由前缀），用于拼链接或重定向。

```ts
// 在模块 view/api 脚本中
const home = k.module.baseUrl + "index"
```

### config

读取后台 **设置** 保存的键值（来自 `module.config` 的 `settingDefines` + 站点 `Settings` JSON）。未配置时可能为空对象。

```ts
const title = k.module.config?.text
```

### name

当前正在执行的模块名称。

### task

模块 **定时任务** 链式 API（写在模块 `event.js` 或任务脚本中）：

```ts
k.module.task
  .day(1)
  .hour(0)
  .run(function () {
    // 定时逻辑
  })
```

也可使用 `minute(n)`。调度由模块任务运行时读取 `RenderContext` 中的函数与计划。

### localFile / openFileStream

访问模块磁盘目录下的文件（按类型分文件夹）：

| 成员 | 目录 |
|------|------|
| `k.module.localFile.view` | `view/` |
| `k.module.localFile.api` | `api/` |
| `k.module.localFile.js` | `js/` |
| `k.module.localFile.css` | `css/` |
| `k.module.localFile.img` | `img/` |
| `k.module.localFile.file` | `file/` |

或使用 `k.module.openFileStream("api")` 等（`fileType` 为 `css`、`js`、`view`、`api`、`img`、`file` 之一）。

`KModuleFiles` 提供读写、列举等（见 `kooboo.d.ts` 中 `Kooboo.Sites.ScriptModules.KModuleApi.KModuleFiles`）。

### localDatabase / localSqlite

| 成员 | 说明 |
|------|------|
| `k.module.localDatabase` / `localIndexedDb` | 模块目录内 IndexedDB 风格本地库（`KModuleDatabase`） |
| `k.module.localSqlite` | 模块根目录 `_sqlite.db` 的 SQLite 访问 |

适合模块私有数据，与站点 `k.DB` 分离。

## 站点级管理 API

以下方法可在 **站点 Code / API** 中调用（需相应站点权限），用于自动化安装与运维。

### list()

返回站点内全部 `ScriptModule` 对象数组。

```ts
k.api.get(() => {
  return k.module.list().map((m) => ({ id: m.id, name: m.name, online: m.online }))
})
```

### createModule(name)

创建空模块并注册路由，返回 `ScriptModule`。

### remove(idOrName) / remove(idOrName, destinationSiteUrl)

删除模块；两参数重载可指定目标站点域名删除远程站点上的同名模块。

### isNameExists(name)

检查模块名是否已占用。

### importZip(name, binary)

从 zip 二进制创建模块并解压到模块目录，返回新模块 Id 字符串。

### exportAsZip(nameOrId)

导出模块为 zip 字节数组。

### importFromUrl(siteUrl, moduleId, newModuleName[, destinationSiteUrl])

从其它 Kooboo 站点的分享 URL（`/_api/PublicModuleFiles/PrivateShare?ModuleId=...`）拉取 zip 并安装。

### searchRepository(keyword) / installFromRepository(packageId, name)

搜索 Kooboo 应用商店模块包、下载安装（与后台 **搜索** 按钮同源）。

## TypeScript 定义（节选）

```ts
interface KModule {
  baseUrl: string
  config: any
  name: string
  task: KTask
  localFile: LocalFile
  localDatabase: IDatabase
  localIndexedDb: IDatabase
  localSqlite: SqliteDatabase
  list(): ScriptModule[]
  createModule(name: string): ScriptModule
  remove(idOrName: string): void
  isNameExists(name: string): boolean
  importZip(name: string, binary: number[]): string
  exportAsZip(nameOrId: string): number[]
  openFileStream(fileType: string): KModuleFiles
  searchRepository(keyword: string): ModuleSearchResult[]
  installFromRepository(packageId: string, name: string): string
}
```

完整签名以站点 `kooboo.d.ts` / IDE 补全为准。

## module.config 约定

模块根目录 **`module.config`**（JSON）常用字段：

| 字段 | 说明 |
|------|------|
| `name` / `version` / `description` | 包元数据；**`name` 为挂载菜单时的模块 Id** |
| `settingDefines` | 后台 **设置** 表单定义（`name`、`type`、`defaultValue`、`display` 等） |
| `menu` | 挂载到 [站点后台左侧菜单](/cms/development/modules#挂载站点后台菜单-menu)；仅 **已上线** 模块生效 |

### `menu`（后台侧栏）

站点加载时，`Site` API 读取各上线模块的 `module.config`，若存在 `menu`，则合并进 `moduleMenus` 并渲染到左侧菜单（详见 CMS 文档）。

| 字段 | 说明 |
|------|------|
| `name` | 菜单标题 |
| `nameTranslation` | 可选，按后台用户语言显示 |
| `parent` | 可选，顶级菜单的 `menu.name`（如 `commerce`、`content`） |
| `url` | 可选，模块 `view/` 下相对路径；空则用模块默认起始 view |
| `icon` | 可选，`img/` 下文件名 |
| `children` | 可选子菜单，每项含 `name`、`url` 等 |

解析后的访问地址形如：`/_模块名/{view路径}?SiteId={站点GUID}`。模块 view 内可用 **`k.module.config`** 读取运营配置。

`settingDefines` 保存后的键值通过 **`k.module.config`** 暴露给脚本（与 `menu` 无关）。说明文档写在 **`Readme.md`**。

## 相关文档

- [模块（CMS）](/cms/development/modules) — 列表、导入、开发模式、上线与分享  
- [k.site](../site/) — 站点资源  
- [k.DB](../database/) — 站点数据库  
- [k.file](../file/file.md) — 站点磁盘文件（非模块目录）  
- [开发 · 定时任务](/cms/development/jobs.md) — 站点级定时任务（`k.site.runJob`）

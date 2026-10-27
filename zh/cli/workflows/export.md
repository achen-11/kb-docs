# 导出站点

`kb export` 连接目标站点，让你选择要导出的资源组，并将结果下载为 ZIP 文件。

## 开始导出

使用项目 `.env` 中的连接信息：

```bash
kb export
```

执行过程中，CLI 会询问：

- 导出文件名；
- 要包含的资源组；
- 是否把本次选择保存为下次默认值。

未指定扩展名时，导出文件会使用 `.zip`。

## 临时指定连接信息

```bash
kb export \
  --site-url https://example.com \
  --username your-username \
  --password your-password
```

命令参数只影响本次导出。认证成功后，CLI 可能更新项目 `.env` 中的登录令牌，因此必须确保 `.env` 已被 Git 忽略。

## 保存默认选择

如果在交互过程中选择保存设置，CLI 会把默认导出资源组和文件名写入项目 `.env`：

```ini
KOOBOO_DEFAULT_EXPORTS=Code,Script,Style
KOOBOO_DEFAULT_FILE=site.zip
```

下次导出时仍会显示选择界面，可以继续调整资源范围。

## 导出前后检查

导出前：

- 确认站点地址和账号；
- 为文件名加上日期或版本，避免覆盖旧备份；
- 确认磁盘空间足够。

导出后：

```bash
ls -lh *.zip
```

保存用于恢复的重要导出包时，不要只留在临时目录。导出成功只代表压缩包已下载，不代表其中包含所有业务数据；资源范围取决于交互时的选择。

## 相关文档

- [资源对账与远端清理](./check-and-prune.md)
- [推送本地资源](./push.md)

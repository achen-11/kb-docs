# settings

> 电商设置

## 概述

`k.commerce.settings` 提供电商全局设置相关操作。

## TypeScript 定义

```ts
interface KCommerceSettings {
    get(): CommerceSettings;
    update(settings: CommerceSettings): boolean;
}
```

# shipping

> 配送方式

## 概述

`k.commerce.shipping` 提供配送方式相关操作。

## TypeScript 定义

```ts
interface KShipping {
    get(methodId: string): ShippingMethod;
    list(): ShippingMethod[];
    create(method: ShippingMethod): string;
    update(methodId: string, method: ShippingMethod): boolean;
    delete(methodId: string): boolean;
}
```

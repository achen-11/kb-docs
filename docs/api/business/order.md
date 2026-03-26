# order

> 订单

## 概述

`k.commerce.order` 提供订单相关操作。

## TypeScript 定义

```ts
interface KOrder {
    get(orderId: string): OrderResult;
    list(params?: OrderQuery): OrderResult[];
    create(init: CreateOrderInit): CreateOrderOptions;
    cancel(orderId: string): boolean;
}
```

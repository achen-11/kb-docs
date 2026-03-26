# discount

> 折扣优惠

## 概述

`k.commerce.discount` 提供折扣优惠券相关操作。

## TypeScript 定义

```ts
interface KDiscount {
    get(discountId: string): Discount;
    list(): Discount[];
    create(discount: Discount): string;
    update(discountId: string, discount: Discount): boolean;
    delete(discountId: string): boolean;
    validate(code: string): boolean;
}
```

# product

> 产品管理

## 概述

`k.commerce.product` 提供产品相关操作。

## TypeScript 定义

```ts
interface KProduct {
    get(productId: string): ProductDetail;
    list(params?: ProductQueryParams): ProductSimple[];
    create(product: NewProduct): string;
    update(productId: string, product: NewProduct): boolean;
    delete(productId: string): boolean;
}
```

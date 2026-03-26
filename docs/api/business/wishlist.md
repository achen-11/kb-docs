# wishlist

> 心愿单/收藏

## 概述

`k.commerce.wishlist` 提供心愿单相关操作。

## TypeScript 定义

```ts
interface KWishlist {
    get(customerId: string): Wishlist;
    add(customerId: string, productId: string): boolean;
    remove(customerId: string, productId: string): boolean;
    clear(customerId: string): boolean;
}
```

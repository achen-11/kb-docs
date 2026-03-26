# cart

> 购物车

## 概述

`k.commerce.cart` 提供购物车相关操作。

## TypeScript 定义

```ts
interface KCart {
    get(options?: GetCartOptions): CartDetail;
    add(line: CartLineOptions): CartDetail;
    update(lineId: string, line: CartLineOptions): CartDetail;
    remove(lineId: string): boolean;
    clear(): boolean;
}
```

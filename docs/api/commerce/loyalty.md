# loyalty

> 会员积分/忠诚度

## 概述

`k.commerce.loyalty` 提供会员积分相关操作。

## TypeScript 定义

```ts
interface KLoyalty {
    getPoints(customerId: string): number;
    addPoints(customerId: string, points: number): boolean;
    redeem(customerId: string, points: number): boolean;
    getHistory(customerId: string): LoyaltyTransaction[];
}
```

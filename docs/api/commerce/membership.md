# membership

> 会员等级

## 概述

`k.commerce.membership` 提供会员等级相关操作。

## TypeScript 定义

```ts
interface KMembership {
    get(levelId: string): MembershipLevel;
    list(): MembershipLevel[];
    create(level: MembershipLevel): string;
    update(levelId: string, level: MembershipLevel): boolean;
    delete(levelId: string): boolean;
}
```

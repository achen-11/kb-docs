# address

> 地址管理

## 概述

`k.commerce.address` 提供收货地址相关操作。

## TypeScript 定义

```ts
interface KAddress {
    get(addressId: string): Address;
    list(): Address[];
    create(address: Address): string;
    update(addressId: string, address: Address): boolean;
    delete(addressId: string): boolean;
    setDefault(addressId: string): boolean;
}
```

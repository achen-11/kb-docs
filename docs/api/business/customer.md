# customer

> 客户管理

## 概述

`k.commerce.customer` 提供客户相关操作。

## TypeScript 定义

```ts
interface KCustomer {
    get(customerId: string): Customer;
    list(): Customer[];
    create(customer: Customer): string;
    update(customerId: string, customer: Customer): boolean;
    delete(customerId: string): boolean;
}
```

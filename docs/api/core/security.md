# k.security

> 安全相关工具 - 哈希、加密、编码、GUID、JWT 等

## 概述

`k.security` 提供一系列安全相关的工具方法，包括：哈希算法、加密解密、Base64 编解码、GUID 生成、JWT 操作等。

## TypeScript 定义

```ts
interface Security {
  // 哈希算法
  md5(input: string): string;
  sha1(input: string): string;
  sha256(input: string): string;
  sha512(input: string): string;
  sha256Binary(input: string): string;
  hmacMd5(input: string, key: string): string;
  hmacSha1(input: string, key: string): string;
  hmacSha256(input: string, key: string): string;

  // 加密解密
  encrypt(input: string, key: string): string;
  decrypt(input: string, key: string): string;
  aesEncrypt(input: string, key: string): string;
  aesDecrypt(input: string, key: string): string;

  // Base64 编解码
  toBase64(input: string | number[]): string;
  fromBase64(input: string): string;
  decodeBase64(input: string): number[];

  // GUID
  newGuid(): string;
  shortGuid(): string;
  hashGuid(input: string, options?: { source?: string }): any;

  // 密码
  hashPassword(password: string): string;
  verifyPassword(password: string, saltedPassword: string): boolean;

  // JWT
  jwt: {
    encode(payload: object): string;
    decode(token?: string): string;  // 返回 JSON 字符串，需 JSON.parse()
  };

  // RSA
  rsa: {
    generateKeys(keySize: number): { publicKey: string; privateKey: string };
    encrypt(publicKey: string, content: string): string;
    decrypt(privateKey: string, content: string): string;
  };
}
```

## 哈希算法

### md5()

计算字符串的 MD5 哈希值。

```ts
k.api.get(() => {
    return { hash: k.security.md5("hello") }
})
// 返回: { "hash": "5D41402ABC4B2A76B9719D911017C592" }
```

### sha256()

计算字符串的 SHA256 哈希值。

```ts
k.api.get(() => {
    return { hash: k.security.sha256("hello") }
})
// 返回: { "hash": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" }
```

### sha512()

计算字符串的 SHA512 哈希值。

```ts
k.api.get(() => {
    return { hash: k.security.sha512("hello") }
})
```

### sha256Binary()

计算字符串的 SHA256 哈希值，返回二进制格式。

```ts
k.api.get(() => {
    return { hash: k.security.sha256Binary("hello") }
})
```

## 编码解码

### toBase64()

将字符串或二进制数组转换为 Base64 编码。

```ts
k.api.get(() => {
    return { encoded: k.security.toBase64("hello") }
})
// 返回: { "encoded": "aGVsbG8=" }
```

### fromBase64()

将 Base64 字符串解码为普通字符串。

```ts
k.api.get(() => {
    return { decoded: k.security.fromBase64("aGVsbG8=") }
})
// 返回: { "decoded": "hello" }
```

### decodeBase64()

将 Base64 字符串解码为字节数组。

```ts
k.api.get(() => {
    return { bytes: k.security.decodeBase64("aGVsbG8=") }
})
// 返回: { "bytes": [104, 101, 108, 108, 111] }
```

## GUID

### newGuid()

生成一个新的 GUID。

```ts
k.api.get(() => {
    return { guid: k.security.newGuid() }
})
// 返回: { "guid": "85ef9c4fe0ae4a3aa21e9c0a25f609c6" }
```

### shortGuid()

生成一个短格式的 GUID。

```ts
k.api.get(() => {
    return { guid: k.security.shortGuid() }
})
```

### hashGuid()

根据输入生成一个 Hash GUID。

```ts
k.api.get(() => {
    return k.security.hashGuid("hello")
})

k.api.get(() => {
    return k.security.hashGuid("folder/1.jpg", { source: "FileIo" })
})
```

## 密码

### hashPassword()

使用内置最佳实践对密码进行哈希运算。

```ts
k.api.get(() => {
    return { hashed: k.security.hashPassword("mypassword") }
})
```

### verifyPassword()

验证密码是否匹配。

```ts
k.api.get(() => {
    const hashed = k.security.hashPassword("mypassword")
    return { valid: k.security.verifyPassword("mypassword", hashed) }
})
```

## JWT

::: tip 前提条件
JWT 功能需要在后台配置：**站点设置 → 服务集成 → Others → JwtSetting**
:::

### encode()

生成 JWT 令牌。

```ts
k.api.get(() => {
    return { token: k.security.jwt.encode({ name: "user" }) }
})
```

### decode()

解码 JWT 令牌。默认从请求 header 的 `Authorization` 中获取 token，也可以手动传入。

::: tip 注意
`decode()` 返回的是**字符串**，需要 `JSON.parse()` 解析。返回格式为 `"{ code: 0, value: {...} }"` 或 `"{ code: 1, value: \"错误信息\" }"`

**不同错误类型返回不同的 HTTP 状态码：**
- 格式错误（不是3段）：返回 HTTP 400
- 签名错误：返回 HTTP 200
:::

```ts
// 方式1: 不传 token，从 Authorization header 自动获取
k.api.get(() => {
    return k.security.jwt.decode()
})

// 方式2: 手动传入 token
k.api.get(() => {
    const token = "eyJ0eXAi..."
    return k.security.jwt.decode(token)
})

// 解析返回结果
k.api.get(() => {
    const result = JSON.parse(k.security.jwt.decode(token))
    if (result.code === 0) {
        // 成功
        return result.value
    } else {
        // 失败
        return { error: result.value }
    }
})
```
::: tip 最佳实践：try-catch + code 判断
```ts
k.api.post(() => {
    try {
        const result = JSON.parse(k.security.jwt.decode())
        if (result.code === 0) {
            return { success: true, data: result.value }
        } else {
            return { success: false, error: result.value }
        }
    } catch (e) {
        // 格式错误等异常
        return { success: false, error: "Invalid token format" }
    }
})
```
:::
```

## 加密解密

### encrypt() / decrypt()

使用对称加密。

```ts
k.api.get(() => {
    const encrypted = k.security.encrypt("hello", "mykey")
    const decrypted = k.security.decrypt(encrypted, "mykey")
    return { encrypted, decrypted }
})
```

### aesEncrypt() / aesDecrypt()

使用 AES 加密。

```ts
k.api.get(() => {
    const encrypted = k.security.aesEncrypt("hello", "hashkey")
    const decrypted = k.security.aesDecrypt(encrypted, "hashkey")
    return { encrypted, decrypted }
})
```

## HMAC

### hmacMd5()

使用 HMAC-MD5 算法。

```ts
k.api.get(() => {
    return { hmac: k.security.hmacMd5("hello", "key") }
})
```

### hmacSha1()

使用 HMAC-SHA1 算法。

```ts
k.api.get(() => {
    return { hmac: k.security.hmacSha1("hello", "key") }
})
```

### hmacSha256()

使用 HMAC-SHA256 算法。

```ts
k.api.get(() => {
    return { hmac: k.security.hmacSha256("hello", "key") }
})
```

## RSA

### generateKeys()

生成 RSA 密钥对。

```ts
k.api.get(() => {
    return k.security.rsa.generateKeys(2048)
})
// 返回: { "publicKey": "...", "privateKey": "..." }
```

### encrypt() / decrypt()

使用 RSA 加密解密。

```ts
k.api.get(() => {
    const keys = k.security.rsa.generateKeys(2048)
    const encrypted = k.security.rsa.encrypt(keys.publicKey, "message")
    const decrypted = k.security.rsa.decrypt(keys.privateKey, encrypted)
    return { encrypted, decrypted }
})
```

## 相关文档

- [k.request](./request.md) - HTTP 请求信息
- [k.response](./response.md) - HTTP 响应处理
- [k.cookie](./cookie.md) - Cookie 管理

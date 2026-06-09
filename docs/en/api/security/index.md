# k.security

> Security related tools - hashing, encryption, encoding, GUID, JWT, etc.

## Overview

`k.security` provides a series of security-related tools and methods, including: hash algorithm, encryption and decryption, Base64 encoding and decoding, GUID generation, JWT operation, etc.

## TypeScript definition

```ts
interface Security {
  // Hash algorithms
  md5(input: string): string;
  sha1(input: string): string;
  sha256(input: string): string;
  sha512(input: string): string;
  sha256Binary(input: string): string;
  hmacMd5(input: string, key: string): string;
  hmacSha1(input: string, key: string): string;
  hmacSha256(input: string, key: string): string;

  // Encryption and decryption
  encrypt(input: string, key: string): string;
  decrypt(input: string, key: string): string;
  aesEncrypt(input: string, key: string): string;
  aesDecrypt(input: string, key: string): string;

  // Base64 encoding/decoding
  toBase64(input: string | number[]): string;
  fromBase64(input: string): string;
  decodeBase64(input: string): number[];

  // GUID
  newGuid(): string;
  shortGuid(): string;
  hashGuid(input: string, options?: { source?: string }): any;

  // Password
  hashPassword(password: string): string;
  verifyPassword(password: string, saltedPassword: string): boolean;

  // JWT
  jwt: {
    encode(payload: object): string;
    decode(token?: string): string;  // Returns a JSON string; call JSON.parse()
  };

  // RSA
  rsa: {
    generateKeys(keySize: number): { publicKey: string; privateKey: string };
    encrypt(publicKey: string, content: string): string;
    decrypt(privateKey: string, content: string): string;
  };
}
```

## Hash algorithm

### md5()

Computes the MD5 hash of a string.

```ts
k.api.get(() => {
    return { hash: k.security.md5("hello") }
})
// Returns: { "hash": "5D41402ABC4B2A76B9719D911017C592" }
```

### sha256()

Computes the SHA256 hash of a string.

```ts
k.api.get(() => {
    return { hash: k.security.sha256("hello") }
})
// Returns: { "hash": "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824" }
```

### sha512()

Computes the SHA512 hash of a string.

```ts
k.api.get(() => {
    return { hash: k.security.sha512("hello") }
})
```

### sha256Binary()

Computes the SHA256 hash of a string, returning it in binary format.

```ts
k.api.get(() => {
    return { hash: k.security.sha256Binary("hello") }
})
```

## Encoding and decoding

### toBase64()

Convert a string or binary array to Base64 encoding.

```ts
k.api.get(() => {
    return { encoded: k.security.toBase64("hello") }
})
// Returns: { "encoded": "aGVsbG8=" }
```

### fromBase64()

Decode a Base64 string into a normal string.

```ts
k.api.get(() => {
    return { decoded: k.security.fromBase64("aGVsbG8=") }
})
// Returns: { "decoded": "hello" }
```

### decodeBase64()

Decode a Base64 string into a byte array.

```ts
k.api.get(() => {
    return { bytes: k.security.decodeBase64("aGVsbG8=") }
})
// Returns: { "bytes": [104, 101, 108, 108, 111] }
```

## GUID

### newGuid()

Generate a new GUID.

```ts
k.api.get(() => {
    return { guid: k.security.newGuid() }
})
// Returns: { "guid": "85ef9c4fe0ae4a3aa21e9c0a25f609c6" }
```

### shortGuid()

Generate a short form GUID.

```ts
k.api.get(() => {
    return { guid: k.security.shortGuid() }
})
```

### hashGuid()

Generate a Hash GUID based on input.

```ts
k.api.get(() => {
    return k.security.hashGuid("hello")
})

k.api.get(() => {
    return k.security.hashGuid("folder/1.jpg", { source: "FileIo" })
})
```

## password

### hashPassword()

Hashing passwords using built-in best practices.

```ts
k.api.get(() => {
    return { hashed: k.security.hashPassword("mypassword") }
})
```

### verifyPassword()

Verify that the passwords match.

```ts
k.api.get(() => {
    const hashed = k.security.hashPassword("mypassword")
    return { valid: k.security.verifyPassword("mypassword", hashed) }
})
```

## JWT

::: tip prerequisite
The JWT function needs to be configured in the background: **Site Settings → Service Integration → Others → JwtSetting**
:::

### encode()

Generate JWT token.

```ts
k.api.get(() => {
    return { token: k.security.jwt.encode({ name: "user" }) }
})
```

### decode()

Decode the JWT token. By default, the token is obtained from `Authorization` in the request header, but it can also be passed in manually.

::: tip note
`decode()` returns a **string**, which requires `JSON.parse()` to parse. The return format is `"{ code: 0, value: {...} }"` or `"{ code: 1, value: \"error message\" }"`

**Different error types return different HTTP status codes:**

- Bad format (not 3 paragraphs): HTTP 400 returned
- Signing error: HTTP 200 returned
:::

```ts
// Method 1: omit token and read it from the Authorization header
k.api.get(() => {
    return k.security.jwt.decode()
})

// Method 2: pass the token manually
k.api.get(() => {
    const token = "eyJ0eXAi..."
    return k.security.jwt.decode(token)
})

// Parse the returned result
k.api.get(() => {
    const result = JSON.parse(k.security.jwt.decode(token))
    if (result.code === 0) {
        // Success
        return result.value
    } else {
        // Failure
        return { error: result.value }
    }
})
```

::: tip Best practice: try-catch + code judgment

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
        // Invalid format or similar exception
        return { success: false, error: "Invalid token format" }
    }
})
```

:::


## Encryption and decryption

### encrypt() / decrypt()

Use symmetric encryption.

```ts
k.api.get(() => {
    const encrypted = k.security.encrypt("hello", "mykey")
    const decrypted = k.security.decrypt(encrypted, "mykey")
    return { encrypted, decrypted }
})
```

### aesEncrypt() / aesDecrypt()

Use AES encryption.

```ts
k.api.get(() => {
    const encrypted = k.security.aesEncrypt("hello", "hashkey")
    const decrypted = k.security.aesDecrypt(encrypted, "hashkey")
    return { encrypted, decrypted }
})
```

## HMAC

### hmacMd5()

Use HMAC-MD5 algorithm.

```ts
k.api.get(() => {
    return { hmac: k.security.hmacMd5("hello", "key") }
})
```

### hmacSha1()

Use HMAC-SHA1 algorithm.

```ts
k.api.get(() => {
    return { hmac: k.security.hmacSha1("hello", "key") }
})
```

### hmacSha256()

Use HMAC-SHA256 algorithm.

```ts
k.api.get(() => {
    return { hmac: k.security.hmacSha256("hello", "key") }
})
```

## RSA

### generateKeys()

Generate an RSA key pair.

```ts
k.api.get(() => {
    return k.security.rsa.generateKeys(2048)
})
// Returns: { "publicKey": "...", "privateKey": "..." }
```

### encrypt() / decrypt()

Use RSA encryption and decryption.

```ts
k.api.get(() => {
    const keys = k.security.rsa.generateKeys(2048)
    const encrypted = k.security.rsa.encrypt(keys.publicKey, "message")
    const decrypted = k.security.rsa.decrypt(keys.privateKey, encrypted)
    return { encrypted, decrypted }
})
```

## Related Docs

- [k.request](../request/) - HTTP request information
- [k.response](../response/) - HTTP response handling
- [k.cookie](../cookie/) - Cookie Management

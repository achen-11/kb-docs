# k.utils.telnetClient

> Telnet session

## Overview

`k.utils.telnetClient.connect` establishes a Telnet connection and reads and writes the terminal in the callback.

## connect()

| Parameter | Type | Required | Description |
|------|------|------|------|
| `host` | `string` | Yes | Telnet host name or IP |
| `port` | `number` | Yes | Port |
| `callback` | `(client) => void` | Yes | Session callback after connecting |
| `timeout` | `number` | No | Timeout in seconds; default is 30 |

**Returns:** `void`.

```ts
k.utils.telnetClient.connect(host, port, (client) => {
    client.writeLine("help")
    const text = client.read(10)
}, 30)
```

## ConnectedClient

| Method | Description |
|------|------|
| `write` / `writeLine` | Send command |
| `read(timeout?)` | Read output |
| `terminatedRead(terminator, timeout?)` | read terminator |

| Method | Parameter | Return |
|------|------|------|
| `write(command)` | `string` | `void` |
| `writeLine(command)` | `string` | `void` |
| `read(timeout?)` | `number?` | `string` |
| `terminatedRead(terminator, timeout?)` | `string, number?` | `string` |

```ts
k.utils.telnetClient.connect("smtp.example.com", 25, client => {
    const hello = client.terminatedRead("\r\n", 10)
    client.writeLine("HELO kooboo.local")
    const response = client.read(10)
    return { hello, response }
})
```

## Related Docs

- [k.utils Overview](./index.md)

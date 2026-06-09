# k.utils.telnetClient

> Telnet session

## Overview

`k.utils.telnetClient.connect` establishes a Telnet connection and reads and writes the terminal in the callback.

## connect()

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

## Related Docs

- [k.utils Overview](./index.md)

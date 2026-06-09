# k.utils.date

> Date time and formatting

## Overview

`k.utils.date` provides operations and formatting between the current time and `DateTime`.

## Properties

| property | illustrate |
|------|------|
| `utcNow` | UTC current time |
| `now` | local current time |

## format()

Format date (the method name is spelled `formate` in the source code).

```ts
const s = k.utils.date.formate(k.utils.date.now, "yyyy-MM-dd")
const s2 = k.utils.date.formate(k.utils.date.now) // Default format
```

## addSeconds/addMinutes/addHours/addDays/addMonths/addYears

Offset the given `DateTime` and return the new time.

```ts
const tomorrow = k.utils.date.addDays(k.utils.date.now, 1)
```

## Related Docs

- [k.utils Overview](./index.md)

---
title: Bash
tags: [tech, bash]
---

## Keyboard Shortcuts

- Closing a frozen SSH session: <kbd>Enter</kbd> - <kbd>~</kbd> - <kbd>.</kbd>

## Strict Mode

```bash
# Make sure we fail on errors
set -euo pipefail
```

- Exit on non-zero exit codes
- Exit on undefined variable access
- Use any failed exit code as pipeline exit code

<cite>Source: [Unofficial Bash Strict Mode](http://redsymbol.net/articles/unofficial-bash-strict-mode/)</cite>


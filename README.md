# Renegade

Electron + Fluent UI wrapper for the Xeno Roblox executor.

## Features

- **Fluent UI** — Windows 11 design language with dark/light themes
- **OxygenU Theme** — alternative theme inspired by the OxygenU executor
- **Setup Wizard** — downloads RenegadeServer + Xeno automatically
- **Script Execute** — Monaco editor with Lua syntax, tabs, save/load
- **Clients Panel** — real-time Roblox client monitoring via WebSocket
- **Settings** — theme selector, power user mode, streamer mode
- **Script Hub** — search and execute community scripts
- **Auto-Update** — checks for new Xeno versions with user consent

## Architecture

```
Renegade (Electron)
  ├── RenegadeServer (C# .NET 8) — loads Xeno.dll, handles HTTP/WS
  ├── Xeno.dll — Roblox executor (injected via DLL)
  └── Sumi API — download links, version checking
```

## Development

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm package
```

## RenegadeServer

The server is a standalone C# .NET 8 executable. See [RenegadeServer](https://github.com/cookingsometimes/RenegadeServer) for source code.

## License

MIT

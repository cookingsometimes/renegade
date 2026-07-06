# Renegade

Electron wrapper for the Xeno Roblox executor with a custom UI.

Replaces the default Xeno Legacy UI with something more usable — Monaco editor, script management, and real-time client monitoring via a local C# backend.

## What it does

- **Monaco editor** with tabs — write and organize Lua scripts, save/load locally
- **Inject & execute** — attach Xeno to Roblox and run scripts on selected clients
- **Script Hub** — browse ScriptBlox or manage your local scripts
- **Downloads** — installs/updates RenegadeServer and Xeno.dll from the app
- **Client monitoring** — shows injected clients and detected Roblox processes
- **Two UI modes** — compact (750×560, centered nav) or full (1200×800, sidebar)

## How it works

```
Renegade (Electron UI)
  └── RenegadeServer (C# .NET 8) — local HTTP/WS server that loads Xeno.dll
       └── Xeno.dll — the actual executor (closed-source)
```

The app starts a local C# server that manages the Xeno DLL. All injection and execution goes through this server. Downloads and version checks use the Sumi API.

## Dev

```bash
pnpm install
pnpm dev
```

## Build

```bash
pnpm package
```

## Repos

- [RenegadeServer](https://github.com/cookingsometimes/renegade-server) — C# backend

## Ask AI for questions:

- [Renegade Code](https://deepwiki.com/cookingsometimes/renegade)
- [Renegade Server Code](https://deepwiki.com/cookingsometimes/renegade)

## License

MIT

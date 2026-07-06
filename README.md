# Renegade

A custom Electron UI that wraps the [Xeno](https://xeno.now) Roblox executor and replaces the default Xeno Legacy UI with something actually usable — a multi-tab Monaco editor, real-time client monitoring, and integrated script management, all talking to a local C# backend that loads `Xeno.dll`.

If you don't like Xeno's stock interface, Renegade is a drop-in front-end for the same engine. Same DLL, same injection, different (and faster) UI.

---

## What is Xeno?

[Xeno](https://xeno.now) is a keyless Roblox script executor distributed as a closed-source Windows DLL. It handles native Win32 injection into the Roblox client, supports multi-client attach, and exposes a small native API (`Initialize`, `GetClients`, `Attach`, `Execute`, `SetSetting`) that other tools can call into.

Renegade does **not** reimplement Xeno. It downloads the official `Xeno.dll` and drives it through a local server. If you want the raw Xeno experience, you can still use Xeno's own UI — Renegade just gives you a better one on top of the same engine.

---

## What Renegade does

- **Monaco editor with tabs** — write and organize Lua scripts, save and load them locally
- **Inject and execute** — attach Xeno to Roblox and run scripts on the clients you pick
- **Script Hub** — browse [ScriptBlox](https://scriptblox.com) or manage your own local scripts
- **Built-in downloader** — installs and updates `RenegadeServer.exe` and `Xeno.dll` from inside the app via the Sumi API
- **Client monitoring** — shows injected clients and detected Roblox processes in real time
- **Two UI modes** — Compact (750×560, centered nav) or Full (1200×800, sidebar)
- **Live logs and settings** — server logs and Xeno settings are exposed in-app, not hidden behind a console

---

## How it works

Renegade is a three-layer stack. The Electron app never touches Roblox memory directly — that's the DLL's job, brokered by the C# server.

```
Renegade (Electron UI, React 19 + TypeScript + Vite)
  │   HTTP + WebSocket on localhost
  ▼
RenegadeServer (C# .NET 8, self-contained win-x64 .exe)
  │   P/Invoke (DllImport) into Xeno.dll
  ▼
Xeno.dll (closed-source native executor, loaded in-process by the server)
  │   Win32 injection
  ▼
Roblox client(s)
```

**Why the middle layer?** Managing a native DLL from Electron directly is painful (node-ffi, ABI drift, GC issues). `RenegadeServer` owns the DLL's lifecycle — download, version rotation, init, attach, execute — and exposes it as a clean HTTP + WebSocket API. The Electron side just talks to `localhost`.

### RenegadeServer at a glance

The server is a standalone C# .NET 8 app that ships as a single self-contained `win-x64` executable — no .NET runtime install needed on the host. It exposes:

- **HTTP API** — 14 endpoints covering health, version, clients, attach, execute, settings, logs, config, and download/version management
- **WebSocket** — real-time events for client changes, log entries, and download progress, with channel subscriptions
- **Native bridge** — `DllImport` wrappers for `Xeno.dll`'s `Initialize`, `GetClients`, `Attach`, `Execute`, and `SetSetting`

Default bind is `127.0.0.1:8443` (loopback only — the server is not meant to be exposed). CLI flags let you override port, host, Xeno DLL path, log directory, and console logging.

---

## Getting started

```bash
pnpm install
pnpm dev
```

On first launch, the Downloads page will pull `RenegadeServer.exe` and `Xeno.dll` for you. You need a Windows host with the Microsoft Visual C++ Redistributable and the .NET 8 runtime installed (Xeno itself requires both).

### Build

```bash
pnpm package
```

---

## Tech stack

| Layer        | Tech                                              |
| ------------ | ------------------------------------------------- |
| UI           | React 19, TypeScript 6, Vite 8                    |
| Editor       | Monaco Editor                                     |
| Desktop      | Electron + electron-builder                       |
| Backend      | C# .NET 8 (self-contained `win-x64` single-file)  |
| Native engine| `Xeno.dll` (closed-source, official Xeno build)   |
| Package mgr  | pnpm                                              |

---

## Repos

- **Renegade** (this repo) — Electron UI
- [RenegadeServer](https://github.com/cookingsometimes/renegade-server) — C# .NET 8 backend that loads `Xeno.dll` and exposes HTTP + WebSocket APIs

---

## Ask AI

Have questions about the codebase? Ask an AI directly against the source:

- [Renegade code on DeepWiki](https://deepwiki.com/cookingsometimes/renegade)
- [RenegadeServer code on DeepWiki](https://deepwiki.com/cookingsometimes/renegade-server)

---

## Devs

- **Felix** — Owner · [@cookingsometimes](https://github.com/cookingsometimes)
- **Logical Impulse** — Dev · [@Arceegit](https://github.com/Arceegit)

---

## License

MIT.

> The license file in older tags references `electron-fluent-ui`. That dependency was used briefly during the V1.0.0 prototype and is no longer part of the project — current Renegade ships a custom React UI with no Fluent UI components. The MIT license itself still applies.

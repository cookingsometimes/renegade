import { BrowserWindow, app, ipcMain, nativeTheme, session } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "fs";
import { spawn, execSync, type ChildProcess } from "child_process";
import https from "https";
import http from "http";
import {
    initDownloader,
    downloadXeno,
    downloadServer,
    getServerVersionFile,
    isServerInstalled,
    getXenoVersion,
    checkXenoInstalled,
    XENO_DIR,
    SERVER_DIR,
    SERVER_EXE,
    DATA_DIR,
} from "./downloader";
import {
    initUpdater,
    getAppVersion,
    isPortable,
    checkForAppUpdate,
    downloadAppUpdate,
    installPortableUpdate,
    launchSetupAndQuit,
} from "./updater";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
const SERVER_PORT = 3420;

process.on("uncaughtException", (err) => {
    console.error("[Renegade] Uncaught:", err.message);
    process.exit(1);
});
process.on("unhandledRejection", (reason) => {
    console.error("[Renegade] Unhandled:", reason instanceof Error ? reason.message : String(reason));
});

const gotLock = app.requestSingleInstanceLock();
if (!gotLock) {
    app.quit();
} else {
    app.on("second-instance", () => {
        const wins = BrowserWindow.getAllWindows();
        if (wins.length > 0) {
            if (wins[0].isMinimized()) wins[0].restore();
            wins[0].focus();
        }
    });
}

function serverRequest(path: string, method = "GET", body?: string): Promise<Record<string, unknown>> {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "127.0.0.1",
            port: SERVER_PORT,
            path,
            method,
            headers: { "Content-Type": "application/json" },
        };
        const req = http.request(options, (res) => {
            let data = "";
            res.on("data", (chunk) => { data += chunk; });
            res.on("end", () => {
                try { resolve(JSON.parse(data) as Record<string, unknown>); } catch { resolve({ raw: data }); }
            });
        });
        req.on("error", reject);
        req.setTimeout(5000, () => { req.destroy(); reject(new Error("timeout")); });
        if (body) req.write(body);
        req.end();
    });
}

async function checkServerHealth(): Promise<{ status: string; version: string; clients: Array<[number, string, string, number, number]>; mode: string; initialized: boolean }> {
    try {
        const c = new AbortController();
        const res = await fetch(`http://127.0.0.1:${SERVER_PORT}/health`, { signal: c.signal });
        if (!res.ok) throw new Error(`health HTTP ${res.status}`);
        const data = await res.json() as Record<string, unknown>;
        const raw = typeof data.version === "string" ? data.version : "";
        const result = {
            status: "ok",
            version: raw.replace(/^v/, ""),
            clients: parseClients(data.clients),
            mode: typeof data.mode === "string" ? data.mode : "dll",
            initialized: data.initialized === true,
        };
        console.log(`[Renegade] health check OK: version=${result.version}, mode=${result.mode}, initialized=${result.initialized}, clients=${result.clients.length}`);
        return result;
    } catch (e) {
        console.log(`[Renegade] health check FAILED: ${e instanceof Error ? e.message : e}`);
        return { status: "offline", version: "", clients: [], mode: "", initialized: false };
    }
}

function parseClients(raw: unknown): Array<[number, string, string, number, number]> {
    if (Array.isArray(raw)) return raw as Array<[number, string, string, number, number]>;
    if (typeof raw === "string") {
        try {
            const parsed = JSON.parse(raw);
            return Array.isArray(parsed) ? parsed : [];
        } catch { return []; }
    }
    return [];
}

async function startServer(): Promise<{ success: boolean; error?: string }> {
    const exe = join(SERVER_DIR, SERVER_EXE);
    console.log(`[Renegade] startServer: exe=${exe}, exists=${existsSync(exe)}`);
    if (!existsSync(exe)) return { success: false, error: "Server not installed" };

    const health = await checkServerHealth();
    if (health.status === "ok") {
        console.log("[Renegade] Server already running");
        return { success: true };
    }

    console.log("[Renegade] Spawning server...");
    mkdirSync(SERVER_DIR, { recursive: true });

    serverProcess = spawn(exe, [
        "--port", String(SERVER_PORT),
        "--data-dir", DATA_DIR,
        "--xeno-dir", join(DATA_DIR, "xeno"),
        "--versions-dir", join(DATA_DIR, "xeno-versions"),
        "--log-dir", join(DATA_DIR, "logs"),
    ], {
        cwd: SERVER_DIR,
        stdio: "pipe",
        windowsHide: true,
    });

    serverProcess.stdout?.on("data", (d: Buffer) => {
        const m = d.toString().trim();
        if (m) console.log(`[Server] ${m}`);
    });
    serverProcess.stderr?.on("data", (d: Buffer) => {
        const m = d.toString().trim();
        if (m) console.warn(`[Server] ${m}`);
    });
    serverProcess.on("exit", (code) => {
        console.log(`[Server] Exited (code=${code})`);
        setTimeout(async () => {
            const health = await checkServerHealth();
            if (health.status === "ok") {
                console.log("[Renegade] Server process exited but server is still healthy");
            } else {
                serverProcess = null;
                safeSend("app:serverDied");
            }
        }, 1500);
    });

    for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const h = await checkServerHealth();
        if (h.status === "ok") {
            console.log("[Renegade] Server ready");
            return { success: true };
        }
    }
    console.log("[Renegade] Server timeout");
    return { success: false, error: "Server did not start in time" };
}

function stopServer(): void {
    if (serverProcess) {
        try { serverProcess.kill(); } catch { /* ignore */ }
        serverProcess = null;
    }
    try {
        execSync("taskkill /F /IM RenegadeServer.exe 2>nul", { timeout: 3000, windowsHide: true });
    } catch { /* ignore */ }
}

const createWindow = (): BrowserWindow => {
    const preload = join(__dirname, "..", "dist-preload", "index.js");
    let winWidth = 1200;
    let winHeight = 800;
    let winMinW = 900;
    let winMinH = 600;
    try {
        const statePath = join(app.getPath("userData"), "app-state.json");
        if (existsSync(statePath)) {
            const state = JSON.parse(readFileSync(statePath, "utf-8"));
            if (state.uiMode === "compact") {
                winWidth = 750;
                winHeight = 560;
                winMinW = 600;
                winMinH = 450;
            }
        }
    } catch { /* ignore */ }
    const win = new BrowserWindow({
        width: winWidth,
        height: winHeight,
        minWidth: winMinW,
        minHeight: winMinH,
        frame: false,
        titleBarStyle: "hidden",
        webPreferences: { preload, contextIsolation: true, nodeIntegration: false },
        icon: join(__dirname, "..", "build", "icon.png"),
        title: "Renegade",
        show: false,
        backgroundColor: "#0f0f12",
    });
    win.once("ready-to-show", () => { win.show(); win.focus(); });
    return win;
};

const loadContent = (bw: BrowserWindow) => {
    if (process.env.VITE_DEV_SERVER_URL) {
        bw.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        bw.loadFile(join(__dirname, "..", "dist-renderer", "index.html"));
    }
};

async function restartServer(): Promise<{ success: boolean; error?: string }> {
    console.log("[Renegade] Restarting server...");
    stopServer();
    await new Promise((r) => setTimeout(r, 2000));
    return startServer();
}

const safeSend = (channel: string, ...args: unknown[]) => {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const wc = mainWindow.webContents;
        if (!wc || wc.isDestroyed()) return;
        wc.send(channel, ...args);
    } catch { /* ignore */ }
};

const registerIpcHandlers = () => {
    initDownloader(safeSend, serverRequest, restartServer, stopServer);
    initUpdater(safeSend);

    ipcMain.on("window:minimize", () => mainWindow?.minimize());
    ipcMain.on("window:maximize", () => {
        if (mainWindow?.isMaximized()) mainWindow.unmaximize();
        else mainWindow?.maximize();
    });
    ipcMain.on("window:close", () => mainWindow?.close());
    ipcMain.handle("app:isMaximized", () => mainWindow?.isMaximized() ?? false);
    ipcMain.on("app:toggleMaximize", () => {
        if (mainWindow?.isMaximized()) mainWindow.unmaximize();
        else mainWindow?.maximize();
    });
    ipcMain.on("window:setSize", (_e, width: number, height: number) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setSize(width, height);
            mainWindow.center();
        }
    });
    ipcMain.on("window:center", () => mainWindow?.center());
    ipcMain.on("window:setAlwaysOnTop", (_e, onTop: boolean) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            if (onTop) {
                mainWindow.setAlwaysOnTop(true, "screen-saver");
            } else {
                mainWindow.setAlwaysOnTop(false);
            }
        }
    });
    ipcMain.handle("app:isAlwaysOnTop", () => mainWindow?.isAlwaysOnTop() ?? false);

    ipcMain.handle("app:getServerStatus", async () => {
        const installed = isServerInstalled();
        const version = getServerVersionFile();
        const health = await checkServerHealth();
        const running = health.status === "ok";
        console.log(`[Renegade] getServerStatus: installed=${installed}, running=${running}, version="${version}", serverVersion="${health.version}", healthStatus="${health.status}"`);
        return {
            installed,
            version,
            running,
            serverVersion: version,
            clientCount: health.clients.length,
            mode: health.mode,
            initialized: health.initialized,
        };
    });

    ipcMain.handle("app:isXenoInstalled", async () => checkXenoInstalled());
    ipcMain.handle("app:getXenoVersion", async () => getXenoVersion());
    ipcMain.handle("app:startServer", async () => startServer());
    ipcMain.handle("app:stopServer", () => { stopServer(); return { success: true }; });
    ipcMain.handle("app:health", async () => checkServerHealth());
    ipcMain.handle("app:getRobloxProcesses", () => getRobloxProcesses());
    ipcMain.handle("app:getClients", async () => {
        try {
            const data = await serverRequest("/clients");
            return parseClients(data.clients);
        } catch { return []; }
    });
    ipcMain.handle("app:attach", async () => {
        try { await serverRequest("/attach", "POST"); return true; } catch { return false; }
    });
    ipcMain.handle("app:initDll", async () => {
        try { await serverRequest("/init", "POST"); return true; } catch { return false; }
    });
    ipcMain.handle("app:getConfig", async () => {
        try { return await serverRequest("/config"); } catch { return {}; }
    });
    ipcMain.handle("app:execute", async (_e, script: string, pids: number[]) => {
        try {
            const result = await serverRequest("/execute", "POST", JSON.stringify({ script, pids }));
            return { success: result.success === true, error: result.error };
        } catch (e) {
            return { success: false, error: (e as Error).message };
        }
    });
    ipcMain.handle("app:getLogs", async () => {
        try { return await serverRequest("/logs"); } catch { return { logs: [] }; }
    });
    ipcMain.handle("app:getVersion", () => getServerVersionFile());
    ipcMain.handle("app:getServerVersionFile", () => getServerVersionFile());

    ipcMain.handle("app:checkServerUpdate", async () => {
        const current = getServerVersionFile();
        if (!current) return { needsUpdate: false, latestVersion: "" };
        try {
            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 10000);
            const res = await fetch(`https://sumi-api.netlify.app/api/v0/renegade/server/download?myversion=${encodeURIComponent(current)}`, { signal: c.signal });
            clearTimeout(t);
            if (!res.ok) return { needsUpdate: false, latestVersion: "" };
            return await res.json();
        } catch { return { needsUpdate: false, latestVersion: "" }; }
    });

    ipcMain.handle("app:downloadServer", async () => downloadServer());
    ipcMain.handle("app:downloadXeno", async () => downloadXeno());

    ipcMain.handle("app:saveState", (_e, state: Record<string, unknown>) => {
        const filePath = join(app.getPath("userData"), "app-state.json");
        writeFileSync(filePath, JSON.stringify(state, null, 2));
    });
    ipcMain.handle("app:loadState", () => {
        const filePath = join(app.getPath("userData"), "app-state.json");
        if (!existsSync(filePath)) return {};
        try { return JSON.parse(readFileSync(filePath, "utf-8")); } catch { return {}; }
    });

    ipcMain.handle("app:getXenoDir", () => XENO_DIR);
    ipcMain.handle("app:getScriptsDir", () => join(app.getPath("userData"), "scripts"));

    ipcMain.handle("app:saveScript", (_e, name: string, content: string) => {
        const dir = join(app.getPath("userData"), "scripts");
        mkdirSync(dir, { recursive: true });
        writeFileSync(join(dir, `${name}.json`), JSON.stringify({ name, content, saved: Date.now() }, null, 2));
        return join(dir, `${name}.json`);
    });
    ipcMain.handle("app:loadScripts", () => {
        const dir = join(app.getPath("userData"), "scripts");
        if (!existsSync(dir)) return [];
        return readdirSync(dir).filter((f) => f.endsWith(".json")).map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")));
    });
    ipcMain.handle("app:deleteScript", (_e, name: string) => {
        const filePath = join(app.getPath("userData"), "scripts", `${name}.json`);
        if (existsSync(filePath)) unlinkSync(filePath);
    });

    const scriptbloxCache = new Map<string, { data: unknown; ts: number }>();
    const CACHE_TTL = 5 * 60 * 1000;
    function cacheGet(key: string): unknown | null {
        const e = scriptbloxCache.get(key);
        if (!e) return null;
        if (Date.now() - e.ts > CACHE_TTL) { scriptbloxCache.delete(key); return null; }
        return e.data;
    }
    function cacheSet(key: string, data: unknown) {
        if (scriptbloxCache.size > 200) {
            const oldest = scriptbloxCache.keys().next().value;
            if (oldest) scriptbloxCache.delete(oldest);
        }
        scriptbloxCache.set(key, { data, ts: Date.now() });
    }
    function fetchJson(url: string): Promise<unknown> {
        return new Promise((resolve, reject) => {
            const req = https.get(url, { headers: { "User-Agent": "Renegade/2.0" } }, (res) => {
                let body = "";
                res.on("data", (chunk: Buffer) => { body += chunk.toString(); });
                res.on("end", () => {
                    try { resolve(JSON.parse(body)); }
                    catch { reject(new Error("Invalid JSON")); }
                });
            });
            req.on("error", reject);
            req.setTimeout(10000, () => { req.destroy(); reject(new Error("Timeout")); });
        });
    }

    ipcMain.handle("scriptblox:search", async (_e, query: string, page: number) => {
        const key = `search:${query}:${page}`;
        const cached = cacheGet(key);
        if (cached) return cached;
        const url = `https://scriptblox.com/api/script/search?q=${encodeURIComponent(query)}&page=${page}&max=20`;
        const data = await fetchJson(url);
        cacheSet(key, data);
        return data;
    });
    ipcMain.handle("scriptblox:trending", async () => {
        const key = "trending";
        const cached = cacheGet(key);
        if (cached) return cached;
        const data = await fetchJson("https://scriptblox.com/api/script/trending");
        cacheSet(key, data);
        return data;
    });
    ipcMain.handle("scriptblox:source", async (_e, slug: string) => {
        const key = `source:${slug}`;
        const cached = cacheGet(key);
        if (cached) return cached;
        const data = await fetchJson(`https://scriptblox.com/api/script/${encodeURIComponent(slug)}`);
        cacheSet(key, data);
        return data;
    });

    ipcMain.handle("app:getAppVersion", () => getAppVersion());
    ipcMain.handle("app:isPortable", () => isPortable());
    ipcMain.handle("app:checkForAppUpdate", async () => {
        try {
            return await checkForAppUpdate();
        } catch {
            return { available: false, latestVersion: "", currentVersion: "", downloadUrl: "", filename: "", isPortable: false };
        }
    });
    ipcMain.handle("app:downloadAppUpdate", async (_e, downloadUrl: string, filename: string) => {
        return downloadAppUpdate(downloadUrl, filename);
    });
    ipcMain.handle("app:installPortableUpdate", async (_e, filePath: string) => {
        return installPortableUpdate(filePath);
    });
    ipcMain.on("app:launchSetupAndQuit", (_e, setupPath: string) => {
        launchSetupAndQuit(setupPath);
    });

    ipcMain.handle("app:setInstallComplete", () => {
        const flagPath = join(app.getPath("userData"), ".install-complete");
        writeFileSync(flagPath, "1", "utf-8");
    });

    ipcMain.handle("app:checkInstallComplete", () => {
        const flagPath = join(app.getPath("userData"), ".install-complete");
        if (existsSync(flagPath)) {
            try { unlinkSync(flagPath); } catch { /* ignore */ }
            return true;
        }
        return false;
    });
};

function getRobloxProcesses(): Array<{ pid: number; name: string }> {
    try {
        const output = execSync('tasklist /FI "IMAGENAME eq RobloxPlayerBeta.exe" /FO CSV /NH', { encoding: "utf-8", timeout: 5000 });
        const lines = output.trim().split("\n").filter((l) => l.includes("RobloxPlayerBeta"));
        return lines.map((line) => {
            const parts = line.split(",").map((p) => p.replace(/"/g, "").trim());
            return { pid: parseInt(parts[1], 10), name: parts[0] };
        }).filter((p) => !isNaN(p.pid));
    } catch { return []; }
}

nativeTheme.addListener("updated", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.webContents.send("nativeThemeChanged", nativeTheme.shouldUseDarkColors);
    }
});

(async () => {
    await app.whenReady();
    mainWindow = createWindow();
    loadContent(mainWindow);
    registerIpcHandlers();

    session.defaultSession.webRequest.onHeadersReceived((details, callback) => {
        callback({
            responseHeaders: {
                ...details.responseHeaders,
                "Content-Security-Policy": [
                    "default-src 'self'; " +
                    "script-src 'self' 'unsafe-inline' 'unsafe-eval'; " +
                    "style-src 'self' 'unsafe-inline'; " +
                    "img-src 'self' data: blob:; " +
                    "worker-src 'self' blob:; " +
                    "connect-src 'self' http://127.0.0.1:* https://sumi-api.netlify.app https://encrypted-bytes.com https://cdnjs.cloudflare.com https://scriptblox.com; " +
                    "font-src 'self' https://cdnjs.cloudflare.com;"
                ],
            },
        });
    });

    startServer().catch((e) => console.log(`[Renegade] Background start: ${e}`));

    app.on("before-quit", () => stopServer());
    app.on("window-all-closed", () => {
        stopServer();
        app.quit();
    });
})();

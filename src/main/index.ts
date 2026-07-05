import { BrowserWindow, app, clipboard, ipcMain, nativeTheme } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync, createWriteStream } from "fs";
import { XenoManager } from "@common/XenoManager";
import type { ExecutionLog } from "@common/types";
import { spawn, execSync, type ChildProcess } from "child_process";
import https from "https";
import http from "http";
import { pipeline } from "stream/promises";
import { XenoServerClient } from "./XenoServerClient";

let mainWindow: BrowserWindow | null = null;
const xenoManager = new XenoManager();
let clientPollTimer: ReturnType<typeof setInterval> | null = null;
const executionLog: ExecutionLog[] = [];
let xenoServerProcess: ChildProcess | null = null;
let xenoServerClient: XenoServerClient | null = null;
const SERVER_PORT = 3420;
process.on("uncaughtException", (err: Error) => {
    console.error("[Main] Uncaught:", err.message);
    try { xenoManager.log("error", "Main", `Uncaught: ${err.message}`); } catch { /* ignore */ }
    process.exit(1);
});

process.on("unhandledRejection", (reason: unknown) => {
    const msg = reason instanceof Error ? reason.message : String(reason);
    console.error("[Main] Unhandled:", msg);
    try { xenoManager.log("error", "Main", `Unhandled: ${msg}`); } catch { /* ignore */ }
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

const SERVER_EXE = "RenegadeServer.exe";
const SERVER_DIR = join(app.getPath("userData"), "server");
const DATA_DIR = app.getPath("userData");
const XENO_DIR = join(DATA_DIR, "xeno");
const XENO_VERSIONS_DIR = join(DATA_DIR, "xeno-versions");
const SUMI_XENO_API = "https://sumi-api.netlify.app/api/v0/rblx/executors/dl/xeno";
const SUMI_SERVER_API = "https://sumi-api.netlify.app/api/v0/renegade/server/download";
const XENO_MAX_RETRIES = 5;
const XENO_RETRY_TIMEOUT = 20000;
const SERVER_VERSION_FILE = join(SERVER_DIR, "version.txt");

async function ensureServerRunning(): Promise<XenoServerClient> {
    const client = new XenoServerClient(SERVER_PORT);

    try {
        await client.health();
        xenoServerClient = client;
        return client;
    } catch { /* ignore */ }

    const appdataExe = join(SERVER_DIR, SERVER_EXE);
    const serverExe = existsSync(appdataExe) ? appdataExe : "";

    if (!serverExe) {
        xenoManager.log("info", "Server", "Server not found, use SetupScreen to download.");
        throw new Error("Server not installed");
    }

    mkdirSync(SERVER_DIR, { recursive: true });
    xenoManager.log("info", "Server", `Starting from ${serverExe}`);

    xenoServerProcess = spawn(serverExe, [
        "--port", String(SERVER_PORT),
        "--data-dir", DATA_DIR,
        "--xeno-dir", join(DATA_DIR, "xeno"),
        "--versions-dir", join(DATA_DIR, "xeno-versions"),
        "--log-dir", join(DATA_DIR, "logs"),
        "--clean",
    ], {
        cwd: SERVER_DIR,
        stdio: "pipe",
        windowsHide: true,
    });

    xenoServerProcess.stdout?.on("data", (d: Buffer) => {
        const m = d.toString().trim();
        if (m) xenoManager.log("debug", "Server", m);
    });
    xenoServerProcess.stderr?.on("data", (d: Buffer) => {
        const m = d.toString().trim();
        if (m) xenoManager.log("warn", "Server", m);
    });
    xenoServerProcess.on("exit", (code) => {
        xenoManager.log("warn", "Server", `Exited (code=${code})`);
        xenoServerProcess = null;
    });

    for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        try {
            await client.health();
            xenoServerClient = client;
            xenoManager.log("info", "Server", `Ready (port ${SERVER_PORT})`);
            return client;
        } catch { /* ignore */ }
    }

    throw new Error("Server did not start within 30 seconds");
}

function stopServerProcess(): void {
    try { xenoServerClient?.disconnect(); xenoServerClient = null; } catch { /* ignore */ }
    if (xenoServerProcess) {
        try { xenoServerProcess.kill(); } catch { /* ignore */ }
        xenoServerProcess = null;
    }
}

const safeSend = (channel: string, ...args: unknown[]) => {
    try {
        if (!mainWindow || mainWindow.isDestroyed()) return;
        const wc = mainWindow.webContents;
        if (!wc || wc.isDestroyed()) return;
        (wc.send as unknown as (...a: unknown[]) => Promise<unknown>)(channel, ...args).catch(() => { /* ignore */ });
    } catch { /* ignore */ }
};

const createBrowserWindow = (): BrowserWindow => {
    const preload = join(__dirname, "..", "dist-preload", "index.js");
    const win = new BrowserWindow({
        autoHideMenuBar: true,
        backgroundMaterial: "mica",
        vibrancy: "header",
        width: 1200,
        height: 800,
        minWidth: 900,
        minHeight: 600,
        webPreferences: { preload },
        icon: join(__dirname, "..", "build", "icon.png"),
        title: "Renegade",
        show: false,
    });
    win.once("ready-to-show", () => { win.show(); win.focus(); });
    return win;
};

const loadFileOrUrl = (bw: BrowserWindow) => {
    if (process.env.VITE_DEV_SERVER_URL) {
        bw.loadURL(process.env.VITE_DEV_SERVER_URL);
    } else {
        bw.loadFile(join(__dirname, "..", "dist-renderer", "index.html"));
    }
};

const SUMI_API = "https://sumi-api.netlify.app/api/v0/rblx/executors/dl/xeno";

async function searchScriptsApi(query: string): Promise<unknown[]> {
    const res = await fetch(`${SUMI_API}?search=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as { hits?: unknown[] };
    return data.hits ?? [];
}

async function fetchTrendingApi(): Promise<unknown[]> {
    const res = await fetch(SUMI_API, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return [];
    const data = await res.json() as { hits?: unknown[] };
    return data.hits ?? [];
}

function downloadWithProgress(url: string, dest: string, onBytes: (n: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const mod = parsed.protocol === "https:" ? https : http;
        const req = mod.get(url, {
            headers: { "User-Agent": "Renegade/1.0" },
            rejectUnauthorized: false,
            timeout: 120000,
        }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadWithProgress(res.headers.location, dest, onBytes).then(resolve, reject);
                return;
            }
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const file = createWriteStream(dest);
            let received = 0;
            res.on("data", (chunk: Buffer) => {
                received += chunk.length;
                onBytes(received);
            });
            pipeline(res, file).then(() => resolve(), reject);
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Download timeout")); });
    });
}

function getServerVersion(): string {
    if (!existsSync(SERVER_VERSION_FILE)) return "";
    try {
        return readFileSync(SERVER_VERSION_FILE, "utf-8").trim();
    } catch { return ""; }
}

function setServerVersion(version: string): void {
    mkdirSync(SERVER_DIR, { recursive: true });
    writeFileSync(SERVER_VERSION_FILE, version, "utf-8");
}

async function checkServerUpdate(): Promise<{ needsUpdate: boolean; latestVersion: string }> {
    const current = getServerVersion();
    if (!current) return { needsUpdate: false, latestVersion: "" };
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(`${SUMI_SERVER_API}?myversion=${encodeURIComponent(current)}`, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) return { needsUpdate: false, latestVersion: "" };
        return await res.json() as { needsUpdate: boolean; latestVersion: string };
    } catch { return { needsUpdate: false, latestVersion: "" }; }
}

async function downloadServerFromSumi(event?: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
        const controller = new AbortController();
        const timer = setTimeout(() => controller.abort(), 10000);
        const res = await fetch(SUMI_SERVER_API, { signal: controller.signal });
        clearTimeout(timer);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json() as { sources?: Array<{ url: string; filename: string }>; version?: string; latestVersion?: string };
        if (!data.sources || data.sources.length === 0) throw new Error("No download sources");
        const src = data.sources[0];
        const version = data.latestVersion || data.version || "1.0.0";

        mkdirSync(SERVER_DIR, { recursive: true });
        const dest = join(SERVER_DIR, src.filename);
        xenoManager.log("info", "Server", `Downloading v${version}...`);

        await downloadWithProgress(src.url, dest, (bytes) => {
            if (event) event.sender.send("setup:downloadProgress", bytes);
        });

        setServerVersion(version);
        xenoManager.log("info", "Server", `Downloaded v${version}`);
        return { success: true, version };
    } catch (e) {
        const msg = (e as Error).message;
        xenoManager.log("error", "Server", `Download failed: ${msg}`);
        return { success: false, error: msg };
    }
}

async function fetchXenoDownloadUrl(): Promise<{ url: string; version: string; file: string }> {
    for (let attempt = 1; attempt <= XENO_MAX_RETRIES; attempt++) {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), XENO_RETRY_TIMEOUT);
            const res = await fetch(SUMI_XENO_API, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            const data = await res.json() as { hits?: Array<{ handler: string; file: string; url: string }> };
            if (!data.hits) throw new Error("No hits in response");
            for (const hit of data.hits) {
                if (hit.handler === "relativeZipPath") {
                    const match = hit.file.match(/v([\d.]+)/);
                    const version = match ? match[1] : "unknown";
                    return { url: hit.url, version, file: hit.file };
                }
            }
            throw new Error("No ZIP hit found");
        } catch (e) {
            xenoManager.log("warn", "Xeno", `Attempt ${attempt}/${XENO_MAX_RETRIES} failed: ${(e as Error).message}`);
            if (attempt < XENO_MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000 * attempt));
            else throw e;
        }
    }
    throw new Error("Failed to fetch download URL");
}

async function downloadXenoFromSumi(event?: Electron.IpcMainInvokeEvent): Promise<{ success: boolean; version?: string; error?: string }> {
    try {
        xenoManager.setDownloadState("fetching_url");
        const { url, version, file } = await fetchXenoDownloadUrl();
        xenoManager.log("info", "Xeno", `Found v${version} (${file})`);

        const versionDir = join(XENO_VERSIONS_DIR, version);
        const zipPath = join(versionDir, "Xeno.zip");

        mkdirSync(versionDir, { recursive: true });

        for (let attempt = 1; attempt <= XENO_MAX_RETRIES; attempt++) {
            try {
                xenoManager.setDownloadState("downloading", 0);
                xenoManager.log("info", "Xeno", `Download attempt ${attempt}/${XENO_MAX_RETRIES}`);
                await downloadWithProgress(url, zipPath, (bytes) => {
                    if (event) event.sender.send("xeno:downloadProgress", bytes);
                });
                break;
            } catch (e) {
                xenoManager.log("error", "Xeno", `Attempt ${attempt} failed: ${(e as Error).message}`);
                if (attempt < XENO_MAX_RETRIES) await new Promise((r) => setTimeout(r, 2000 * attempt));
                else throw e;
            }
        }

        xenoManager.setDownloadState("extracting", 100);
        xenoManager.log("info", "Xeno", "Extracting...");
        await extractXenoZip(zipPath, versionDir);

        const dllPath = join(versionDir, "Xeno.dll");
        if (!existsSync(dllPath)) throw new Error("Xeno.dll not found after extraction");

        xenoManager.setDownloadState("ready", 100);
        xenoManager.log("info", "Xeno", `v${version} ready at ${versionDir}`);
        return { success: true, version };
    } catch (e) {
        const msg = (e as Error).message;
        xenoManager.setDownloadState("error", 0, msg);
        xenoManager.log("error", "Xeno", `Download failed: ${msg}`);
        return { success: false, error: msg };
    }
}

async function extractXenoZip(zipPath: string, targetDir: string): Promise<void> {
    const extract = (await import("extract-zip")).default;
    await extract(zipPath, { dir: targetDir });
}

function getXenoVersion(): string {
    const xenoDir = XENO_DIR;
    const dllPath = join(xenoDir, "Xeno.dll");
    if (!existsSync(dllPath)) return "";
    try {
        const out = execSync(`powershell -Command "(Get-Item '${dllPath}').VersionInfo.FileVersion"`, { encoding: "utf-8" }).trim();
        return out || "";
    } catch { return ""; }
}

function isXenoDownloaded(): boolean {
    return existsSync(join(XENO_DIR, "Xeno.dll"));
}

const registerIpcHandlers = () => {
    ipcMain.on("themeShouldUseDarkColors", (event) => {
        event.returnValue = nativeTheme.shouldUseDarkColors;
    });

    ipcMain.handle("xeno:getStatus", async () => ({
        running: !!(xenoServerClient && xenoServerClient.isConnected()),
        version: xenoManager.getCurrentVersion(),
        attached: xenoServerClient?.isConnected() ?? false,
    }));

    ipcMain.handle("xeno:isDownloaded", async () => {
        if (!xenoServerClient) return false;
        try { return (await xenoServerClient.isDownloaded()).downloaded; } catch { return false; }
    });

    ipcMain.handle("xeno:getDownloadState", () => xenoManager.getDownloadState());

    ipcMain.handle("xeno:downloadServer", async () => {
        try {
            await ensureServerRunning();
        } catch (e) {
            xenoManager.log("error", "Server", `Download/start failed: ${(e as Error).message}`);
            throw e;
        }
    });

    ipcMain.handle("setup:getSources", async () => {
        try {
            const controller = new AbortController();
            const timer = setTimeout(() => controller.abort(), 10000);
            const res = await fetch(SUMI_SERVER_API, { signal: controller.signal });
            clearTimeout(timer);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);
            return await res.json() as { sources: Array<{ name: string; url: string; filename: string }>; version?: string };
        } catch (e) {
            return { sources: [], error: (e as Error).message };
        }
    });

    ipcMain.handle("setup:downloadFromSource", async (event, _url: string, _filename: string) => {
        return downloadServerFromSumi(event);
    });

    ipcMain.handle("setup:startServer", async () => {
        try {
            await ensureServerRunning();
            return { success: true };
        } catch (e) {
            return { success: false, error: (e as Error).message };
        }
    });

    ipcMain.handle("server:getVersion", () => {
        return getServerVersion();
    });

    ipcMain.handle("server:checkUpdate", async () => {
        return checkServerUpdate();
    });

    ipcMain.handle("server:update", async (event) => {
        stopServerProcess();
        return downloadServerFromSumi(event);
    });

    ipcMain.handle("xeno:download", async (event) => {
        return downloadXenoFromSumi(event);
    });

    ipcMain.handle("xeno:isDownloaded", () => {
        return isXenoDownloaded();
    });

    ipcMain.handle("xeno:getVersion", () => {
        return getXenoVersion();
    });

    ipcMain.handle("xeno:stop", () => {
        if (xenoServerClient) xenoServerClient.stop().catch(() => {});
    });

    ipcMain.handle("xeno:updateCheck", () => {
        if (!xenoServerClient) return { needsUpdate: false, latestVersion: "" };
        return xenoServerClient.checkUpdates(xenoManager.getCurrentVersion());
    });

    ipcMain.handle("xeno:update", async (event) => {
        return downloadXenoFromSumi(event);
    });

    ipcMain.handle("xeno:getClients", async () => {
        if (!xenoServerClient) return [];
        try { return await xenoServerClient.getClients(); } catch { return []; }
    });

    ipcMain.handle("xeno:execute", async (_event, script: string, pids: string[]) => {
        if (!xenoServerClient) return { success: false, error: "Server not running" };
        try {
            const ok = await xenoServerClient.execute(script, pids.map(Number));
            return { success: ok };
        } catch (e) {
            return { success: false, error: (e as Error).message };
        }
    });

    ipcMain.handle("xeno:searchScripts", (_event, query: string) => searchScriptsApi(query));
    ipcMain.handle("xeno:trending", () => fetchTrendingApi());

    ipcMain.handle("clipboard:read", () => clipboard.readText());
    ipcMain.handle("clipboard:write", (_event, text: string) => clipboard.writeText(text));
    ipcMain.handle("clipboard:clear", () => clipboard.clear());

    ipcMain.handle("script:save", (_event, name: string, content: string) => {
        const dir = join(app.getPath("userData"), "scripts");
        mkdirSync(dir, { recursive: true });
        const filePath = join(dir, `${name}.json`);
        writeFileSync(filePath, JSON.stringify({ name, content, createdAt: Date.now(), updatedAt: Date.now() }, null, 2));
        return filePath;
    });

    ipcMain.handle("script:loadAll", () => {
        const dir = join(app.getPath("userData"), "scripts");
        if (!existsSync(dir)) return [];
        return readdirSync(dir)
            .filter((f) => f.endsWith(".json"))
            .map((f) => JSON.parse(readFileSync(join(dir, f), "utf-8")));
    });

    ipcMain.handle("script:delete", (_event, name: string) => {
        const dir = join(app.getPath("userData"), "scripts");
        const filePath = join(dir, `${name}.json`);
        if (existsSync(filePath)) unlinkSync(filePath);
    });

    ipcMain.handle("xeno:getExecutionLog", () => executionLog);
    ipcMain.handle("xeno:getXenoDir", () => xenoManager.getXenoDir());
    ipcMain.handle("xeno:getScriptsDir", () => join(app.getPath("userData"), "scripts"));
    ipcMain.handle("xeno:getLogs", () => xenoManager.getLogs());
    ipcMain.handle("xeno:clearLogs", () => { xenoManager.getLogs().length = 0; });

    ipcMain.handle("app:saveState", (_event, state: Record<string, unknown>) => {
        const filePath = join(app.getPath("userData"), "app-state.json");
        writeFileSync(filePath, JSON.stringify(state, null, 2));
    });

    ipcMain.handle("app:loadState", () => {
        const filePath = join(app.getPath("userData"), "app-state.json");
        if (!existsSync(filePath)) return {};
        try { return JSON.parse(readFileSync(filePath, "utf-8")); } catch { return {}; }
    });

    ipcMain.handle("xeno:getProxyUrl", () => `http://127.0.0.1:${SERVER_PORT}`);

    ipcMain.handle("xeno:proxyHealth", async () => {
        if (!xenoServerClient) return { status: "offline", version: "", clients: [], proxyPort: 0, mode: "dll" };
        try {
            const s = await xenoServerClient.health();
            return { status: s.status, version: s.version || "", clients: s.clients || [], proxyPort: SERVER_PORT, mode: s.mode };
        } catch { return { status: "offline", version: "", clients: [], proxyPort: 0, mode: "dll" }; }
    });

    ipcMain.handle("xeno:proxyGetClients", async () => {
        if (!xenoServerClient) return [];
        try { return await xenoServerClient.getClients(); } catch { return []; }
    });

    ipcMain.handle("xeno:proxyAttach", async () => {
        if (!xenoServerClient) return false;
        try { return await xenoServerClient.attach(); } catch { return false; }
    });

    ipcMain.handle("xeno:proxyExecute", async (_event, script: string, pids: number[]) => {
        if (!xenoServerClient) return { success: false };
        try {
            const ok = await xenoServerClient.execute(script, pids);
            return { success: ok, results: pids.map(pid => ({ pid, success: ok })) };
        } catch (e) {
            return { success: false, results: pids.map(pid => ({ pid, success: false, error: (e as Error).message })) };
        }
    });

    ipcMain.handle("xeno:proxySetSetting", async (_event, settingID: number, value: number) => {
        if (!xenoServerClient) return false;
        try { return await xenoServerClient.setSetting(settingID, value); } catch { return false; }
    });

    ipcMain.handle("xeno:proxyGetVersion", async () => {
        if (!xenoServerClient) return "";
        try { return await xenoServerClient.getVersion(); } catch { return ""; }
    });

    ipcMain.handle("xeno:proxyGetLogs", async () => {
        if (!xenoServerClient) return { logs: [] };
        try { return await xenoServerClient.getLogs(100); } catch { return { logs: [] }; }
    });
};

const registerNativeThemeEventListeners = (windows: BrowserWindow[]) => {
    nativeTheme.addListener("updated", () => {
        for (const w of windows) w.webContents.send("nativeThemeChanged");
    });
};

const backgroundStartup = async () => {
    let client: XenoServerClient;
    try {
        client = await ensureServerRunning();
    } catch (e) {
        xenoManager.setDownloadState("error", 0, `Failed to start server: ${(e as Error).message}`);
        return;
    }

    safeSend("xeno:proxyUrl", `http://127.0.0.1:${SERVER_PORT}`);

    const pollClients = async () => {
        try {
            const clients = await client.getClients();
            safeSend("xeno:clientsChanged", clients);
        } catch { /* ignore */ }
    };

    try { await pollClients(); } catch { /* ignore */ }
    if (clientPollTimer) clearInterval(clientPollTimer);
    clientPollTimer = setInterval(pollClients, 2000);

    xenoManager.setDownloadState("ready", 100);
};

const UPDATE_CHECK_INTERVAL = 30 * 60 * 1000;

(async () => {
    await app.whenReady();

    mainWindow = createBrowserWindow();
    loadFileOrUrl(mainWindow);
    xenoManager.setMainWindow(mainWindow);
    registerIpcHandlers();
    registerNativeThemeEventListeners(BrowserWindow.getAllWindows());

    backgroundStartup();

    app.on("before-quit", () => {
        try {
            if (clientPollTimer) { clearInterval(clientPollTimer); clientPollTimer = null; }
            stopServerProcess();
        } catch { /* ignore */ }
    });

    app.on("window-all-closed", () => {
        try {
            if (clientPollTimer) { clearInterval(clientPollTimer); clientPollTimer = null; }
            stopServerProcess();
        } catch { /* ignore */ }
        app.quit();
    });

    setInterval(async () => {
        const version = xenoManager.getCurrentVersion();
        if (!version) return;
        const update = await xenoManager.checkForUpdates(version);
        if (update.needsUpdate) safeSend("xeno:updateAvailable", update);
    }, UPDATE_CHECK_INTERVAL);
})();

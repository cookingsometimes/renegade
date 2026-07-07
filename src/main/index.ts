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
    downloadVelocity,
    getServerVersionFile,
    isServerInstalled,
    isVelocityInstalled,
    getVelocityVersionFile,
    getXenoVersion,
    checkXenoInstalled,
    XENO_DIR,
    SERVER_DIR,
    SERVER_EXE,
    DATA_DIR,
    VELOCITY_DIR,
} from "./downloader";
import {
    initUpdater,
    getAppVersion,
    checkForAppUpdate,
    downloadAppUpdate,
    finalizePortable,
    finalizeSetup,
} from "./updater";
import * as logger from "./logger";

let mainWindow: BrowserWindow | null = null;
let serverProcess: ChildProcess | null = null;
let serverCrashCount = 0;
let serverRestartTimer: ReturnType<typeof setTimeout> | null = null;
const MAX_SERVER_CRASHES = 3;
const SERVER_PORT = 3420;
let currentExecutor: "xeno" | "velocity" = "xeno";

const SRC = "Main";

function setupGlobalErrorHandlers(): void {
    process.on("uncaughtException", (err) => {
        logger.error(SRC, `Uncaught exception: ${err.message}`, err);
        process.exit(1);
    });
    process.on("unhandledRejection", (reason) => {
        const msg = reason instanceof Error ? reason.message : String(reason);
        const err = reason instanceof Error ? reason : undefined;
        logger.error(SRC, `Unhandled rejection: ${msg}`, err);
    });
}

setupGlobalErrorHandlers();

logger.initCrashLog();

const crashRecovery = logger.getCrashRecovery();
if (crashRecovery && crashRecovery.count > 0 && crashRecovery.count <= 3) {
    logger.warn(SRC, `App recovered from previous crash (count=${crashRecovery.count})`);
}
logger.clearCrashRecovery();

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
                try { resolve(JSON.parse(data) as Record<string, unknown>); } catch {
                    logger.warn(SRC, `Non-JSON response from ${path}`);
                    resolve({ raw: data });
                }
            });
        });
        req.on("error", (e) => {
            logger.error(SRC, `Server request failed: ${path}`, e);
            reject(e);
        });
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
        logger.info(SRC, `Health OK: version=${result.version}, mode=${result.mode}, initialized=${result.initialized}, clients=${result.clients.length}`);
        return result;
    } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        logger.debug(SRC, `Health FAILED: ${msg}`);
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
    logger.info(SRC, `startServer: exe=${exe}, exists=${existsSync(exe)}`);
    if (!existsSync(exe)) return { success: false, error: "Server not installed" };

    const health = await checkServerHealth();
    if (health.status === "ok") {
        logger.info(SRC, "Server already running");
        return { success: true };
    }

    logger.info(SRC, "Spawning server...");
    mkdirSync(SERVER_DIR, { recursive: true });

    const args = [
        "--port", String(SERVER_PORT),
        "--data-dir", DATA_DIR,
        "--xeno-dir", join(DATA_DIR, "xeno"),
        "--versions-dir", join(DATA_DIR, "xeno-versions"),
        "--log-dir", join(DATA_DIR, "logs"),
    ];
    if (currentExecutor === "velocity") {
        args.push("--velocity-dir", join(DATA_DIR, "velocity"));
    }

    if (currentExecutor === "velocity") {
        const psArgList = args.map((a) => `'${a}'`).join(", ");
        const psCmd = `Start-Process -FilePath '${exe}' -ArgumentList ${psArgList} -Verb RunAs -WindowStyle Hidden -PassThru | Select-Object -ExpandProperty Id`;
        logger.info(SRC, `Spawning server elevated`);
        try {
            const output = execSync(`powershell -NoProfile -Command "${psCmd.replace(/"/g, '\\"')}"`, { encoding: "utf-8", timeout: 15000 }).trim();
            const pid = parseInt(output, 10);
            if (!isNaN(pid)) {
                serverProcess = { pid } as ChildProcess;
                logger.info(SRC, `Server started with PID ${pid}`);
            } else {
                logger.warn(SRC, `Failed to parse server PID from: ${output}`);
            }
        } catch (e) {
            logger.error(SRC, `Failed to start elevated server: ${(e as Error).message}`);
            return { success: false, error: "Failed to start server as admin" };
        }
    } else {
        serverProcess = spawn(exe, args, {
            cwd: SERVER_DIR,
            stdio: "pipe",
            windowsHide: true,
        });
    }

    if (serverProcess) {
        serverProcess.stdout?.on("data", (d: Buffer) => {
            const m = d.toString().trim();
            if (m) logger.info("Server", m);
        });
        serverProcess.stderr?.on("data", (d: Buffer) => {
            const m = d.toString().trim();
            if (m) logger.warn("Server", m);
        });
        serverProcess.on("exit", (code) => {
            logger.info(SRC, `Server exitted (code=${code})`);
            setTimeout(async () => {
                const h = await checkServerHealth();
                if (h.status === "ok") {
                    logger.info(SRC, "Server process exitted but server is still healthy");
                    serverCrashCount = 0;
                } else {
                    serverProcess = null;
                    serverCrashCount++;
                    logger.warn(SRC, `Server died unexpectedly (crash #${serverCrashCount}/${MAX_SERVER_CRASHES})`);
                    safeSend("app:serverDied");

                    if (serverCrashCount <= MAX_SERVER_CRASHES) {
                        const delay = Math.min(serverCrashCount * 3000, 10000);
                        logger.info(SRC, `Auto-restarting server in ${delay}ms (attempt ${serverCrashCount})`);
                        safeSend("app:toast", { message: `Server crashed. Restarting in ${delay / 1000}s (${serverCrashCount}/${MAX_SERVER_CRASHES})...`, level: "warn" });
                        if (serverRestartTimer) clearTimeout(serverRestartTimer);
                        serverRestartTimer = setTimeout(async () => {
                            const alive = await checkServerHealth();
                            if (alive.status === "ok") {
                                serverCrashCount = 0;
                                return;
                            }
                            const r = await startServer();
                            if (r.success) {
                                serverCrashCount = 0;
                                logger.info(SRC, "Server auto-restart successful");
                                safeSend("app:toast", { message: "Server restarted successfully", level: "success" });
                            } else {
                                logger.error(SRC, `Server auto-restart failed: ${r.error}`);
                                safeSend("app:toast", { message: `Server restart failed: ${r.error}`, level: "error" });
                            }
                        }, delay);
                    } else {
                        logger.error(SRC, `Server crashed ${MAX_SERVER_CRASHES} times, giving up`);
                        safeSend("app:toast", { message: `Server crashed ${MAX_SERVER_CRASHES} times. Please restart manually.`, level: "error" });
                    }
                }
            }, 1500);
        });
    }

    for (let i = 0; i < 30; i++) {
        await new Promise((r) => setTimeout(r, 1000));
        const h = await checkServerHealth();
        if (h.status === "ok") {
            logger.info(SRC, "Server ready");
            return { success: true };
        }
    }
    logger.error(SRC, "Server did not start in time");
    return { success: false, error: "Server did not start in time" };
}

function stopServer(): void {
    if (serverProcess) {
        try { serverProcess.kill(); } catch { /* ignore */ }
        serverProcess = null;
    }
    try {
        execSync("taskkill /F /T /IM RenegadeServer.exe 2>nul", { timeout: 3000, windowsHide: true });
        logger.info(SRC, "Server stopped via taskkill");
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
        transparent: true,
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
    logger.info(SRC, "Restarting server...");
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

    ipcMain.on("app:setIgnoreMouseEvents", (_e, ignore: boolean) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setIgnoreMouseEvents(ignore, { forward: true });
        }
    });
    ipcMain.on("app:setFullScreen", (_e, full: boolean) => {
        if (mainWindow && !mainWindow.isDestroyed()) {
            mainWindow.setFullScreen(full);
        }
    });
    ipcMain.on("app:maximizeWindow", () => {
        if (mainWindow && !mainWindow.isDestroyed() && !mainWindow.isMaximized()) {
            mainWindow.maximize();
        }
    });

    ipcMain.handle("app:getServerStatus", async () => {
        const installed = isServerInstalled();
        const version = getServerVersionFile();
        const health = await checkServerHealth();
        const running = health.status === "ok";
        logger.info(SRC, `getServerStatus: installed=${installed}, running=${running}, version="${version}", serverVersion="${health.version}", healthStatus="${health.status}"`);
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
    ipcMain.handle("app:startServer", async () => {
        logger.info(SRC, "IPC: startServer");
        const result = await startServer();
        if (!result.success) {
            safeSend("app:toast", { message: `Server start failed: ${result.error}`, level: "error" });
        }
        return result;
    });
    ipcMain.handle("app:stopServer", () => { stopServer(); return { success: true }; });
    ipcMain.handle("app:health", async () => checkServerHealth());
    ipcMain.handle("app:getRobloxProcesses", () => getRobloxProcesses());

    ipcMain.handle("app:getClients", async () => {
        try {
            const data = await serverRequest("/clients");
            return parseClients(data.clients);
        } catch {
            logger.warn(SRC, "Failed to get clients");
            return [];
        }
    });
    ipcMain.handle("app:attach", async () => {
        try {
            if (currentExecutor === "velocity") {
                const processes = getRobloxProcesses();
                if (processes.length === 0) {
                    safeSend("app:toast", { message: "No Roblox process found", level: "warn" });
                    return false;
                }
                const pid = processes[0].pid;
                const result = await serverRequest("/velocity/attach", "POST", JSON.stringify({ pid }));
                const ok = result.success === true && result.status === "Attached";
                if (ok) {
                    logger.info(SRC, `Velocity attach successful (PID ${pid})`);
                } else {
                    logger.warn(SRC, `Velocity attach returned: ${result.status}`);
                    safeSend("app:toast", { message: `Velocity attach: ${result.status}`, level: "warn" });
                }
                return ok;
            }
            await serverRequest("/attach", "POST");
            logger.info(SRC, "Attach successful");
            return true;
        } catch (e) {
            logger.error(SRC, "Attach failed", e instanceof Error ? e : undefined);
            safeSend("app:toast", { message: "Failed to attach to Roblox", level: "error" });
            return false;
        }
    });
    ipcMain.handle("app:initDll", async () => {
        try { await serverRequest("/init", "POST"); return true; } catch { return false; }
    });
    ipcMain.handle("app:getConfig", async () => {
        try { return await serverRequest("/config"); } catch {
            logger.warn(SRC, "Failed to get config");
            return {};
        }
    });
    ipcMain.handle("app:execute", async (_e, script: string, pids: number[]) => {
        try {
            if (currentExecutor === "velocity") {
                const result = await serverRequest("/velocity/execute", "POST", JSON.stringify({ script }));
                const ok = result.success === true;
                if (!ok) {
                    logger.warn(SRC, `Velocity execute failed: ${result.status}`);
                    safeSend("app:toast", { message: `Velocity execute: ${result.status}`, level: "warn" });
                }
                return { success: ok, error: result.status };
            }
            const result = await serverRequest("/execute", "POST", JSON.stringify({ script, pids }));
            const ok = result.success === true;
            if (!ok) {
                logger.warn(SRC, `Execute failed: ${result.error}`);
                safeSend("app:toast", { message: `Execute error: ${result.error}`, level: "warn" });
            }
            return { success: ok, error: result.error };
        } catch (e) {
            const msg = (e as Error).message;
            logger.error(SRC, `Execute error: ${msg}`);
            safeSend("app:toast", { message: `Execute error: ${msg}`, level: "error" });
            return { success: false, error: msg };
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
        } catch {
            logger.warn(SRC, "Server update check failed");
            return { needsUpdate: false, latestVersion: "" };
        }
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
        try { return JSON.parse(readFileSync(filePath, "utf-8")); } catch {
            logger.warn(SRC, "Failed to load app state, returning empty");
            return {};
        }
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
        const data = await fetchJson(url).catch(() => {
            logger.warn("ScriptBlox", "Search failed, returning empty");
            return null;
        });
        if (data) cacheSet(key, data);
        return data;
    });
    ipcMain.handle("scriptblox:trending", async () => {
        const key = "trending";
        const cached = cacheGet(key);
        if (cached) return cached;
        const data = await fetchJson("https://scriptblox.com/api/script/trending").catch(() => {
            logger.warn("ScriptBlox", "Trending fetch failed");
            return null;
        });
        if (data) cacheSet(key, data);
        return data;
    });
    ipcMain.handle("scriptblox:source", async (_e, slug: string) => {
        const key = `source:${slug}`;
        const cached = cacheGet(key);
        if (cached) return cached;
        const data = await fetchJson(`https://scriptblox.com/api/script/${encodeURIComponent(slug)}`).catch(() => {
            logger.warn("ScriptBlox", `Source fetch failed for ${slug}`);
            return null;
        });
        if (data) cacheSet(key, data);
        return data;
    });

    const FAVORITES_FILE = "favorites.json";
    const getFavoritesPath = () => join(app.getPath("userData"), FAVORITES_FILE);
    const loadFavorites = (): unknown[] => {
        try {
            const p = getFavoritesPath();
            if (!existsSync(p)) return [];
            return JSON.parse(readFileSync(p, "utf-8"));
        } catch { return []; }
    };
    const saveFavorites = (data: unknown[]) => {
        writeFileSync(getFavoritesPath(), JSON.stringify(data, null, 2), "utf-8");
    };

    ipcMain.handle("favorites:load", () => loadFavorites());
    ipcMain.handle("favorites:save", (_e, favorites: unknown[]) => {
        saveFavorites(favorites);
        return { success: true };
    });

    ipcMain.handle("app:getAppVersion", () => getAppVersion());
    ipcMain.handle("app:checkForAppUpdate", async () => {
        try {
            return await checkForAppUpdate();
        } catch (e) {
            logger.error(SRC, "App update check failed", e instanceof Error ? e : undefined);
            return { available: false, latestVersion: "", currentVersion: "", portableUrl: "", portableFilename: "", setupUrl: "", setupFilename: "" };
        }
    });
    ipcMain.handle("app:downloadAppUpdate", async (_e, downloadUrl: string, filename: string) => {
        return downloadAppUpdate(downloadUrl, filename);
    });
    ipcMain.on("app:finalizePortable", (_e, filePath: string, version: string) => {
        finalizePortable(filePath, version);
    });
    ipcMain.on("app:finalizeSetup", (_e, filePath: string, version: string) => {
        finalizeSetup(filePath, version);
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

    ipcMain.on("app:log", (_e, entry: { level: string; source: string; message: string }) => {
        const lvl = entry.level || "INFO";
        if (lvl === "ERROR") logger.error(entry.source || "Renderer", entry.message);
        else if (lvl === "WARN") logger.warn(entry.source || "Renderer", entry.message);
        else if (lvl === "DEBUG") logger.debug(entry.source || "Renderer", entry.message);
        else logger.info(entry.source || "Renderer", entry.message);
    });

    ipcMain.handle("app:openLogsFolder", async () => {
        const { shell } = await import("electron");
        shell.openPath(logger.getLogDir());
    });

    ipcMain.handle("app:setExecutor", (_e, executor: "xeno" | "velocity") => {
        currentExecutor = executor;
        logger.info(SRC, `Executor set to: ${executor}`);
    });

    const executorStatusCache = new Map<string, { data: { status: string; reason: string }; ts: number }>();
    ipcMain.handle("app:getExecutorStatus", async (_e, executor: "xeno" | "velocity") => {
        const url = executor === "velocity"
            ? "https://raw.githubusercontent.com/cookingsometimes/data-for-somethings-idk/main/renegade/velocity/status.json"
            : "https://raw.githubusercontent.com/cookingsometimes/data-for-somethings-idk/main/renegade/xeno/status.json";
        const cached = executorStatusCache.get(executor);
        if (cached && Date.now() - cached.ts < 300000) return cached.data;
        try {
            const data = await fetchJson(url) as { status: string; reason: string };
            if (data && data.status) {
                executorStatusCache.set(executor, { data, ts: Date.now() });
                return data;
            }
        } catch { /* ignore */ }
        return null;
    });

    ipcMain.handle("velocity:status", async () => {
        try {
            return await serverRequest("/velocity/status");
        } catch {
            return { available: false, initialized: false, version: "unknown", state: "unknown", injectedPids: [] };
        }
    });
    ipcMain.handle("velocity:start", async () => {
        try {
            return await serverRequest("/velocity/start", "POST");
        } catch (e) {
            logger.error(SRC, "Velocity start failed", e instanceof Error ? e : undefined);
            return { success: false };
        }
    });
    ipcMain.handle("velocity:stop", async () => {
        try {
            return await serverRequest("/velocity/stop", "POST");
        } catch (e) {
            logger.error(SRC, "Velocity stop failed", e instanceof Error ? e : undefined);
            return { success: false };
        }
    });
    ipcMain.handle("velocity:attach", async (_e, pid: number) => {
        try {
            return await serverRequest("/velocity/attach", "POST", JSON.stringify({ pid }));
        } catch (e) {
            logger.error(SRC, "Velocity attach failed", e instanceof Error ? e : undefined);
            safeSend("app:toast", { message: "Velocity attach failed", level: "error" });
            return { success: false, status: "error" };
        }
    });
    ipcMain.handle("velocity:execute", async (_e, script: string) => {
        try {
            return await serverRequest("/velocity/execute", "POST", JSON.stringify({ script }));
        } catch (e) {
            logger.error(SRC, "Velocity execute failed", e instanceof Error ? e : undefined);
            return { success: false, status: "error" };
        }
    });
    ipcMain.handle("app:downloadVelocity", async () => {
        return await downloadVelocity();
    });
    ipcMain.handle("app:isVelocityInstalled", () => {
        return isVelocityInstalled();
    });
    ipcMain.handle("app:getVelocityVersion", () => {
        return getVelocityVersionFile();
    });
    ipcMain.handle("app:getVelocityDir", () => {
        return VELOCITY_DIR;
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
    } catch {
        logger.warn(SRC, "Failed to get Roblox processes");
        return [];
    }
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
                    "img-src 'self' data: blob: https://scriptblox.com https://*.scriptblox.com https://avatars.githubusercontent.com https://*.githubusercontent.com https://cdn.discordapp.com https://www.xeno.now; " +
                    "worker-src 'self' blob:; " +
                    "connect-src 'self' http://127.0.0.1:* https://sumi-api.netlify.app https://encrypted-bytes.com https://cdnjs.cloudflare.com https://scriptblox.com; " +
                    "font-src 'self' https://cdnjs.cloudflare.com;"
                ],
            },
        });
    });

    startServer().catch((e) => logger.error(SRC, `Background start failed: ${e.message}`, e));

    app.on("before-quit", () => stopServer());
    app.on("window-all-closed", () => {
        stopServer();
        app.quit();
    });
})();

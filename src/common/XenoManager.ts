import { app, BrowserWindow, shell } from "electron";
import { existsSync, mkdirSync, readFileSync } from "fs";
import { join } from "path";

export type DownloadState =
    | "idle"
    | "fetching_url"
    | "downloading"
    | "extracting"
    | "launching"
    | "ready"
    | "error";

export interface LogEntry {
    id: string;
    timestamp: number;
    level: "info" | "warn" | "error" | "debug";
    source: string;
    message: string;
}

function genId(): string {
    return Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
}

export class XenoManager {
    private xenoDir: string;
    private versionPath: string;
    private mainWindow: BrowserWindow | null = null;
    private _downloadState: DownloadState = "idle";
    private _downloadProgress = 0;
    private _downloadError = "";
    private _logs: LogEntry[] = [];
    private _logListeners: Array<(entry: LogEntry) => void> = [];
    private _currentVersion = "";

    constructor() {
        this.xenoDir = join(app.getPath("userData"), "xeno");
        this.versionPath = join(this.xenoDir, "xeno-version.json");
        if (!existsSync(this.xenoDir)) mkdirSync(this.xenoDir, { recursive: true });
    }

    setMainWindow(win: BrowserWindow) {
        this.mainWindow = win;
    }

    log(level: LogEntry["level"], source: string, message: string) {
        const entry: LogEntry = {
            id: genId(),
            timestamp: Date.now(),
            level,
            source,
            message,
        };
        this._logs.unshift(entry);
        if (this._logs.length > 500) this._logs.pop();

        const tag = level.toUpperCase().padEnd(5);
        const ts = new Date(entry.timestamp).toLocaleTimeString();
        console.log(`[${ts}] [${tag}] [${source}] ${message}`);

        this.sendToRenderer("xeno:log", entry);
        for (const listener of this._logListeners) listener(entry);
    }

    onLog(listener: (entry: LogEntry) => void) {
        this._logListeners.push(listener);
    }

    getLogs(): LogEntry[] {
        return this._logs;
    }

    private sendToRenderer(channel: string, ...args: unknown[]) {
        try {
            if (!this.mainWindow) return;
            if (this.mainWindow.isDestroyed()) return;
            const wc = this.mainWindow.webContents;
            if (!wc || wc.isDestroyed()) return;
            (wc.send as unknown as (...a: unknown[]) => Promise<unknown>)(channel, ...args).catch(() => {});
        } catch { /* ignore */ }
    }

    setDownloadState(state: DownloadState, progress?: number, error?: string) {
        this._downloadState = state;
        if (progress !== undefined) this._downloadProgress = progress;
        if (error !== undefined) this._downloadError = error;
        this.sendToRenderer("xeno:downloadState", {
            state,
            progress: this._downloadProgress,
            error: this._downloadError,
        });
    }

    getDownloadState(): { state: DownloadState; progress: number; error: string } {
        return {
            state: this._downloadState,
            progress: this._downloadProgress,
            error: this._downloadError,
        };
    }

    getXenoDir(): string {
        return this.xenoDir;
    }

    getCurrentVersion(): string {
        if (this._currentVersion) return this._currentVersion;
        if (existsSync(this.versionPath)) {
            try {
                const data = JSON.parse(readFileSync(this.versionPath, "utf-8"));
                this._currentVersion = data.version ?? "";
                return this._currentVersion;
            } catch { return ""; }
        }
        return "";
    }

    async checkForUpdates(currentVersion: string): Promise<{ needsUpdate: boolean; latestVersion: string }> {
        try {
            const res = await fetch(
                `https://sumi-api.netlify.app/api/v0/rblx/executors/dl/xeno?myversion=${currentVersion}`,
            );
            if (!res.ok) return { needsUpdate: false, latestVersion: currentVersion };
            const data = (await res.json()) as { latestVersion: string; needsUpdate: boolean };
            return data;
        } catch {
            return { needsUpdate: false, latestVersion: currentVersion };
        }
    }

    openDotNetDownload(): void {
        shell.openExternal("https://dotnet.microsoft.com/download/dotnet/9.0#runtime-desktop-9.0");
    }
}

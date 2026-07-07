import { app, shell } from "electron";
import { join, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, createWriteStream } from "fs";
import https from "https";
import http from "http";

const GITHUB_API = "https://api.github.com/repos/cookingsometimes/renegade/releases/latest";
const GITHUB_LATEST_DL = "https://github.com/cookingsometimes/renegade/releases/latest/download";
const APP_VERSION_FILE = "app-version.txt";

let safeSend: (channel: string, ...args: unknown[]) => void = () => {};

export function initUpdater(sendFn: (channel: string, ...args: unknown[]) => void) {
    safeSend = sendFn;
}

export function getAppVersion(): string {
    const filePath = join(app.getPath("userData"), APP_VERSION_FILE);
    if (!existsSync(filePath)) {
        try {
            const pkg = JSON.parse(readFileSync(join(app.getAppPath(), "package.json"), "utf-8"));
            return (pkg.version || "1.0.0").replace(/^v/, "");
        } catch {
            return "1.0.0";
        }
    }
    return readFileSync(filePath, "utf-8").trim().replace(/^v/, "");
}

export function setAppVersion(v: string): void {
    writeFileSync(join(app.getPath("userData"), APP_VERSION_FILE), v.replace(/^v/, ""), "utf-8");
}

export interface UpdateCheckResult {
    available: boolean;
    latestVersion: string;
    currentVersion: string;
    portableUrl: string;
    portableFilename: string;
    setupUrl: string;
    setupFilename: string;
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
    const current = getAppVersion();
    const result: UpdateCheckResult = {
        available: false,
        latestVersion: current,
        currentVersion: current,
        portableUrl: "",
        portableFilename: "",
        setupUrl: "",
        setupFilename: "",
    };

    try {
        const body = await fetchText(GITHUB_API, 10000);
        const release = JSON.parse(body);
        const tagName: string = release.tag_name || "";
        const cleanVersion = tagName.replace(/^v/, "").trim();
        if (!cleanVersion) return result;

        result.latestVersion = cleanVersion;

        if (compareVersions(cleanVersion, current) <= 0) return result;

        result.available = true;

        const assets: { name: string; browser_download_url: string }[] = release.assets || [];
        for (const asset of assets) {
            const name = asset.name;
            if (name.endsWith(".zip") && !name.includes("latest")) {
                result.portableFilename = name;
                result.portableUrl = asset.browser_download_url;
            } else if (name.endsWith(".exe") && !name.endsWith("unins*.exe")) {
                result.setupFilename = name;
                result.setupUrl = asset.browser_download_url;
            }
        }

        if (!result.portableUrl) {
            result.portableFilename = `Renegade-${cleanVersion}.zip`;
            result.portableUrl = `${GITHUB_LATEST_DL}/${result.portableFilename}`;
        }
        if (!result.setupUrl) {
            result.setupFilename = `Renegade-Setup-${cleanVersion}.exe`;
            result.setupUrl = `${GITHUB_LATEST_DL}/${result.setupFilename}`;
        }

        return result;
    } catch {
        return result;
    }
}

export async function downloadAppUpdate(downloadUrl: string, filename: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    try {
        const destDir = app.getPath("downloads");
        const filePath = join(destDir, filename);

        await downloadFile(downloadUrl, filePath, (bytes, total) => {
            safeSend("app:appUpdateProgress", { bytesReceived: bytes, totalBytes: total });
        });
        return { success: true, filePath };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

export function finalizePortable(filePath: string, version: string): void {
    if (version) setAppVersion(version);
    if (filePath) {
        try {
            shell.showItemInFolder(filePath);
        } catch {
            try { shell.openPath(dirname(filePath)); } catch { /* ignore */ }
        }
    }
    setTimeout(() => {
        app.exit(0);
    }, 1500);
}

export function finalizeSetup(filePath: string, version: string): void {
    if (version) setAppVersion(version);
    if (filePath) {
        try {
            shell.openPath(filePath);
        } catch {
            try { shell.showItemInFolder(filePath); } catch { /* ignore */ }
        }
    }
    setTimeout(() => {
        app.exit(0);
    }, 1500);
}

function fetchText(url: string, timeoutMs: number): Promise<string> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const mod = parsed.protocol === "https:" ? https : http;
        const req = mod.get(url, {
            headers: { "User-Agent": "Renegade/2.0" },
            rejectUnauthorized: false,
            timeout: timeoutMs,
        }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                fetchText(res.headers.location, timeoutMs).then(resolve, reject);
                return;
            }
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            let data = "";
            res.on("data", (chunk: Buffer) => { data += chunk.toString(); });
            res.on("end", () => resolve(data));
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Timeout")); });
    });
}

function downloadFile(url: string, dest: string, onProgress?: (bytes: number, total: number) => void): Promise<void> {
    return new Promise((resolve, reject) => {
        const parsed = new URL(url);
        const mod = parsed.protocol === "https:" ? https : http;
        const req = mod.get(url, {
            headers: { "User-Agent": "Renegade/2.0" },
            rejectUnauthorized: false,
            timeout: 300000,
        }, (res) => {
            if (res.statusCode && res.statusCode >= 300 && res.statusCode < 400 && res.headers.location) {
                downloadFile(res.headers.location, dest, onProgress).then(resolve, reject);
                return;
            }
            if (!res.statusCode || res.statusCode < 200 || res.statusCode >= 300) {
                reject(new Error(`HTTP ${res.statusCode}`));
                return;
            }
            const total = parseInt(res.headers["content-length"] || "0", 10);
            const file = createWriteStream(dest);
            let received = 0;
            res.on("data", (chunk: Buffer) => {
                received += chunk.length;
                onProgress?.(received, total);
            });
            res.pipe(file);
            file.on("finish", () => resolve());
            file.on("error", reject);
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Download timeout")); });
    });
}

function compareVersions(a: string, b: string): number {
    const pa = a.split(".").map(Number);
    const pb = b.split(".").map(Number);
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
        const na = pa[i] || 0;
        const nb = pb[i] || 0;
        if (na > nb) return 1;
        if (na < nb) return -1;
    }
    return 0;
}

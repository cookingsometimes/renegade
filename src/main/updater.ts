import { app, shell } from "electron";
import { join, dirname } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, createWriteStream } from "fs";
import { rm } from "fs/promises";
import https from "https";
import http from "http";
import { extractZip } from "./downloader";

const GITHUB_LATEST = "https://github.com/cookingsometimes/renegade/releases/latest/download";
const LATEST_YML = `${GITHUB_LATEST}/latest.yml`;
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

export function isPortable(): boolean {
    const exePath = app.getPath("exe");
    const exeDir = dirname(exePath);
    if (existsSync(join(exeDir, "Update.exe"))) return false;
    if (exePath.toLowerCase().includes("program files")) return false;
    const parentDir = dirname(exeDir);
    if (existsSync(join(parentDir, "Update.exe"))) return false;
    return true;
}

export interface UpdateCheckResult {
    available: boolean;
    latestVersion: string;
    currentVersion: string;
    downloadUrl: string;
    filename: string;
    isPortable: boolean;
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
    const current = getAppVersion();
    const portable = isPortable();
    const result: UpdateCheckResult = {
        available: false,
        latestVersion: current,
        currentVersion: current,
        downloadUrl: "",
        filename: "",
        isPortable: portable,
    };

    try {
        const text = await fetchText(LATEST_YML, 10000);
        const version = extractYamlValue(text, "version");
        if (!version) return result;

        const cleanVersion = version.replace(/^v/, "");
        result.latestVersion = cleanVersion;

        if (compareVersions(cleanVersion, current) > 0) {
            result.available = true;
            if (portable) {
                const zipFile = extractZipUrl(text, cleanVersion);
                result.downloadUrl = `${GITHUB_LATEST}/${zipFile}`;
                result.filename = zipFile;
            } else {
                const setupFile = extractYamlValue(text, "path") || `Renegade-Setup-${cleanVersion}.exe`;
                result.downloadUrl = `${GITHUB_LATEST}/${setupFile}`;
                result.filename = setupFile;
            }
        }

        return result;
    } catch {
        return result;
    }
}

export async function downloadAppUpdate(downloadUrl: string, filename: string): Promise<{ success: boolean; filePath?: string; error?: string }> {
    const tempDir = join(app.getPath("userData"), "update-temp");
    mkdirSync(tempDir, { recursive: true });
    const filePath = join(tempDir, filename);

    try {
        await downloadFile(downloadUrl, filePath, (bytes, total) => {
            safeSend("app:appUpdateProgress", { bytesReceived: bytes, totalBytes: total });
        });
        return { success: true, filePath };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

export async function installPortableUpdate(filePath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const extractDir = join(app.getPath("userData"), "update-staging");
        if (existsSync(extractDir)) {
            await rm(extractDir, { recursive: true, force: true });
        }
        mkdirSync(extractDir, { recursive: true });
        extractZip(filePath, extractDir);

        const newVersion = extractZipVersion(filePath);
        if (newVersion) setAppVersion(newVersion);

        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

export function launchSetupAndQuit(setupPath: string): void {
    try {
        shell.openPath(setupPath);
    } catch { /* ignore */ }
    setTimeout(() => {
        app.exit(0);
    }, 1000);
}

function extractZipVersion(zipPath: string): string | null {
    try {
        const match = zipPath.match(/(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
}

function extractZipUrl(yaml: string, version: string): string {
    const re = /url:\s*(Renegade-[\d.]+-win\.zip)/;
    const m = yaml.match(re);
    return m ? m[1] : `Renegade-${version}-win.zip`;
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

function extractYamlValue(yaml: string, key: string): string {
    const re = new RegExp(`^${key}:\\s*(.+)$`, "m");
    const m = yaml.match(re);
    return m ? m[1].trim().replace(/^['"]|['"]$/g, "") : "";
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

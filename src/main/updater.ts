import { app } from "electron";
import { join } from "path";
import { existsSync, readFileSync, writeFileSync, mkdirSync, createWriteStream } from "fs";
import { rm } from "fs/promises";
import https from "https";
import http from "http";
import { extractZip } from "./downloader";

const GITHUB_RELEASES = "https://github.com/cookingsometimes/renegade/releases/latest/download";
const LATEST_YML = `${GITHUB_RELEASES}/latest.yml`;
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
    downloadUrl: string;
    filename: string;
}

export async function checkForAppUpdate(): Promise<UpdateCheckResult> {
    const current = getAppVersion();
    const result: UpdateCheckResult = {
        available: false,
        latestVersion: current,
        currentVersion: current,
        downloadUrl: "",
        filename: "",
    };

    try {
        const text = await fetchText(LATEST_YML, 10000);
        const version = extractYamlValue(text, "version");
        const pathVal = extractYamlValue(text, "path");

        if (!version) return result;

        const cleanVersion = version.replace(/^v/, "");
        result.latestVersion = cleanVersion;

        if (compareVersions(cleanVersion, current) > 0) {
            result.available = true;
            result.downloadUrl = `${GITHUB_RELEASES}/${pathVal || `Renegade-${cleanVersion}-win.zip`}`;
            result.filename = pathVal || `Renegade-${cleanVersion}-win.zip`;
        }

        return result;
    } catch {
        return result;
    }
}

export async function downloadAppUpdate(downloadUrl: string, filename: string): Promise<{ success: boolean; zipPath?: string; error?: string }> {
    const tempDir = join(app.getPath("userData"), "update-temp");
    mkdirSync(tempDir, { recursive: true });
    const zipPath = join(tempDir, filename);

    try {
        await downloadFile(downloadUrl, zipPath, (bytes, total) => {
            safeSend("app:appUpdateProgress", { bytesReceived: bytes, totalBytes: total });
        });
        return { success: true, zipPath };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

export async function installAppUpdate(zipPath: string): Promise<{ success: boolean; error?: string }> {
    try {
        const extractDir = join(app.getPath("userData"), "update-staging");
        if (existsSync(extractDir)) {
            await rm(extractDir, { recursive: true, force: true });
        }
        mkdirSync(extractDir, { recursive: true });
        extractZip(zipPath, extractDir);

        const newVersion = extractZipVersion(zipPath);
        if (newVersion) setAppVersion(newVersion);

        return { success: true };
    } catch (e) {
        return { success: false, error: (e as Error).message };
    }
}

function extractZipVersion(zipPath: string): string | null {
    try {
        const match = zipPath.match(/(\d+\.\d+\.\d+)/);
        return match ? match[1] : null;
    } catch {
        return null;
    }
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

import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, copyFileSync, createWriteStream } from "fs";
import { execSync } from "child_process";

import https from "https";
import http from "http";

import * as logger from "./logger";
const SRC = "Downloader";

export const DATA_DIR = app.getPath("userData");
export const SERVER_DIR = join(DATA_DIR, "server");
export const SERVER_EXE = "RenegadeServer.exe";
export const SERVER_VERSION_FILE = join(SERVER_DIR, "version.txt");
export const XENO_DIR = join(DATA_DIR, "xeno");
export const XENO_VERSIONS_DIR = join(DATA_DIR, "xeno-versions");
export const SUMI_SERVER_API = "https://sumi-api.netlify.app/api/v0/renegade/server/download";
export const SUMI_XENO_API = "https://sumi-api.netlify.app/api/v0/rblx/executors/dl/xeno";

let safeSend: (channel: string, ...args: unknown[]) => void = () => {};
let serverRequest: (path: string, method?: string, body?: string) => Promise<Record<string, unknown>> = async () => ({});
let restartServer: () => Promise<{ success: boolean; error?: string }> = async () => ({ success: false, error: "not initialized" });
let stopServerFn: () => void = () => {};

export function initDownloader(
    sendFn: (channel: string, ...args: unknown[]) => void,
    reqFn: (path: string, method?: string, body?: string) => Promise<Record<string, unknown>>,
    restartFn: () => Promise<{ success: boolean; error?: string }>,
    stopFn: () => void,
) {
    safeSend = sendFn;
    serverRequest = reqFn;
    restartServer = restartFn;
    stopServerFn = stopFn;
}

export function getServerVersionFile(): string {
    if (!existsSync(SERVER_VERSION_FILE)) return "";
    try { return readFileSync(SERVER_VERSION_FILE, "utf-8").trim(); } catch { return ""; }
}

export function setServerVersion(v: string): void {
    mkdirSync(SERVER_DIR, { recursive: true });
    writeFileSync(SERVER_VERSION_FILE, v, "utf-8");
}

export function isServerInstalled(): boolean {
    return existsSync(join(SERVER_DIR, SERVER_EXE));
}

export function isXenoInstalled(): boolean {
    if (existsSync(join(XENO_DIR, "Xeno.dll"))) return true;
    return findXenoDll(XENO_VERSIONS_DIR);
}

function findXenoDll(dir: string): boolean {
    if (!existsSync(dir)) return false;
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            const full = join(dir, e.name);
            if (e.isFile() && e.name === "Xeno.dll") return true;
            if (e.isDirectory() && findXenoDll(full)) return true;
        }
    } catch { /* ignore */ }
    return false;
}

function findXenoDllDir(dir: string): string | null {
    if (!existsSync(dir)) return null;
    try {
        const entries = readdirSync(dir, { withFileTypes: true });
        for (const e of entries) {
            if (e.isFile() && e.name === "Xeno.dll") return dir;
        }
        for (const e of entries) {
            if (e.isDirectory()) {
                const found = findXenoDllDir(join(dir, e.name));
                if (found) return found;
            }
        }
    } catch { /* ignore */ }
    return null;
}

function copyDirSync(src: string, dest: string): void {
    mkdirSync(dest, { recursive: true });
    const entries = readdirSync(src, { withFileTypes: true });
    for (const e of entries) {
        const srcPath = join(src, e.name);
        const destPath = join(dest, e.name);
        if (e.isDirectory()) {
            copyDirSync(srcPath, destPath);
        } else {
            copyFileSync(srcPath, destPath);
        }
    }
}

export type DownloadProgress = {
    bytesReceived: number;
    totalBytes: number;
};

function downloadFile(url: string, dest: string, onProgress?: (p: DownloadProgress) => void): Promise<void> {
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
            const total = parseInt(res.headers["content-length"] || "0", 10) || 0;
            const file = createWriteStream(dest);
            let received = 0;
            res.on("data", (chunk: Buffer) => {
                received += chunk.length;
                onProgress?.({ bytesReceived: received, totalBytes: total });
            });
            res.pipe(file);
            file.on("finish", () => {
                if (total > 0 && received !== total) {
                    reject(new Error(`Download incomplete: ${received}/${total} bytes`));
                } else {
                    resolve();
                }
            });
            file.on("error", reject);
        });
        req.on("error", reject);
        req.on("timeout", () => { req.destroy(); reject(new Error("Download timeout")); });
    });
}

export function extractZip(zipPath: string, destDir: string): void {
    mkdirSync(destDir, { recursive: true });
    const cmd = `powershell -NoProfile -Command "& { Expand-Archive -LiteralPath '${zipPath.replace(/'/g, "''")}' -DestinationPath '${destDir.replace(/'/g, "''")}' -Force }"`;
    logger.info(SRC, `Extracting via PowerShell...`);
    execSync(cmd, { timeout: 60000, windowsHide: true });
    logger.info(SRC, `PowerShell extraction complete`);
}

export async function downloadXeno(): Promise<{ success: boolean; version?: string; error?: string }> {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger.info(SRC, `Starting Xeno download attempt ${attempt}/${MAX_RETRIES}`);
            safeSend("app:xenoRetry", { attempt, max: MAX_RETRIES });

            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 60000);
            const res = await fetch(SUMI_XENO_API, { signal: c.signal });
            clearTimeout(t);

            if (!res.ok) {
                const body = await res.text().catch(() => "");
                logger.warn(SRC, `Xeno API failed: HTTP ${res.status}: ${body}`);
                throw new Error(`HTTP ${res.status}: ${body}`);
            }

            const data = await res.json() as { hits?: Array<{ handler: string; file: string; url: string }> };
            if (!data.hits) throw new Error("No hits from Sumi API");
            const hit = data.hits.find((h) => h.handler === "relativeZipPath");
            if (!hit) throw new Error("No download hit");

            const match = hit.file.match(/v([\d.]+)/);
            const version = match ? match[1] : "unknown";
            const versionDir = join(XENO_VERSIONS_DIR, version);
            const zipPath = join(versionDir, "Xeno.zip");

            mkdirSync(versionDir, { recursive: true });
            logger.info(SRC, `Downloading Xeno zip to ${zipPath}`);
            await downloadFile(hit.url, zipPath, (p) => safeSend("app:xenoProgress", p));

            logger.info(SRC, `Extracting Xeno to ${versionDir}`);
            extractZip(zipPath, versionDir);

            stopServerFn();

            const dllDir = findXenoDllDir(versionDir);
            if (!dllDir) throw new Error("Xeno.dll not found after extraction");
            logger.info(SRC, `Copying Xeno files from ${dllDir} to ${XENO_DIR}`);
            copyDirSync(dllDir, XENO_DIR);

            logger.info(SRC, `Starting server to load Xeno.dll`);
            const restartRes = await restartServer();
            logger.info(SRC, `Server restart: ${JSON.stringify(restartRes)}`);

            logger.info(SRC, `Xeno download successful: version ${version}`);
            return { success: true, version };
        } catch (e) {
            lastError = e as Error;
            logger.error(SRC, `Xeno attempt ${attempt} failed: ${lastError.message}`, lastError);
            if (attempt < MAX_RETRIES) {
                safeSend("app:xenoRetry", { attempt, max: MAX_RETRIES, retrying: true, error: lastError.message });
                await new Promise((r) => setTimeout(r, 3000 * attempt));
            }
        }
    }
    logger.error(SRC, `Xeno download failed after ${MAX_RETRIES} attempts: ${lastError?.message ?? "Unknown"}`);
    return { success: false, error: lastError?.message ?? "Unknown error" };
}

export async function downloadServer(): Promise<{ success: boolean; version?: string; error?: string }> {
    const MAX_RETRIES = 3;
    let lastError: Error | null = null;

    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
        try {
            logger.info(SRC, `Starting server download attempt ${attempt}/${MAX_RETRIES}`);
            safeSend("app:serverRetry", { attempt, max: MAX_RETRIES });

            const c = new AbortController();
            const t = setTimeout(() => c.abort(), 10000);
            const res = await fetch(SUMI_SERVER_API, { signal: c.signal });
            clearTimeout(t);
            if (!res.ok) throw new Error(`HTTP ${res.status}`);

            const data = await res.json() as { sources?: Array<{ url: string; filename: string }>; version?: string; latestVersion?: string };
            if (!data.sources || data.sources.length === 0) throw new Error("No download sources");
            const src = data.sources[0];
            const version = data.latestVersion || data.version || "1.0.0";

            mkdirSync(SERVER_DIR, { recursive: true });
            const dest = join(SERVER_DIR, src.filename);
            logger.info(SRC, `Downloading server to ${dest}`);
            await downloadFile(src.url, dest, (p) => safeSend("app:serverDownloadProgress", p));
            setServerVersion(version);
            logger.info(SRC, `Server download successful: version ${version}`);
            return { success: true, version };
        } catch (e) {
            lastError = e as Error;
            logger.error(SRC, `Server attempt ${attempt} failed: ${lastError.message}`, lastError);
            if (attempt < MAX_RETRIES) {
                safeSend("app:serverRetry", { attempt, max: MAX_RETRIES, retrying: true, error: lastError.message });
                await new Promise((r) => setTimeout(r, 3000 * attempt));
            }
        }
    }
    return { success: false, error: lastError?.message ?? "Unknown error" };
}

export async function getXenoVersion(): Promise<string> {
    try {
        const data = await serverRequest("/health");
        if (typeof data.version === "string" && data.version) return data.version.replace(/^v/, "");
    } catch { /* ignore */ }
    try {
        const data = await serverRequest("/config");
        if (typeof data.version === "string" && data.version) return data.version.replace(/^v/, "");
    } catch { /* ignore */ }
    return "";
}

export async function checkXenoInstalled(): Promise<boolean> {
    try {
        const data = await serverRequest("/config");
        const serverSays = data.downloaded === true || data.dllLoaded === true;
        return serverSays && isXenoInstalled();
    } catch {
        return isXenoInstalled();
    }
}

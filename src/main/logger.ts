import { app } from "electron";
import { join } from "path";
import { existsSync, mkdirSync, readFileSync, readdirSync, unlinkSync, appendFileSync, writeFileSync } from "fs";

export type LogLevel = "DEBUG" | "INFO" | "WARN" | "ERROR";

export interface LogEntry {
    id: string;
    timestamp: number;
    level: LogLevel;
    source: string;
    message: string;
    stack?: string;
}

const LOG_DIR = join(app.getPath("userData"), "logs");
const MAX_LOG_FILES = 10;
const MAX_LOG_SIZE = 5 * 1024 * 1024;

let currentLogFile: string = "";
let currentLogSize = 0;

function ensureLogDir(): void {
    mkdirSync(LOG_DIR, { recursive: true });
}

function getTimestamp(): string {
    const d = new Date();
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}_${pad(d.getHours())}-${pad(d.getMinutes())}-${pad(d.getSeconds())}`;
}

function rotateLogs(): void {
    ensureLogDir();
    const files = readdirSync(LOG_DIR)
        .filter((f) => f.endsWith(".log"))
        .sort()
        .reverse();
    while (files.length >= MAX_LOG_FILES) {
        const old = files.pop();
        if (old) unlinkSync(join(LOG_DIR, old));
    }
}

function getLogFile(): string {
    if (!currentLogFile || currentLogSize >= MAX_LOG_SIZE) {
        currentLogFile = join(LOG_DIR, `${getTimestamp()}.log`);
        currentLogSize = 0;
        rotateLogs();
    }
    return currentLogFile;
}

function formatLog(level: LogLevel, source: string, message: string, stack?: string): string {
    const ts = new Date().toISOString();
    let line = `[${ts}] [${level.padEnd(5)}] [${source}] ${message}`;
    if (stack) line += `\n${stack}`;
    return line + "\n";
}

function writeToFile(level: LogLevel, source: string, message: string, stack?: string): void {
    try {
        ensureLogDir();
        const filePath = getLogFile();
        const text = formatLog(level, source, message, stack);
        appendFileSync(filePath, text, "utf-8");
        currentLogSize += Buffer.byteLength(text, "utf-8");
    } catch {
        console.error("[Logger] Failed to write log file");
    }
}

function makeEntry(level: LogLevel, source: string, message: string, stack?: string): LogEntry {
    return {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        timestamp: Date.now(),
        level,
        source,
        message,
        stack,
    };
}

let logCallback: ((entry: LogEntry) => void) | null = null;

export function onLogEntry(cb: (entry: LogEntry) => void): void {
    logCallback = cb;
}

function emit(entry: LogEntry): void {
    logCallback?.(entry);
}

export function debug(source: string, message: string): void {
    const entry = makeEntry("DEBUG", source, message);
    writeToFile("DEBUG", source, message);
    emit(entry);
}

export function info(source: string, message: string): void {
    const entry = makeEntry("INFO", source, message);
    writeToFile("INFO", source, message);
    console.log(`[${source}] ${message}`);
    emit(entry);
}

export function warn(source: string, message: string): void {
    const entry = makeEntry("WARN", source, message);
    writeToFile("WARN", source, message);
    console.warn(`[${source}] ${message}`);
    emit(entry);
}

export function error(source: string, message: string, err?: Error): void {
    const stack = err?.stack;
    const entry = makeEntry("ERROR", source, message, stack);
    writeToFile("ERROR", source, message, stack);
    console.error(`[${source}] ERROR: ${message}`, err ?? "");
    emit(entry);
}

export function getLogFiles(): string[] {
    ensureLogDir();
    return readdirSync(LOG_DIR)
        .filter((f) => f.endsWith(".log"))
        .sort()
        .reverse();
}

export function readLogFile(filename: string): string {
    const filePath = join(LOG_DIR, filename);
    if (!existsSync(filePath)) return "";
    return readFileSync(filePath, "utf-8");
}

export function getRecentLogs(count = 100): LogEntry[] {
    const files = getLogFiles();
    if (files.length === 0) return [];
    const content = readLogFile(files[0]);
    const lines = content.trim().split("\n").reverse().slice(0, count).reverse();
    return lines.map((line) => {
        const match = line.match(/^\[(.+?)\]\s\[(.+?)\]\s\[(.+?)\]\s(.+)$/);
        if (match) {
            return {
                id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: new Date(match[1]).getTime(),
                level: match[2].trim() as LogLevel,
                source: match[3],
                message: match[4],
            };
        }
        return {
            id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            timestamp: Date.now(),
            level: "INFO" as LogLevel,
            source: "system",
            message: line,
        };
    });
}

export function clearLogs(): void {
    const files = getLogFiles();
    for (const f of files) {
        try { unlinkSync(join(LOG_DIR, f)); } catch { /* ignore */ }
    }
    currentLogFile = "";
    currentLogSize = 0;
}

export function initCrashLog(): void {
    ensureLogDir();
    const file = join(LOG_DIR, "crash-recovery.json");
    try {
        const data = existsSync(file) ? JSON.parse(readFileSync(file, "utf-8")) : null;
        if (data) {
            const crashCount = (data.count || 0) + 1;
            writeFileSync(file, JSON.stringify({ lastCrash: new Date().toISOString(), count: crashCount }), "utf-8");
        }
    } catch { /* ignore */ }
}

export function getCrashRecovery(): { lastCrash: string; count: number } | null {
    const file = join(LOG_DIR, "crash-recovery.json");
    if (!existsSync(file)) return null;
    try {
        return JSON.parse(readFileSync(file, "utf-8"));
    } catch { return null; }
}

export function clearCrashRecovery(): void {
    const file = join(LOG_DIR, "crash-recovery.json");
    try { writeFileSync(file, JSON.stringify({ lastCrash: new Date().toISOString(), count: 0 }), "utf-8"); } catch { /* ignore */ }
}

export function getLogDir(): string {
    ensureLogDir();
    return LOG_DIR;
}

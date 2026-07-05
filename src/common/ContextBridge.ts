import type {
    ExecutionLog,
    RobloxClientInfo,
    SavedScript,
    UpdateInfo,
    XenoStatus,
} from "./types";

export type DownloadStateInfo = {
    state: "idle" | "fetching_url" | "downloading" | "extracting" | "launching" | "ready" | "error";
    progress: number;
    error: string;
};

export type LogEntry = {
    id: string;
    timestamp: number;
    level: "info" | "warn" | "error" | "debug";
    source: string;
    message: string;
};

export type ContextBridge = {
    onNativeThemeChanged: (callback: () => void) => void;

    getXenoStatus: () => Promise<XenoStatus>;
    getDownloadState: () => Promise<DownloadStateInfo>;
    downloadXeno: () => Promise<{ success: boolean; version?: string; error?: string }>;
    onXenoDownloadProgress: (callback: (bytes: number) => void) => void;
    isXenoDownloaded: () => Promise<boolean>;
    getXenoVersion: () => Promise<string>;
    downloadServer: () => Promise<void>;
    setupGetSources: () => Promise<{ sources: Array<{ name: string; url: string; filename: string }>; error?: string; version?: string }>;
    setupDownloadFromSource: (url: string, filename: string) => Promise<{ success: boolean; error?: string; version?: string }>;
    onSetupDownloadProgress: (callback: (bytes: number) => void) => void;
    setupStartServer: () => Promise<{ success: boolean; error?: string }>;
    getServerVersion: () => Promise<string>;
    checkServerUpdate: () => Promise<{ needsUpdate: boolean; latestVersion: string }>;
    updateServer: () => Promise<{ success: boolean; version?: string; error?: string }>;

    onDownloadState: (callback: (info: DownloadStateInfo) => void) => void;
    onDownloadLog: (callback: (msg: string) => void) => void;

    checkForUpdates: () => Promise<UpdateInfo>;
    onUpdateAvailable: (callback: (info: UpdateInfo) => void) => void;

    getClients: () => Promise<RobloxClientInfo[]>;
    onClientsChanged: (callback: (clients: RobloxClientInfo[]) => void) => void;

    searchScripts: (query: string) => Promise<unknown[]>;
    getTrendingScripts: () => Promise<unknown[]>;

    clipboardRead: () => Promise<string>;
    clipboardWrite: (text: string) => Promise<void>;
    clipboardClear: () => Promise<void>;

    saveScript: (name: string, content: string) => Promise<string>;
    loadScripts: () => Promise<SavedScript[]>;
    deleteScript: (name: string) => Promise<void>;

    getExecutionLog: () => Promise<ExecutionLog[]>;

    getXenoDir: () => Promise<string>;
    getScriptsDir: () => Promise<string>;

    getLogs: () => Promise<LogEntry[]>;
    clearLogs: () => Promise<void>;
    onLog: (callback: (entry: LogEntry) => void) => void;

    saveAppState: (state: Record<string, unknown>) => Promise<void>;
    loadAppState: () => Promise<Record<string, unknown>>;

    getProxyUrl: () => Promise<string>;
    onProxyUrl: (callback: (url: string) => void) => void;
    proxyHealth: () => Promise<{
        status: string; version: string; clients: RobloxClientInfo[]; proxyPort: number; mode: string;
    }>;
    proxyGetClients: () => Promise<RobloxClientInfo[]>;
    proxyAttach: () => Promise<boolean>;
    proxyExecute: (script: string, pids: number[]) => Promise<{ success: boolean; results?: Array<{ pid: number; success: boolean; error?: string }> }>;
    proxyGetVersion: () => Promise<string>;
    proxyGetLogs: () => Promise<{ logs: unknown }>;
};

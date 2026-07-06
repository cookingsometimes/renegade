export type ServerStatus = {
    installed: boolean;
    version: string;
    running: boolean;
    serverVersion: string;
    clientCount: number;
    mode: string;
    initialized: boolean;
};

export type HealthStatus = {
    status: string;
    version: string;
    clients: unknown[];
    mode: string;
    initialized: boolean;
};

export type ScriptBloxGame = {
    gameId: number;
    name: string;
    imageUrl: string;
};

export type ScriptBloxScript = {
    _id: string;
    title: string;
    game: ScriptBloxGame;
    slug: string;
    verified: boolean;
    key: boolean;
    views: number;
    scriptType: string;
    isUniversal: boolean;
    isPatched: boolean;
    createdAt: string;
    image: string;
    script: string;
    likes?: number;
    dislikes?: number;
    description?: string;
    owner?: { name: string; avatar?: string };
};

export type ScriptBloxSearchResponse = {
    result?: { scripts: ScriptBloxScript[]; total?: number; page?: number };
    success?: boolean;
};

export type ScriptBloxScriptDetail = {
    script?: ScriptBloxScript;
    success?: boolean;
};

export type ContextBridge = {
    getServerStatus: () => Promise<ServerStatus>;
    isXenoInstalled: () => Promise<boolean>;
    startServer: () => Promise<{ success: boolean; error?: string }>;
    stopServer: () => Promise<{ success: boolean }>;
    health: () => Promise<HealthStatus>;
    getClients: () => Promise<unknown[]>;
    getRobloxProcesses: () => Promise<Array<{ pid: number; name: string }>>;
    attach: () => Promise<boolean>;
    initDll: () => Promise<boolean>;
    getConfig: () => Promise<Record<string, unknown>>;
    execute: (script: string, pids: number[]) => Promise<{ success: boolean; error?: string }>;
    getLogs: () => Promise<{ logs: unknown[] }>;
    getVersion: () => Promise<string>;
    getServerVersionFile: () => Promise<string>;
    checkServerUpdate: () => Promise<{ needsUpdate: boolean; latestVersion: string }>;
    downloadServer: () => Promise<{ success: boolean; version?: string; error?: string }>;
    downloadXeno: () => Promise<{ success: boolean; version?: string; error?: string }>;
    onServerDownloadProgress: (cb: (p: { bytesReceived: number; totalBytes: number }) => void) => void;
    onServerRetry: (cb: (data: { attempt: number; max: number; retrying?: boolean; error?: string }) => void) => void;
    onXenoProgress: (cb: (p: { bytesReceived: number; totalBytes: number }) => void) => void;
    onXenoRetry: (cb: (data: { attempt: number; max: number; retrying?: boolean; error?: string }) => void) => void;
    onServerDied: (cb: () => void) => void;
    getXenoVersion: () => Promise<string>;
    saveAppState: (state: Record<string, unknown>) => Promise<void>;
    loadAppState: () => Promise<Record<string, unknown>>;
    getXenoDir: () => Promise<string>;
    getScriptsDir: () => Promise<string>;
    saveScript: (name: string, content: string) => Promise<string>;
    loadScripts: () => Promise<Array<{ name: string; content: string; saved: number }>>;
    deleteScript: (name: string) => Promise<void>;
    searchScriptblox: (query: string, page: number) => Promise<ScriptBloxSearchResponse>;
    trendingScriptblox: () => Promise<ScriptBloxSearchResponse>;
    scriptbloxSource: (slug: string) => Promise<ScriptBloxScriptDetail>;
    onNativeThemeChanged: (cb: (dark: boolean) => void) => void;
    minimize: () => void;
    maximize: () => void;
    close: () => void;
    isMaximized: () => Promise<boolean>;
    toggleMaximize: () => void;
    getAppVersion: () => Promise<string>;
    checkForAppUpdate: () => Promise<{ available: boolean; latestVersion: string; currentVersion: string; downloadUrl: string; filename: string }>;
    downloadAppUpdate: (downloadUrl: string, filename: string) => Promise<{ success: boolean; zipPath?: string; error?: string }>;
    installAppUpdate: (zipPath: string) => Promise<{ success: boolean; error?: string }>;
    restartApp: () => void;
    onAppUpdateProgress: (cb: (p: { bytesReceived: number; totalBytes: number }) => void) => void;
    setWindowSize: (width: number, height: number) => void;
    centerWindow: () => void;
};

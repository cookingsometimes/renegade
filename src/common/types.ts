export interface ScriptTab {
    id: string;
    title: string;
    content: string;
    isDirty: boolean;
    filePath?: string;
}

export interface SavedScript {
    name: string;
    content: string;
    createdAt: number;
    updatedAt: number;
}

export interface XenoStatus {
    running: boolean;
    version: string;
    attached: boolean;
}

export interface RobloxClientInfo {
    id: number;
    pid: number;
    name: string;
    version: string;
    state: number;
    stateName: string;
    displayText: string;
    isChecked: boolean;
    crashCount: number;
}

export interface UpdateInfo {
    needsUpdate: boolean;
    latestVersion: string;
}

export interface ExecutionLog {
    id: string;
    script: string;
    targetPids: string[];
    status: "success" | "failed";
    timestamp: number;
    error?: string;
}

export type PageId = "dashboard" | "execute" | "scripts" | "clients" | "logs" | "settings" | "dllStatus" | "about";



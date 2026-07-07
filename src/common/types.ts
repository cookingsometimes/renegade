export type PageId = "dashboard" | "execute" | "clients" | "scripts" | "logs" | "settings" | "about" | "downloads";

export type UiMode = "full" | "compact" | "overlay";

export type SidebarPosition = "left" | "right" | "top";

export type RobloxClient = [pid: number, name: string, version: string, state: number, timestamp: number];

export type ScriptTab = {
    id: string;
    name: string;
    content: string;
};

export type SavedScript = {
    name: string;
    content: string;
    saved: number;
};

export type ScriptBloxScript = {
    _id: string;
    title: string;
    game: { gameId: number; name: string; imageUrl: string };
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
};

export type ScriptHubTab = "local" | "online";

export type ExecutionLog = {
    id: string;
    script: string;
    targetPids: string[];
    status: "success" | "error";
    timestamp: number;
};

export type UpdateInfo = {
    needsUpdate: boolean;
    latestVersion: string;
};

export type XenoStatus = {
    running: boolean;
    version: string;
    attached: boolean;
};

export type PanelPosition = { x: number; y: number; width: number; height: number };

export type ExecutorType = "xeno" | "velocity";

export type FavoriteScript = {
    id: string;
    title: string;
    game: string;
    slug: string;
    script: string;
    addedAt: number;
};

export type AppState = {
    activePage: PageId;
    uiMode: UiMode;
    sidebarCollapsed: boolean;
    executeTabs: ScriptTab[];
    activeTabId: string;
    autoInject: boolean;
    selectedPids: number[];
    alwaysOnTop: boolean;
    sidebarPosition: SidebarPosition;
    openPanels: string[];
    panelPositions: Record<string, PanelPosition>;
    executor: ExecutorType;
};

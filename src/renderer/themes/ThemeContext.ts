import { createContext, useContext } from "react";
import type { PageId } from "@common/types";
import type { RobloxClientInfo, ExecutionLog, SavedScript, ScriptTab } from "@common/types";
import type { DownloadStateInfo } from "@common/ContextBridge";

export type ThemeId = "fluent" | "oxygenu";

export interface ThemePages {
    Dashboard: React.FC<{
        isAttached: boolean;
        clients: RobloxClientInfo[];
        executionLog: ExecutionLog[];
        onNavigate: (page: PageId) => void;
        onExecute?: (script: string, pids: number[]) => void;
        onInject?: () => void;
        powerUser: boolean;
        streamerMode: boolean;
        savedScripts?: SavedScript[];
        onSave?: (name: string, content: string) => void;
        onDelete?: (name: string) => void;
        initialTabs?: ScriptTab[];
        initialActiveTabId?: string;
        initialSelectedPids?: string[];
        onTabsChange?: (tabs: ScriptTab[]) => void;
        onActiveTabIdChange?: (id: string) => void;
        onSelectedPidsChange?: (pids: string[]) => void;
    }>;
    Execute: React.FC<{
        clients: RobloxClientInfo[];
        savedScripts: SavedScript[];
        onSave: (name: string, content: string) => void;
        onLoad: (content: string) => void;
        onDelete: (name: string) => void;
        onExecute: (script: string, pids: number[]) => void;
        onInject: () => void;
        powerUser: boolean;
        streamerMode: boolean;
        initialTabs?: ScriptTab[];
        initialActiveTabId?: string;
        initialSelectedPids?: string[];
        onTabsChange?: (tabs: ScriptTab[]) => void;
        onActiveTabIdChange?: (id: string) => void;
        onSelectedPidsChange?: (pids: string[]) => void;
    }>;
    Hub: React.FC<{
        initialQuery?: string;
        onQueryChange?: (q: string) => void;
        onExecute?: (script: string, pids: number[]) => void;
    }>;
    Panel: React.FC<{ powerUser: boolean; streamerMode: boolean }>;
    DLL: React.FC;
    Logs: React.FC;
    Settings: React.FC<{
        powerUser: boolean;
        onPowerUserChange: (v: boolean) => void;
        themeId?: ThemeId;
        onThemeChange?: (id: ThemeId) => void;
        streamerMode?: boolean;
        onStreamerModeChange?: (v: boolean) => void;
        autoUpdate?: boolean;
        onAutoUpdateChange?: (v: boolean) => void;
    }>;
    About: React.FC;
    Sidebar: React.FC<{
        activePage: PageId;
        onPageChange: (page: PageId) => void;
        xenoVersion: string;
        isAttached: boolean;
        clientCount: number;
        updateAvailable: boolean;
        downloadState: DownloadStateInfo;
        powerUser: boolean;
    }>;
}

interface ThemeContextValue {
    themeId: ThemeId;
    pages: ThemePages;
}

export const ThemeContext = createContext<ThemeContextValue>(null!);

export const useTheme = () => useContext(ThemeContext);

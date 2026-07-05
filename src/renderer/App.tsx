import {
    FluentProvider,
    webDarkTheme,
    webLightTheme,
    type Theme,
} from "@fluentui/react-components";
import { useCallback, useEffect, useRef, useState } from "react";
import { NotificationProvider, useNotification } from "./components/Notifications";
import { SetupScreen } from "./components/fluent/SetupScreen";
import { ThemeContext, type ThemeId } from "./themes/ThemeContext";
import { getThemePages } from "./themes";
import type { DownloadStateInfo } from "@common/ContextBridge";
import type { ExecutionLog, PageId, RobloxClientInfo, SavedScript, ScriptTab } from "@common/types";
import "./styles/app.css";

const shouldUseDarkColors = (): boolean =>
    window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches;

const getFluentTheme = () => (shouldUseDarkColors() ? webDarkTheme : webLightTheme);

interface PersistedState {
    activePage: PageId;
    themeId: ThemeId;
    powerUser: boolean;
    streamerMode: boolean;
    autoUpdate: boolean;
    executeTabs: ScriptTab[];
    executeActiveTabId: string;
    executeSelectedPids: string[];
    scriptHubQuery: string;
}

const DEFAULT_STATE: PersistedState = {
    activePage: "dashboard",
    themeId: "fluent",
    powerUser: false,
    streamerMode: false,
    autoUpdate: true,
    executeTabs: [],
    executeActiveTabId: "",
    executeSelectedPids: [],
    scriptHubQuery: "",
};

export const App = () => {
    return (
        <NotificationProvider>
            <AppInner />
        </NotificationProvider>
    );
};

const AppInner = () => {
    const { notify } = useNotification();
    const [fluentTheme, setFluentTheme] = useState<Theme>(getFluentTheme());
    const [loaded, setLoaded] = useState(false);
    const [needsSetup, setNeedsSetup] = useState(false);

    // Persisted UI state
    const [activePage, setActivePage] = useState<PageId>(DEFAULT_STATE.activePage);
    const [themeId, setThemeId] = useState<ThemeId>(DEFAULT_STATE.themeId);
    const [powerUser, setPowerUser] = useState(DEFAULT_STATE.powerUser);
    const [streamerMode, setStreamerMode] = useState(DEFAULT_STATE.streamerMode);
    const [autoUpdate, setAutoUpdate] = useState(DEFAULT_STATE.autoUpdate);
    const [executeTabs, setExecuteTabs] = useState<ScriptTab[]>(DEFAULT_STATE.executeTabs);
    const [executeActiveTabId, setExecuteActiveTabId] = useState(DEFAULT_STATE.executeActiveTabId);
    const [executeSelectedPids, setExecuteSelectedPids] = useState<string[]>(DEFAULT_STATE.executeSelectedPids);
    const [scriptHubQuery, setScriptHubQuery] = useState(DEFAULT_STATE.scriptHubQuery);

    // Runtime state (not persisted)
    const [xenoVersion, setXenoVersion] = useState("");
    const [isAttached, setIsAttached] = useState(false);
    const [clients, setClients] = useState<RobloxClientInfo[]>([]);
    const [executionLog, setExecutionLog] = useState<ExecutionLog[]>([]);
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [_updateInfo, setUpdateInfo] = useState<{ latestVersion: string } | null>(null);
    const [downloadState, setDownloadState] = useState<DownloadStateInfo>({
        state: "idle",
        progress: 0,
        error: "",
    });

    const pages = getThemePages(themeId);
    const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
    const pendingPatch = useRef<Partial<PersistedState>>({});

    // Debounced save. Patches accumulate in pendingPatch across rapid-fire
    // effects so a later call (e.g. activePage) never clobbers an earlier
    // one (e.g. executeTabs) that hadn't flushed to disk yet.
    const scheduleSave = useCallback((patch: Partial<PersistedState>) => {
        Object.assign(pendingPatch.current, patch);
        if (saveTimer.current) clearTimeout(saveTimer.current);
        saveTimer.current = setTimeout(() => {
            const toSave = pendingPatch.current;
            pendingPatch.current = {};
            window.ContextBridge.loadAppState().then((existing) => {
                const merged = { ...existing, ...toSave };
                return window.ContextBridge.saveAppState(merged);
            }).catch(() => {});
        }, 300);
    }, []);

    // ── Theme effects ──
    useEffect(() => {
        document.documentElement.setAttribute("data-theme", themeId);
        scheduleSave({ themeId });
    }, [themeId, scheduleSave]);

    // Flush any pending (debounced) save immediately if the window is about
    // to close, so quick edits right before quitting aren't lost.
    useEffect(() => {
        const flush = () => {
            if (Object.keys(pendingPatch.current).length === 0) return;
            if (saveTimer.current) clearTimeout(saveTimer.current);
            const toSave = pendingPatch.current;
            pendingPatch.current = {};
            window.ContextBridge.loadAppState().then((existing) => {
                const merged = { ...existing, ...toSave };
                return window.ContextBridge.saveAppState(merged);
            }).catch(() => {});
        };
        window.addEventListener("beforeunload", flush);
        return () => window.removeEventListener("beforeunload", flush);
    }, []);

    // ── Persisted state watchers ──
    useEffect(() => { if (loaded) scheduleSave({ activePage }); }, [activePage, loaded, scheduleSave]);
    useEffect(() => { if (loaded) scheduleSave({ powerUser }); }, [powerUser, loaded, scheduleSave]);
    useEffect(() => { if (loaded) scheduleSave({ streamerMode }); }, [streamerMode, loaded, scheduleSave]);
    useEffect(() => { if (loaded) scheduleSave({ autoUpdate }); }, [autoUpdate, loaded, scheduleSave]);
    useEffect(() => { if (loaded) scheduleSave({ executeTabs, executeActiveTabId, executeSelectedPids }); }, [executeTabs, executeActiveTabId, executeSelectedPids, loaded, scheduleSave]);
    useEffect(() => { if (loaded) scheduleSave({ scriptHubQuery }); }, [scriptHubQuery, loaded, scheduleSave]);

    // ── Init: load persisted state + runtime data ──
    useEffect(() => {
        window.ContextBridge.onNativeThemeChanged(() => setFluentTheme(getFluentTheme()));
        window.ContextBridge.onDownloadState((info) => {
            setDownloadState(info);
            if (info.state === "ready") loadStatus();
        });
        window.ContextBridge.onDownloadLog(() => {});

        window.ContextBridge.loadAppState().then((state) => {
            if (state.activePage) setActivePage(state.activePage as PageId);
            if (state.themeId) setThemeId(state.themeId as ThemeId);
            if (state.powerUser !== undefined) setPowerUser(state.powerUser as boolean);
            if (state.streamerMode !== undefined) setStreamerMode(state.streamerMode as boolean);
            if (state.autoUpdate !== undefined) setAutoUpdate(state.autoUpdate as boolean);
            if (state.executeTabs && Array.isArray(state.executeTabs)) setExecuteTabs(state.executeTabs as ScriptTab[]);
            if (state.executeActiveTabId) setExecuteActiveTabId(state.executeActiveTabId as string);
            if (state.executeSelectedPids && Array.isArray(state.executeSelectedPids)) setExecuteSelectedPids(state.executeSelectedPids as string[]);
            if (state.scriptHubQuery) setScriptHubQuery(state.scriptHubQuery as string);
        }).catch(() => {}).finally(() => setLoaded(true));

        window.ContextBridge.getDownloadState().then(setDownloadState).catch(() => {});
        loadStatus();

        window.ContextBridge.onClientsChanged((data) => {
            const list = Array.isArray(data) ? data : [];
            setClients(list);
            const readyClients = list.filter((c) => c.state === 3);
            if (readyClients.length > 0) setIsAttached(true);
        });
        window.ContextBridge.onUpdateAvailable((info) => {
            setUpdateAvailable(true);
            setUpdateInfo(info);
        });
        window.ContextBridge.proxyHealth().then((h) => {
            if (h.status === "ok") {
                setXenoVersion(h.version);
                if (h.clients.length > 0) setIsAttached(true);
            } else {
                setNeedsSetup(true);
            }
        }).catch(() => setNeedsSetup(true));
    }, []);

    const loadStatus = async () => {
        try {
            const status = await window.ContextBridge.getXenoStatus();
            setXenoVersion(status.version);
            setIsAttached(status.attached);
        } catch { /* ignore */ }
        try {
            const scripts = await window.ContextBridge.loadScripts();
            setSavedScripts(scripts);
        } catch { /* ignore */ }
        try {
            const log = await window.ContextBridge.getExecutionLog();
            setExecutionLog(log);
        } catch { /* ignore */ }
    };

    const handleInject = useCallback(async () => {
        let ok = false;
        try {
            const health = await window.ContextBridge.proxyHealth();
            if (health.status === "ok") {
                const c = await window.ContextBridge.proxyGetClients();
                if (c.length > 0) {
                    ok = true;
                    setXenoVersion(health.version);
                    setIsAttached(true);
                    const names = streamerMode
                        ? c.map((_, i) => `Client ${i + 1}`).join(", ")
                        : c.map((cl) => cl.name).join(", ");
                    notify({
                        type: "info",
                        title: "Already injected",
                        message: c.length === 1 ? `${names} is already injected.` : `${c.length} clients already injected: ${names}`,
                    });
                    return;
                }
            }
        } catch { /* ignore */ }
        if (!ok) {
            try {
                ok = await window.ContextBridge.proxyAttach();
                if (ok) {
                    const health = await window.ContextBridge.proxyHealth();
                    setXenoVersion(health.version);
                    setIsAttached(true);
                    notify({ type: "success", title: "Injection successful", message: `Xeno v${health.version} is now injected.` });
                }
            } catch { /* ignore */ }
            if (!ok) {
                notify({ type: "error", title: "Injection failed", message: "Make sure Roblox is running and try again." });
            }
        }
    }, [notify, streamerMode]);

    const handleExecute = useCallback(async (script: string, pids: number[]) => {
        const entry: ExecutionLog = {
            id: Date.now().toString(36),
            script: script.slice(0, 200),
            targetPids: pids.map(String),
            status: "success",
            timestamp: Date.now(),
        };
        setExecutionLog((prev) => [entry, ...prev].slice(0, 50));
        notify({
            type: "success",
            title: "Script executed",
            message: `Sent to ${pids.length} client${pids.length !== 1 ? "s" : ""}.`,
        });
    }, [notify]);

    const handleSaveScript = useCallback(async (name: string, content: string) => {
        await window.ContextBridge.saveScript(name, content);
        const scripts = await window.ContextBridge.loadScripts();
        setSavedScripts(scripts);
    }, []);

    const handleDeleteScript = useCallback(async (name: string) => {
        await window.ContextBridge.deleteScript(name);
        const scripts = await window.ContextBridge.loadScripts();
        setSavedScripts(scripts);
    }, []);

    const { Dashboard, Execute, Hub, Panel, DLL, Logs, Settings, About, Sidebar } = pages;

    const handleSetupReady = useCallback(async () => {
        setNeedsSetup(false);
        try {
            const h = await window.ContextBridge.proxyHealth();
            if (h.status === "ok") {
                setXenoVersion(h.version);
                if (h.clients.length > 0) setIsAttached(true);
            }
        } catch { /* ignore */ }
        try {
            const status = await window.ContextBridge.getXenoStatus();
            setXenoVersion(status.version);
            setIsAttached(status.attached);
        } catch { /* ignore */ }
    }, []);

    if (needsSetup) {
        return (
            <FluentProvider theme={fluentTheme} style={{ height: "100vh", background: "transparent" }}>
                <SetupScreen onReady={handleSetupReady} />
            </FluentProvider>
        );
    }

    return (
        <ThemeContext.Provider value={{ themeId, pages }}>
            <FluentProvider theme={fluentTheme} style={{ height: "100vh", background: "transparent" }}>
                <div className="app-root">
                    <Sidebar
                        activePage={activePage}
                        onPageChange={setActivePage}
                        xenoVersion={xenoVersion}
                        isAttached={isAttached}
                        clientCount={clients.length}
                        updateAvailable={updateAvailable}
                        downloadState={downloadState}
                        powerUser={powerUser}
                    />
                    <div className="app-main">
                        <div className="app-content">
                            {activePage === "dashboard" && (
                                <Dashboard
                                    isAttached={isAttached}
                                    clients={clients}
                                    executionLog={executionLog}
                                    onNavigate={setActivePage}
                                    onExecute={handleExecute}
                                    onInject={handleInject}
                                    powerUser={powerUser}
                                    streamerMode={streamerMode}
                                    savedScripts={savedScripts}
                                    onSave={handleSaveScript}
                                    onDelete={handleDeleteScript}
                                    initialTabs={executeTabs}
                                    initialActiveTabId={executeActiveTabId}
                                    initialSelectedPids={executeSelectedPids}
                                    onTabsChange={setExecuteTabs}
                                    onActiveTabIdChange={setExecuteActiveTabId}
                                    onSelectedPidsChange={setExecuteSelectedPids}
                                />
                            )}
                            {activePage === "execute" && (
                                <Execute
                                    clients={clients}
                                    savedScripts={savedScripts}
                                    onSave={handleSaveScript}
                                    onLoad={() => {}}
                                    onDelete={handleDeleteScript}
                                    onExecute={handleExecute}
                                    onInject={handleInject}
                                    powerUser={powerUser}
                                    streamerMode={streamerMode}
                                    initialTabs={executeTabs}
                                    initialActiveTabId={executeActiveTabId}
                                    initialSelectedPids={executeSelectedPids}
                                    onTabsChange={setExecuteTabs}
                                    onActiveTabIdChange={setExecuteActiveTabId}
                                    onSelectedPidsChange={setExecuteSelectedPids}
                                />
                            )}
                            {activePage === "scripts" && (
                                <Hub
                                    initialQuery={scriptHubQuery}
                                    onQueryChange={setScriptHubQuery}
                                    onExecute={handleExecute}
                                />
                            )}
                            {activePage === "clients" && <Panel powerUser={powerUser} streamerMode={streamerMode} />}
                            {activePage === "dllStatus" && <DLL />}
                            {activePage === "logs" && <Logs />}
                            {activePage === "settings" && (
                                <Settings
                                    powerUser={powerUser}
                                    onPowerUserChange={setPowerUser}
                                    themeId={themeId}
                                    onThemeChange={setThemeId}
                                    streamerMode={streamerMode}
                                    onStreamerModeChange={setStreamerMode}
                                    autoUpdate={autoUpdate}
                                    onAutoUpdateChange={setAutoUpdate}
                                />
                            )}
                            {activePage === "about" && <About />}
                        </div>
                    </div>
                </div>
            </FluentProvider>
        </ThemeContext.Provider>
    );
};

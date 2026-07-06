import { useCallback, useEffect, useRef, useState } from "react";
import { TitleBar } from "./components/titlebar/TitleBar";
import { Sidebar } from "./components/layout/Sidebar";
import { Dashboard } from "./components/pages/Dashboard";
import { Execute } from "./components/pages/Execute";
import { Clients } from "./components/pages/Clients";
import { ScriptHub } from "./components/pages/ScriptHub";
import { Logs } from "./components/pages/Logs";
import { Settings } from "./components/pages/Settings";
import { About } from "./components/pages/About";
import { Downloads } from "./components/pages/Downloads";
import type { AppState, PageId, RobloxClient, ScriptTab, UiMode } from "@common/types";
import "./styles/global.css";

const DEFAULT_TABS: ScriptTab[] = [
    { id: "tab-0", name: "Script 1", content: "-- Write your Lua script here\nprint('Hello from Renegade!')" },
];

type RobloxProcess = { pid: number; name: string };

const DEFAULT_STATE: AppState = {
    activePage: "dashboard",
    uiMode: "full",
    sidebarCollapsed: false,
    executeTabs: DEFAULT_TABS,
    activeTabId: "tab-0",
    autoInject: false,
    selectedPids: [],
};

const log = (msg: string) => console.log(`[Renegade:UI] ${msg}`);

export const App = () => {
    const [loading, setLoading] = useState(true);
    const [appState, setAppState] = useState<AppState>(DEFAULT_STATE);
    const [serverRunning, setServerRunning] = useState(false);
    const [serverInstalled, setServerInstalled] = useState(false);
    const [serverVersion, setServerVersion] = useState("");
    const [xenoInstalled, setXenoInstalled] = useState(false);
    const [xenoVersion, setXenoVersion] = useState("");
    const [clients, setClients] = useState<RobloxClient[]>([]);
    const [robloxProcesses, setRobloxProcesses] = useState<RobloxProcess[]>([]);
    const [updateAvailable, setUpdateAvailable] = useState(false);
    const [updateDownloading, setUpdateDownloading] = useState(false);
    const [updateProgress, setUpdateProgress] = useState(0);
    const [updateReady, setUpdateReady] = useState(false);
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);
    const saveTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        log("App mounted, loading state...");
        loadState();
        checkStatus();
        setupUpdateListeners();
    }, []);

    const loadState = async () => {
        try {
            const saved = await window.ContextBridge.loadAppState();
            if (saved && typeof saved === "object") {
                setAppState((prev) => ({
                    ...prev,
                    activePage: (saved.activePage as PageId) || prev.activePage,
                    uiMode: (saved.uiMode as UiMode) || prev.uiMode,
                    sidebarCollapsed: typeof saved.sidebarCollapsed === "boolean" ? saved.sidebarCollapsed : prev.sidebarCollapsed,
                    executeTabs: Array.isArray(saved.executeTabs) && saved.executeTabs.length > 0 ? saved.executeTabs as ScriptTab[] : prev.executeTabs,
                    activeTabId: (saved.activeTabId as string) || prev.activeTabId,
                    autoInject: typeof saved.autoInject === "boolean" ? saved.autoInject : prev.autoInject,
                    selectedPids: Array.isArray(saved.selectedPids) ? saved.selectedPids as number[] : prev.selectedPids,
                }));
            }
        } catch { /* ignore */ }
    };

    const saveState = useCallback(async (patch: Partial<AppState>) => {
        setAppState((prev) => {
            const next = { ...prev, ...patch };
            if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
            saveTimeoutRef.current = setTimeout(() => {
                window.ContextBridge.saveAppState(next).catch(() => {});
            }, 300);
            return next;
        });
    }, []);

    const setupUpdateListeners = () => {
        window.ContextBridge.onUpdateAvailable(() => {
            log("Update available");
            setUpdateAvailable(true);
        });
        window.ContextBridge.onUpdateProgress((pct: number) => {
            setUpdateProgress(pct);
        });
        window.ContextBridge.onUpdateDownloaded(() => {
            log("Update downloaded");
            setUpdateReady(true);
            setUpdateDownloading(false);
        });
    };

    const handleDownloadUpdate = async () => {
        setUpdateDownloading(true);
        await window.ContextBridge.downloadUpdate();
    };

    const handleInstallUpdate = () => {
        window.ContextBridge.installUpdate();
    };

    const checkStatus = async () => {
        try {
            log("Checking server status...");
            const [status, xenoExists, xenoVer] = await Promise.all([
                window.ContextBridge.getServerStatus(),
                window.ContextBridge.isXenoInstalled(),
                window.ContextBridge.getXenoVersion(),
            ]);
            log(`Status: installed=${status.installed}, running=${status.running}, version=${status.serverVersion}`);

            setServerInstalled(status.installed);
            setXenoInstalled(xenoExists);
            setXenoVersion(xenoVer);

            if (status.installed && status.running) {
                setServerRunning(true);
                setServerVersion(status.serverVersion);
                setLoading(false);
                if (!status.initialized) {
                    log("DLL not initialized, calling init...");
                    await window.ContextBridge.initDll();
                }
                detectRobloxProcesses();
                loadClients();
                startPolling();
                return;
            }

            if (status.installed && !status.running) {
                log("Server installed but not running, starting...");
                const startResult = await window.ContextBridge.startServer();
                log(`Start: ${JSON.stringify(startResult)}`);
                if (startResult.success) {
                    setServerRunning(true);
                    const ver = await window.ContextBridge.getVersion();
                    setServerVersion(ver);
                    setLoading(false);
                    detectRobloxProcesses();
                    loadClients();
                    startPolling();
                    return;
                }
                log(`Start failed: ${startResult.error}`);
            }

            setLoading(false);
        } catch (e) {
            log(`Error: ${(e as Error).message}`);
            setLoading(false);
        }
    };

    const loadClients = async () => {
        try {
            const data = await window.ContextBridge.getClients();
            const list = Array.isArray(data) ? (data as RobloxClient[]) : [];
            setClients(list);
        } catch {
            setClients([]);
        }
    };

    const detectRobloxProcesses = async () => {
        try {
            const procs = await window.ContextBridge.getRobloxProcesses();
            setRobloxProcesses(procs);
        } catch {
            setRobloxProcesses([]);
        }
    };

    const pollHealth = useCallback(async () => {
        try {
            const h = await window.ContextBridge.health();
            if (h.status === "ok") {
                if (!serverRunning) {
                    setServerRunning(true);
                    setServerVersion(h.version);
                }
                loadClients();
                detectRobloxProcesses();
            } else if (serverRunning) {
                log("Server went offline");
                setServerRunning(false);
                setClients([]);
            }
        } catch { /* ignore */ }
    }, [serverRunning]);

    const startPolling = useCallback(() => {
        if (pollRef.current) clearInterval(pollRef.current);
        pollRef.current = setInterval(pollHealth, 3000);
    }, [pollHealth]);

    useEffect(() => {
        if (serverRunning) {
            startPolling();
        } else if (pollRef.current) {
            clearInterval(pollRef.current);
            pollRef.current = null;
        }
        return () => {
            if (pollRef.current) clearInterval(pollRef.current);
        };
    }, [serverRunning, startPolling]);

    useEffect(() => {
        window.ContextBridge.onServerDied(() => {
            log("Server died notification");
            setServerRunning(false);
            setClients([]);
        });
    }, []);

    const handleDownloadsReady = async () => {
        log("Downloads ready, starting server...");
        setServerRunning(true);
        try {
            const ver = await window.ContextBridge.getVersion();
            setServerVersion(ver);
            setServerInstalled(true);
            setXenoInstalled(true);
            const xenoVer = await window.ContextBridge.getXenoVersion();
            setXenoVersion(xenoVer);
        } catch { /* ignore */ }
        loadClients();
        detectRobloxProcesses();
        startPolling();
        saveState({ activePage: "dashboard" });
        setAppState((prev) => ({ ...prev, activePage: "dashboard" }));
    };

    const handleAttach = async () => {
        try {
            await window.ContextBridge.attach();
            setTimeout(() => {
                loadClients();
                detectRobloxProcesses();
            }, 1000);
        } catch { /* ignore */ }
    };

    const handleExecute = async (script: string, pids: number[]) => {
        try {
            await window.ContextBridge.execute(script, pids);
        } catch { /* ignore */ }
    };

    const handlePageChange = useCallback((page: PageId) => {
        saveState({ activePage: page });
    }, [saveState]);

    const handleToggleCollapse = useCallback(() => {
        setAppState((prev) => {
            const next = !prev.sidebarCollapsed;
            saveState({ sidebarCollapsed: next });
            return { ...prev, sidebarCollapsed: next };
        });
    }, [saveState]);

    const handleUiModeChange = useCallback((mode: UiMode) => {
        saveState({ uiMode: mode });
        if (mode === "compact") {
            window.ContextBridge.setWindowSize(750, 560);
        } else {
            window.ContextBridge.setWindowSize(1200, 800);
        }
    }, [saveState]);

    const handleTabsChange = useCallback((tabs: ScriptTab[], activeId: string) => {
        saveState({ executeTabs: tabs, activeTabId: activeId });
    }, [saveState]);

    const handleSelectedPidsChange = useCallback((pids: number[]) => {
        saveState({ selectedPids: pids });
    }, [saveState]);

    useEffect(() => {
        const handleCreateTab = (e: Event) => {
            const detail = (e as CustomEvent).detail as { name: string; content: string };
            const id = `tab-${Date.now()}`;
            const newTab: ScriptTab = { id, name: detail.name, content: detail.content };
            setAppState((prev) => {
                const next = { ...prev, executeTabs: [...prev.executeTabs, newTab], activeTabId: id, activePage: "execute" as PageId };
                window.ContextBridge.saveAppState(next).catch(() => {});
                return next;
            });
        };
        const handleExecuteScript = (e: Event) => {
            const detail = (e as CustomEvent).detail as { script: string };
            if (clients.length > 0) {
                handleExecute(detail.script, clients.map((c) => c[0]));
            } else {
                const id = `tab-${Date.now()}`;
                const newTab: ScriptTab = { id, name: "Executed", content: detail.script };
                setAppState((prev) => {
                    const next = { ...prev, executeTabs: [...prev.executeTabs, newTab], activeTabId: id, activePage: "execute" as PageId };
                    window.ContextBridge.saveAppState(next).catch(() => {});
                    return next;
                });
            }
        };
        window.addEventListener("renegade:createTab", handleCreateTab);
        window.addEventListener("renegade:executeScript", handleExecuteScript);
        return () => {
            window.removeEventListener("renegade:createTab", handleCreateTab);
            window.removeEventListener("renegade:executeScript", handleExecuteScript);
        };
    }, [clients]);

    const handleAutoInjectToggle = useCallback(() => {
        setAppState((prev) => {
            const next = !prev.autoInject;
            saveState({ autoInject: next });
            return { ...prev, autoInject: next };
        });
    }, [saveState]);

    if (loading) {
        return (
            <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
                <TitleBar uiMode={appState.uiMode} />
                <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-primary)" }}>
                    <div style={{ color: "var(--text-tertiary)", fontSize: 13 }}>Loading...</div>
                </div>
            </div>
        );
    }

    const renderPage = () => {
        switch (appState.activePage) {
            case "dashboard":
                return <Dashboard serverRunning={serverRunning} serverVersion={serverVersion} clientCount={clients.length} onNavigate={handlePageChange} onAttach={handleAttach} />;
            case "downloads":
                return (
                    <Downloads
                        serverInstalled={serverInstalled}
                        serverRunning={serverRunning}
                        serverVersion={serverVersion}
                        xenoInstalled={xenoInstalled}
                        xenoVersion={xenoVersion}
                        onReady={handleDownloadsReady}
                    />
                );
            case "execute":
                return (
                    <Execute
                        clients={clients}
                        robloxProcesses={robloxProcesses}
                        onExecute={handleExecute}
                        onAttach={handleAttach}
                        initialTabs={appState.executeTabs}
                        initialActiveTabId={appState.activeTabId}
                        onTabsChange={handleTabsChange}
                        initialSelectedPids={appState.selectedPids}
                        onSelectedPidsChange={handleSelectedPidsChange}
                    />
                );
            case "clients":
                return <Clients clients={clients} />;
            case "scripts":
                return <ScriptHub />;
            case "logs":
                return <Logs />;
            case "settings":
                return <Settings uiMode={appState.uiMode} onUiModeChange={handleUiModeChange} autoInject={appState.autoInject} onAutoInjectToggle={handleAutoInjectToggle} />;
            case "about":
                return <About serverVersion={serverVersion} />;
        }
    };

    const renderUpdateBanners = () => (
        <>
            {updateAvailable && !updateReady && (
                <div className="update-banner">
                    <span className="update-banner-text">Update available</span>
                    {updateDownloading ? (
                        <span className="update-banner-progress">{Math.round(updateProgress)}%</span>
                    ) : (
                        <button className="update-banner-btn" onClick={handleDownloadUpdate}>Download</button>
                    )}
                    <button className="update-banner-dismiss" onClick={() => setUpdateAvailable(false)}>×</button>
                </div>
            )}
            {updateReady && (
                <div className="update-banner ready">
                    <span className="update-banner-text">Update ready to install</span>
                    <button className="update-banner-btn" onClick={handleInstallUpdate}>Restart & Install</button>
                    <button className="update-banner-dismiss" onClick={() => setUpdateReady(false)}>×</button>
                </div>
            )}
        </>
    );

    return (
        <div style={{ height: "100vh", display: "flex", flexDirection: "column" }}>
            <TitleBar
                uiMode={appState.uiMode}
                activePage={appState.activePage}
                onPageChange={handlePageChange}
                serverRunning={serverRunning}
                clientCount={clients.length}
            />
            {appState.uiMode === "compact" ? (
                <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                    {renderPage()}
                    {renderUpdateBanners()}
                </div>
            ) : (
                <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
                    <Sidebar
                        activePage={appState.activePage}
                        onPageChange={handlePageChange}
                        serverRunning={serverRunning}
                        serverVersion={serverVersion}
                        clientCount={clients.length}
                        collapsed={appState.sidebarCollapsed}
                        onToggleCollapse={handleToggleCollapse}
                    />
                    <div style={{ flex: 1, overflow: "hidden", position: "relative" }}>
                        {renderPage()}
                        {renderUpdateBanners()}
                    </div>
                </div>
            )}
        </div>
    );
};

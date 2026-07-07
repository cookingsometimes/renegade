import { useCallback, useEffect, useRef, useState } from "react";
import type { FavoriteScript, RobloxClient, SavedScript, ScriptTab, ExecutorType } from "@common/types";
import { CodeEditor } from "../ui/CodeEditor";
import "./Execute.css";

let tabCounter = 100;

type RobloxProcess = { pid: number; name: string };

interface Props {
    clients: RobloxClient[];
    robloxProcesses: RobloxProcess[];
    onExecute: (script: string, pids: number[]) => void;
    onAttach: () => void;
    initialTabs: ScriptTab[];
    initialActiveTabId: string;
    onTabsChange: (tabs: ScriptTab[], activeId: string) => void;
    initialSelectedPids: number[];
    onSelectedPidsChange: (pids: number[]) => void;
    executor: ExecutorType;
    velocityStatus: { available: boolean; initialized: boolean; version: string; state: string; injectedPids: number[] };
    _fetchVelocityStatus?: () => Promise<void>;
    executorStatus: { status: string; reason: string } | null;
}

export const Execute = ({ clients, robloxProcesses, onExecute, onAttach, initialTabs, initialActiveTabId, onTabsChange, initialSelectedPids, onSelectedPidsChange, executor, velocityStatus, executorStatus }: Props) => {
    const [tabs, setTabs] = useState<ScriptTab[]>(initialTabs);
    const [activeTabId, setActiveTabId] = useState(initialActiveTabId);
    const [selectedPids, setSelectedPids] = useState<Set<number>>(() => new Set(initialSelectedPids));
    const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

    const [openSections, setOpenSections] = useState<Set<string>>(() => new Set(["processes"]));
    const [localScripts, setLocalScripts] = useState<SavedScript[]>([]);
    const [favorites, setFavorites] = useState<FavoriteScript[]>([]);

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

    useEffect(() => {
        onTabsChange(tabs, activeTabId);
    }, [tabs, activeTabId, onTabsChange]);

    useEffect(() => {
        onSelectedPidsChange(Array.from(selectedPids));
    }, [selectedPids, onSelectedPidsChange]);

    useEffect(() => {
        if (renamingTabId && renameInputRef.current) {
            renameInputRef.current.focus();
            renameInputRef.current.select();
        }
    }, [renamingTabId]);

    useEffect(() => {
        if (!contextMenu) return;
        const handleClick = (e: MouseEvent) => {
            if (contextMenuRef.current && !contextMenuRef.current.contains(e.target as Node)) {
                setContextMenu(null);
            }
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [contextMenu]);

    useEffect(() => {
        if (clients.length === 1) {
            const pid = clients[0][0];
            setSelectedPids((prev) => {
                if (prev.size === 0 || (prev.size === 1 && prev.has(pid))) return prev;
                return new Set([pid]);
            });
        }
    }, [clients]);

    useEffect(() => {
        loadPanelScripts();
    }, []);

    const loadPanelScripts = async () => {
        try {
            const [scripts, favs] = await Promise.all([
                window.ContextBridge.loadScripts(),
                window.ContextBridge.loadFavorites(),
            ]);
            setLocalScripts(scripts);
            setFavorites(favs as FavoriteScript[]);
        } catch { /* ignore */ }
    };

    const toggleSection = (section: string) => {
        setOpenSections((prev) => {
            const next = new Set(prev);
            if (next.has(section)) next.delete(section);
            else next.add(section);
            return next;
        });
    };

    const updateTabContent = useCallback((id: string, content: string) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, content } : t)));
    }, []);

    const addTab = useCallback(() => {
        const id = `tab-${tabCounter++}`;
        setTabs((prev) => [...prev, { id, name: `Script ${tabCounter}`, content: "" }]);
        setActiveTabId(id);
    }, []);

    const closeTab = useCallback((id: string) => {
        setTabs((prev) => {
            const next = prev.filter((t) => t.id !== id);
            if (next.length === 0) {
                const newId = `tab-${tabCounter++}`;
                setActiveTabId(newId);
                return [{ id: newId, name: "Script 1", content: "-- Write your Lua script here\nprint('Hello from Renegade!')" }];
            }
            const idx = prev.findIndex((t) => t.id === id);
            const newIdx = Math.min(idx, next.length - 1);
            setActiveTabId(next[newIdx].id);
            return next;
        });
    }, []);

    const renameTab = useCallback((id: string, name: string) => {
        setTabs((prev) => prev.map((t) => (t.id === id ? { ...t, name: name || t.name } : t)));
    }, []);

    const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
        e.preventDefault();
        setContextMenu({ tabId, x: e.clientX, y: e.clientY });
    }, []);

    const handleRename = useCallback(() => {
        if (contextMenu) {
            setRenamingTabId(contextMenu.tabId);
            setContextMenu(null);
        }
    }, [contextMenu]);

    const handleClose = useCallback(() => {
        if (contextMenu) {
            closeTab(contextMenu.tabId);
            setContextMenu(null);
        }
    }, [contextMenu, closeTab]);

    const handleRenameSubmit = useCallback((id: string, value: string) => {
        renameTab(id, value);
        setRenamingTabId(null);
    }, [renameTab]);

    const togglePid = useCallback((pid: number) => {
        setSelectedPids((prev) => {
            const next = new Set(prev);
            if (next.has(pid)) next.delete(pid);
            else next.add(pid);
            return next;
        });
    }, []);

    const handleExecute = useCallback(() => {
        if (!activeTab) return;
        if (executor === "velocity") {
            onExecute(activeTab.content, []);
        } else {
            if (selectedPids.size === 0) return;
            onExecute(activeTab.content, Array.from(selectedPids));
        }
    }, [activeTab, selectedPids, onExecute, executor]);

    const openScriptInTab = (name: string, content: string) => {
        const id = `tab-${tabCounter++}`;
        setTabs((prev) => [...prev, { id, name, content }]);
        setActiveTabId(id);
    };

    const executeScript = (script: string) => {
        const event = new CustomEvent("renegade:executeScript", { detail: { script } });
        window.dispatchEvent(event);
    };

    const handleSave = useCallback(async () => {
        if (!activeTab) return;
        await window.ContextBridge.saveScript(activeTab.name, activeTab.content);
    }, [activeTab]);

    return (
        <div className="execute">
            <div className="execute-tabs-bar">
                <div className="execute-tabs">
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`execute-tab ${tab.id === activeTabId ? "active" : ""}`}
                            onClick={() => setActiveTabId(tab.id)}
                            onContextMenu={(e) => handleContextMenu(e, tab.id)}
                        >
                            {renamingTabId === tab.id ? (
                                <input
                                    ref={renameInputRef}
                                    className="execute-tab-rename-input"
                                    defaultValue={tab.name}
                                    onBlur={(e) => handleRenameSubmit(tab.id, e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleRenameSubmit(tab.id, (e.target as HTMLInputElement).value);
                                        if (e.key === "Escape") setRenamingTabId(null);
                                    }}
                                    spellCheck={false}
                                />
                            ) : (
                                <span className="execute-tab-name">{tab.name}</span>
                            )}
                            {tabs.length > 1 && (
                                <button
                                    className="execute-tab-close"
                                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <div className="execute-tabs-actions">
                    <button className="execute-tab-add" onClick={addTab} title="New tab">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                    <button className="execute-toolbar-btn" onClick={handleSave} title="Save (Ctrl+S)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        Save
                    </button>
                    <button className="execute-toolbar-btn" onClick={() => navigator.clipboard?.writeText(activeTab?.content ?? "")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                        Copy
                    </button>
                    <button className="execute-toolbar-btn" onClick={() => navigator.clipboard?.readText().then((t) => updateTabContent(activeTabId, t)).catch(() => {})}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                        Paste
                    </button>
                    <button className="execute-toolbar-btn run" onClick={handleExecute} disabled={executor !== "velocity" && selectedPids.size === 0}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                        Execute
                    </button>
                </div>
            </div>

            {contextMenu && (
                <div
                    ref={contextMenuRef}
                    className="execute-context-menu"
                    style={{ left: contextMenu.x, top: contextMenu.y }}
                >
                    <button className="execute-context-item" onClick={handleRename}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3a2.83 2.83 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" /></svg>
                        Rename
                    </button>
                    <button className="execute-context-item" onClick={handleClose}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                        Close
                    </button>
                </div>
            )}

            {executorStatus && (
                <div className={`execute-status-banner status-${executorStatus.status}`}>
                    <div className="execute-status-icon">
                        {executorStatus.status === "stable" ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M22 11.08V12a10 10 0 11-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
                        ) : executorStatus.status === "unstable" ? (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" /><line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" /></svg>
                        ) : (
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" /></svg>
                        )}
                    </div>
                    <span className="execute-status-text">{executorStatus.reason}</span>
                </div>
            )}

            <div className="execute-body">
                <div className="execute-editor">
                    {activeTab && (
                        <CodeEditor
                            key={activeTab.id}
                            value={activeTab.content}
                            onChange={(v) => updateTabContent(activeTab.id, v)}
                        />
                    )}
                </div>
                <div className="execute-panel">
                    <div className="execute-panel-scroll">
                        {executor === "velocity" && (
                            <div className="velocity-status-banner">
                                <div className="velocity-status-dot" data-state={velocityStatus.state} />
                                <span className="velocity-status-text">
                                    Velocity {velocityStatus.version || "?"} — {velocityStatus.state}
                                </span>
                                {velocityStatus.injectedPids.length > 0 && (
                                    <span className="velocity-pid-count">{velocityStatus.injectedPids.length} injected</span>
                                )}
                            </div>
                        )}

                        <div className="execute-section">
                            <button className="execute-section-header" onClick={() => toggleSection("processes")}>
                                <svg className={`execute-section-arrow ${openSections.has("processes") ? "open" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                {executor === "velocity" ? "Processes" : "Processes"}
                                <span className="execute-section-count">{clients.length || robloxProcesses.length}</span>
                            </button>
                            {openSections.has("processes") && (
                                <div className="execute-section-content">
                                    {executor === "velocity" ? (
                                        <>
                                            {robloxProcesses.length > 0 ? (
                                                robloxProcesses.map((p) => {
                                                    const isInjected = velocityStatus.injectedPids.includes(p.pid);
                                                    return (
                                                        <div key={p.pid} className={`execute-client ${isInjected ? "selected" : ""}`}>
                                                            <div className="execute-client-check">
                                                                {isInjected && (
                                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                                )}
                                                            </div>
                                                            <div className="execute-client-info">
                                                                <span className="execute-client-name">{p.name}</span>
                                                                <span className="execute-client-pid">PID {p.pid} — {isInjected ? "Injected" : "Not injected"}</span>
                                                            </div>
                                                        </div>
                                                    );
                                                })
                                            ) : (
                                                <div className="execute-empty">No Roblox processes found</div>
                                            )}
                                        </>
                                    ) : (
                                        <>
                                            {clients.length > 0 ? (
                                                clients.map((c) => (
                                                    <div
                                                        key={c[0]}
                                                        className={`execute-client ${selectedPids.has(c[0]) ? "selected" : ""}`}
                                                        onClick={() => togglePid(c[0])}
                                                    >
                                                        <div className="execute-client-check">
                                                            {selectedPids.has(c[0]) && (
                                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                                            )}
                                                        </div>
                                                        <div className="execute-client-info">
                                                            <span className="execute-client-name">{c[1]}</span>
                                                            <span className="execute-client-pid">PID {c[0]} — Injected</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : robloxProcesses.length > 0 ? (
                                                robloxProcesses.map((p) => (
                                                    <div key={p.pid} className="execute-client detected">
                                                        <div className="execute-client-info">
                                                            <span className="execute-client-name">{p.name}</span>
                                                            <span className="execute-client-pid">PID {p.pid} — Not injected</span>
                                                        </div>
                                                    </div>
                                                ))
                                            ) : (
                                                <div className="execute-empty">No Roblox processes found</div>
                                            )}
                                        </>
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="execute-section">
                            <button className="execute-section-header" onClick={() => toggleSection("local")}>
                                <svg className={`execute-section-arrow ${openSections.has("local") ? "open" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                Local
                                <span className="execute-section-count">{localScripts.length}</span>
                            </button>
                            {openSections.has("local") && (
                                <div className="execute-section-content">
                                    {localScripts.length === 0 ? (
                                        <div className="execute-empty">No saved scripts</div>
                                    ) : (
                                        localScripts.map((s) => (
                                            <div key={s.name} className="execute-script-item">
                                                <div className="execute-script-info" onClick={() => openScriptInTab(s.name, s.content)}>
                                                    <span className="execute-script-name">{s.name}</span>
                                                    <span className="execute-script-date">{new Date(s.saved).toLocaleDateString()}</span>
                                                </div>
                                                <button className="execute-script-exec" onClick={() => executeScript(s.content)} title="Execute">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>

                        <div className="execute-section">
                            <button className="execute-section-header" onClick={() => toggleSection("favorites")}>
                                <svg className={`execute-section-arrow ${openSections.has("favorites") ? "open" : ""}`} width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="9 18 15 12 9 6" /></svg>
                                Favorites
                                <span className="execute-section-count">{favorites.length}</span>
                            </button>
                            {openSections.has("favorites") && (
                                <div className="execute-section-content">
                                    {favorites.length === 0 ? (
                                        <div className="execute-empty">No favorites yet</div>
                                    ) : (
                                        favorites.map((f) => (
                                            <div key={f.id} className="execute-script-item">
                                                <div className="execute-script-info" onClick={() => openScriptInTab(f.title, f.script)}>
                                                    <span className="execute-script-name">{f.title}</span>
                                                    <span className="execute-script-date">{f.game || "Universal"}</span>
                                                </div>
                                                <button className="execute-script-exec" onClick={() => executeScript(f.script)} title="Execute">
                                                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                                </button>
                                            </div>
                                        ))
                                    )}
                                </div>
                            )}
                        </div>
                    </div>
                    <div className="execute-panel-actions">
                        <button className={`execute-attach-btn ${executor === "velocity" ? "velocity" : ""}`} onClick={onAttach}>
                            {executor === "velocity" ? "Inject (Velocity)" : "Inject"}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

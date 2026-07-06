import { useCallback, useEffect, useRef, useState } from "react";
import type { RobloxClient, SavedScript, ScriptTab } from "@common/types";
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
}

export const Execute = ({ clients, robloxProcesses, onExecute, onAttach, initialTabs, initialActiveTabId, onTabsChange, initialSelectedPids, onSelectedPidsChange }: Props) => {
    const [tabs, setTabs] = useState<ScriptTab[]>(initialTabs);
    const [activeTabId, setActiveTabId] = useState(initialActiveTabId);
    const [selectedPids, setSelectedPids] = useState<Set<number>>(() => new Set(initialSelectedPids));
    const [contextMenu, setContextMenu] = useState<{ tabId: string; x: number; y: number } | null>(null);
    const [renamingTabId, setRenamingTabId] = useState<string | null>(null);
    const renameInputRef = useRef<HTMLInputElement>(null);
    const contextMenuRef = useRef<HTMLDivElement>(null);

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
        if (selectedPids.size === 0 || !activeTab) return;
        onExecute(activeTab.content, Array.from(selectedPids));
    }, [activeTab, selectedPids, onExecute]);

    const [showOpen, setShowOpen] = useState(false);
    const [savedScripts, setSavedScripts] = useState<SavedScript[]>([]);
    const openRef = useRef<HTMLDivElement>(null);

    const handleSave = useCallback(async () => {
        if (!activeTab) return;
        await window.ContextBridge.saveScript(activeTab.name, activeTab.content);
    }, [activeTab]);

    const handleOpenList = useCallback(async () => {
        const list = await window.ContextBridge.loadScripts();
        setSavedScripts(list);
        setShowOpen(true);
    }, []);

    const handleOpenScript = useCallback((s: SavedScript) => {
        const id = `tab-${tabCounter++}`;
        setTabs((prev) => [...prev, { id, name: s.name, content: s.content }]);
        setActiveTabId(id);
        setShowOpen(false);
    }, []);

    useEffect(() => {
        if (!showOpen) return;
        const handleClick = (e: MouseEvent) => {
            if (openRef.current && !openRef.current.contains(e.target as Node)) setShowOpen(false);
        };
        document.addEventListener("mousedown", handleClick);
        return () => document.removeEventListener("mousedown", handleClick);
    }, [showOpen]);

    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key === "s") {
                e.preventDefault();
                handleSave();
            }
        };
        window.addEventListener("keydown", handler);
        return () => window.removeEventListener("keydown", handler);
    }, [handleSave]);

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
                    <button className="execute-tab-add" onClick={addTab} title="New tab">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <line x1="12" y1="5" x2="12" y2="19" />
                            <line x1="5" y1="12" x2="19" y2="12" />
                        </svg>
                    </button>
                </div>
                <div className="execute-tabs-actions">
                    <button className="execute-toolbar-btn" onClick={handleSave} title="Save (Ctrl+S)">
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 21H5a2 2 0 01-2-2V5a2 2 0 012-2h11l5 5v11a2 2 0 01-2 2z" /><polyline points="17 21 17 13 7 13 7 21" /><polyline points="7 3 7 8 15 8" /></svg>
                        Save
                    </button>
                    <div className="execute-toolbar-open" ref={openRef}>
                        <button className="execute-toolbar-btn" onClick={handleOpenList} title="Open saved script">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                            Open
                        </button>
                        {showOpen && (
                            <div className="execute-open-dropdown">
                                {savedScripts.length === 0 ? (
                                    <div className="execute-open-empty">No saved scripts</div>
                                ) : (
                                    savedScripts.map((s) => (
                                        <button key={s.name} className="execute-open-item" onClick={() => handleOpenScript(s)}>
                                            <span className="execute-open-name">{s.name}</span>
                                            <span className="execute-open-date">{new Date(s.saved).toLocaleDateString()}</span>
                                        </button>
                                    ))
                                )}
                            </div>
                        )}
                    </div>
                    <button className="execute-toolbar-btn" onClick={() => navigator.clipboard?.writeText(activeTab?.content ?? "")}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                        Copy
                    </button>
                    <button className="execute-toolbar-btn" onClick={() => navigator.clipboard?.readText().then((t) => updateTabContent(activeTabId, t)).catch(() => {})}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" /></svg>
                        Paste
                    </button>
                    <button className="execute-toolbar-btn run" onClick={handleExecute} disabled={selectedPids.size === 0}>
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
                    <div className="execute-panel-header">
                        {clients.length > 0 ? "Injected" : "Processes"}
                    </div>
                    <div className="execute-panel-list">
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
                            <div className="execute-empty">
                                No Roblox processes found
                            </div>
                        )}
                    </div>
                    <div className="execute-panel-actions">
                        <button className="execute-attach-btn" onClick={onAttach}>Inject</button>
                    </div>
                </div>
            </div>
        </div>
    );
};

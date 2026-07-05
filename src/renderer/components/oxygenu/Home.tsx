import { useState, useCallback, useEffect, useRef } from "react";
import type { RobloxClientInfo, SavedScript, ScriptTab } from "@common/types";
import { MonacoEditor } from "../MonacoEditor";

const C = {
    bg: "#0d1117",
    surface: "#161b22",
    border: "#21262d",
    accent: "#1f6feb",
    hover: "#1c2128",
    text: "#c9d1d9",
    muted: "#8b949e",
};

interface Tab {
    id: string;
    title: string;
    content: string;
}

const genId = () => Math.random().toString(36).slice(2, 8);

const Icon = ({ d, size = 16 }: { d: string; size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d={d} />
    </svg>
);

const PlayFill = ({ size = 16 }: { size?: number }) => (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="currentColor"><polygon points="5 3 19 12 5 21 5 3" /></svg>
);

const nextUntitledNum = (tabs: Tab[]) => {
    const nums = tabs
        .map((t) => {
            const m = t.title.match(/^Untitled \((\d+)\)$/);
            return m ? parseInt(m[1], 10) : t.title === "Untitled" ? 0 : -1;
        })
        .filter((n) => n >= 0);
    const max = nums.length > 0 ? Math.max(...nums) : 0;
    return max + 1;
};

interface Props {
    clients?: RobloxClientInfo[];
    savedScripts?: SavedScript[];
    onSave?: (name: string, content: string) => void;
    onLoad?: (content: string) => void;
    onDelete?: (name: string) => void;
    onExecute?: (script: string, pids: number[]) => void;
    onInject?: () => void;
    onNavigate?: (page: string) => void;
    powerUser?: boolean;
    streamerMode?: boolean;
    initialTabs?: ScriptTab[];
    initialActiveTabId?: string;
    initialSelectedPids?: string[];
    onTabsChange?: (tabs: ScriptTab[]) => void;
    onActiveTabIdChange?: (id: string) => void;
    onSelectedPidsChange?: (pids: string[]) => void;
}

export const Home = ({
    clients = [],
    savedScripts: _savedScripts = [],
    onSave,
    onLoad: _onLoad,
    onDelete: _onDelete,
    onExecute,
    onInject,
    onNavigate: _onNavigate,
    powerUser: _powerUser = false,
    streamerMode = false,
    initialTabs,
    initialActiveTabId,
    initialSelectedPids,
    onTabsChange,
    onActiveTabIdChange,
    onSelectedPidsChange,
}: Props) => {
    const [tabs, setTabs] = useState<Tab[]>(() => {
        if (initialTabs && initialTabs.length > 0) return initialTabs as unknown as Tab[];
        return [{ id: genId(), title: "Untitled (1)", content: "" }];
    });
    const [activeTabId, setActiveTabId] = useState(initialActiveTabId || tabs[0].id);
    const [selectedPids, setSelectedPids] = useState<string[]>(initialSelectedPids || []);
    const [showClients, setShowClients] = useState(false);
    const [editingTabId, setEditingTabId] = useState<string | null>(null);
    const [editingName, setEditingName] = useState("");
    const renameInputRef = useRef<HTMLInputElement>(null);

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];

    const updateContent = useCallback(
        (value: string) => {
            setTabs((prev) =>
                prev.map((t) => {
                    if (t.id !== activeTabId) return t;
                    return { ...t, content: value };
                })
            );
        },
        [activeTabId]
    );

    const addTab = () => {
        const num = nextUntitledNum(tabs);
        const id = genId();
        setTabs((prev) => [...prev, { id, title: `Untitled (${num})`, content: "" }]);
        setActiveTabId(id);
    };

    const closeTab = (id: string) => {
        if (tabs.length === 1) return;
        setTabs((prev) => prev.filter((t) => t.id !== id));
        if (activeTabId === id) {
            setActiveTabId(tabs.find((t) => t.id !== id)?.id ?? tabs[0].id);
        }
    };

    const startRename = (id: string) => {
        const tab = tabs.find((t) => t.id === id);
        if (!tab) return;
        setEditingTabId(id);
        setEditingName(tab.title);
        setTimeout(() => renameInputRef.current?.focus(), 0);
    };

    const commitRename = () => {
        if (editingTabId && editingName.trim()) {
            setTabs((prev) => prev.map((t) => t.id === editingTabId ? { ...t, title: editingName.trim() } : t));
        }
        setEditingTabId(null);
    };

    const handleExecute = async () => {
        if (!activeTab.content.trim()) return;
        const pids = selectedPids.length > 0
            ? selectedPids.map(Number)
            : clients.map((c) => c.pid);
        try {
            await window.ContextBridge.proxyExecute(activeTab.content, pids);
        } catch {
            // fall through to onExecute for log/notification even if the proxy call failed
        }
        onExecute?.(activeTab.content, pids);
    };

    const handleInject = () => {
        if (onInject) onInject();
    };

    const handleFileOpen = () => {
        const input = document.createElement("input");
        input.type = "file";
        input.accept = ".lua,.luau,.txt,.script";
        input.onchange = (e: Event) => {
            const file = (e.target as HTMLInputElement).files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (ev) => {
                const content = ev.target?.result as string;
                const id = genId();
                const name = file.name.replace(/\.[^.]+$/, "");
                setTabs((prev) => [...prev, { id, title: name, content }]);
                setActiveTabId(id);
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleSave = () => {
        if (activeTab.content.trim() && onSave) {
            onSave(activeTab.title, activeTab.content);
        }
    };

    useEffect(() => { onTabsChange?.(tabs as unknown as ScriptTab[]); }, [tabs]);
    useEffect(() => { onActiveTabIdChange?.(activeTabId); }, [activeTabId]);
    useEffect(() => { onSelectedPidsChange?.(selectedPids); }, [selectedPids]);

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, position: "relative" }}>
            {/* Tabs */}
            <div style={{ display: "flex", alignItems: "stretch", background: C.surface, borderBottom: `1px solid ${C.border}`, height: 42, flexShrink: 0 }}>
                <div style={{ display: "flex", alignItems: "stretch", overflowX: "auto", flex: 1, scrollbarWidth: "none" as const }}>
                    {tabs.map((tab) => {
                        const active = tab.id === activeTabId;
                        const isEditing = tab.id === editingTabId;
                        return (
                            <div
                                key={tab.id}
                                onClick={() => setActiveTabId(tab.id)}
                                onDoubleClick={() => startRename(tab.id)}
                                style={{
                                    display: "flex", alignItems: "center", gap: 10, padding: "0 14px", height: "100%", cursor: "pointer",
                                    fontSize: 13, flexShrink: 0, borderRight: `1px solid ${C.border}`,
                                    background: active ? C.bg : "transparent",
                                    color: active ? C.text : C.muted,
                                    borderBottom: active ? `2px solid ${C.accent}` : "2px solid transparent",
                                }}
                            >
                                {isEditing ? (
                                    <input
                                        ref={renameInputRef}
                                        value={editingName}
                                        onChange={(e) => setEditingName(e.target.value)}
                                        onBlur={commitRename}
                                        onKeyDown={(e) => { if (e.key === "Enter") commitRename(); if (e.key === "Escape") setEditingTabId(null); }}
                                        onClick={(e) => e.stopPropagation()}
                                        style={{
                                            background: C.hover, color: C.text, border: `1px solid ${C.accent}`, borderRadius: 4,
                                            padding: "2px 6px", fontSize: 13, outline: "none", width: 120, fontFamily: "inherit",
                                        }}
                                    />
                                ) : (
                                    <span style={{ maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{tab.title}</span>
                                )}
                                <button
                                    onClick={(e) => { e.stopPropagation(); closeTab(tab.id); }}
                                    style={{ color: C.muted, background: "none", border: "none", padding: 2, cursor: "pointer", display: "flex", borderRadius: 4 }}
                                    onMouseEnter={(e) => { e.currentTarget.style.color = "#f85149"; e.currentTarget.style.background = "rgba(248,81,73,0.15)"; }}
                                    onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "none"; }}
                                >
                                    <Icon d="M18 6 6 18M6 6l12 12" size={11} />
                                </button>
                            </div>
                        );
                    })}
                </div>
                <button
                    onClick={addTab}
                    style={{ width: 42, display: "flex", alignItems: "center", justifyContent: "center", color: C.muted, background: "none", border: "none", borderLeft: `1px solid ${C.border}`, cursor: "pointer", flexShrink: 0 }}
                    onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.hover; }}
                    onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "none"; }}
                >
                    <Icon d="M12 5v14M5 12h14" size={14} />
                </button>
            </div>

            {/* Monaco Editor */}
            <div style={{ flex: 1, minHeight: 0, padding: 12, display: "flex" }}>
                <div style={{ flex: 1, borderRadius: 8, border: `1px solid ${C.border}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <MonacoEditor
                        value={activeTab.content}
                        onChange={updateContent}
                        language="lua"
                        theme="vs-dark"
                    />
                </div>
            </div>

            {/* Toolbar */}
            <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 16px", background: C.surface, borderTop: `1px solid ${C.border}`, flexShrink: 0 }}>
                <ToolBtn onClick={handleExecute} title="Execute" accent>
                    <PlayFill size={15} />
                </ToolBtn>
                <ToolBtn onClick={handleInject} title="Inject">
                    <Icon d="m18 2 4 4m-4-4 3-3M19 9 8.7 19.3c-1 1-2.5 1-3.4 0l-.6-.6c-1-1-1-2.5 0-3.4L15 5m-6 6 4 4m-4-4-3 3m9-3 6 6" size={15} />
                </ToolBtn>
                <ToolBtn onClick={() => updateContent("")} title="Clear">
                    <Icon d="M21 4H8l-7 8 7 8h13a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2zM18 9l-6 6M12 9l6 6" size={15} />
                </ToolBtn>
                <ToolBtn onClick={handleFileOpen} title="Open file">
                    <Icon d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" size={15} />
                </ToolBtn>
                <ToolBtn onClick={handleSave} title="Save">
                    <Icon d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2zM17 21v-8H7v8M7 3v5h8" size={15} />
                </ToolBtn>

                <div style={{ flex: 1 }} />

                {/* Clients */}
                <div style={{ position: "relative" }}>
                    <button
                        onClick={() => setShowClients(!showClients)}
                        title="Clients"
                        style={{
                            display: "flex", alignItems: "center", gap: 8, padding: "6px 10px", borderRadius: 6,
                            fontSize: 12, color: C.muted, background: "none", border: `1px solid ${C.border}`, cursor: "pointer",
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.color = C.text; e.currentTarget.style.background = C.hover; }}
                        onMouseLeave={(e) => { e.currentTarget.style.color = C.muted; e.currentTarget.style.background = "none"; }}
                    >
                        <Icon d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" size={15} />
                        <span style={{ maxWidth: 110, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                            {selectedPids.length === 0
                                ? `All (${clients.length})`
                                : selectedPids.length === 1
                                    ? streamerMode ? "Client 1" : clients.find((c) => String(c.pid) === selectedPids[0])?.name ?? "1"
                                    : `${selectedPids.length} clients`}
                        </span>
                    </button>
                    {showClients && (
                        <div style={{
                            position: "absolute", bottom: "100%", right: 0, marginBottom: 6, width: 220,
                            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
                            boxShadow: "0 8px 24px rgba(0,0,0,0.4)", maxHeight: 200, overflowY: "auto", zIndex: 50,
                        }}>
                            <button
                                onClick={() => { setSelectedPids([]); setShowClients(false); }}
                                style={{
                                    width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 12, border: "none", cursor: "pointer",
                                    background: selectedPids.length === 0 ? C.hover : "transparent",
                                    color: selectedPids.length === 0 ? C.accent : C.text,
                                }}
                            >
                                All clients
                            </button>
                            {clients.map((c, i) => {
                                const sel = selectedPids.includes(String(c.pid));
                                return (
                                    <button
                                        key={c.pid}
                                        onClick={() => setSelectedPids((prev) => {
                                            const s = String(c.pid);
                                            return prev.includes(s) ? prev.filter((x) => x !== s) : [...prev, s];
                                        })}
                                        style={{
                                            width: "100%", textAlign: "left", padding: "10px 14px", fontSize: 12, border: "none", cursor: "pointer",
                                            display: "flex", justifyContent: "space-between",
                                            background: sel ? C.hover : "transparent",
                                            color: sel ? C.accent : C.text,
                                        }}
                                    >
                                        <span>{streamerMode ? `Client ${i + 1}` : c.name}</span>
                                        <span style={{ color: C.muted }}>{c.pid}</span>
                                    </button>
                                );
                            })}
                            {clients.length === 0 && (
                                <div style={{ padding: "10px 14px", fontSize: 12, color: C.muted }}>No clients detected</div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

function ToolBtn({ onClick, title, children, accent }: { onClick: () => void; title: string; children: React.ReactNode; accent?: boolean }) {
    const [hover, setHover] = useState(false);
    return (
        <button
            onClick={onClick}
            title={title}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: "flex", alignItems: "center", justifyContent: "center", width: 34, height: 34,
                borderRadius: 6, border: "none", cursor: "pointer", transition: "background 0.15s",
                background: accent ? (hover ? "#2d7ae0" : C.accent) : (hover ? C.hover : "transparent"),
                color: accent ? "#fff" : (hover ? C.text : C.muted),
            }}
        >
            {children}
        </button>
    );
}

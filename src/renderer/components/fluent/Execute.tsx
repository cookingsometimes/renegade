import {
    Body1,
    Button,
    Dropdown,
    makeStyles,
    Option,
    Spinner,
    Subtitle1,
    tokens,
    Tooltip,
} from "@fluentui/react-components";
import {
    AddRegular,
    ClipboardPasteRegular,
    CopyRegular,
    DeleteRegular,
    EraserRegular,
    FolderOpenRegular,
    PlayRegular,
    SaveRegular,
    SearchRegular,
    SyringeRegular,
} from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";
import type { RobloxClientInfo, ScriptTab } from "@common/types";
import { MonacoEditor } from "../MonacoEditor";

const useStyles = makeStyles({
    outer: {
        height: "100%",
        minHeight: 0,
        boxSizing: "border-box",
        padding: "16px",
        display: "flex",
    },
    root: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minWidth: 0,
        minHeight: 0,
        gap: "0px",
        background: tokens.colorNeutralBackground2,
        borderRadius: tokens.borderRadiusXLarge,
        overflow: "hidden",
        boxShadow: tokens.shadow4,
    },
    tabBar: {
        display: "flex",
        alignItems: "center",
        background: tokens.colorNeutralBackground1,
        minHeight: "38px",
        paddingLeft: "10px",
        paddingRight: "10px",
        gap: "4px",
        flexShrink: 0,
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    tabList: {
        display: "flex",
        alignItems: "center",
        gap: "3px",
        overflow: "auto",
        flexGrow: 1,
        padding: "5px 0",
    },
    tab: {
        minWidth: "0px",
        maxWidth: "160px",
        height: "26px",
        padding: "0 10px",
        borderRadius: tokens.borderRadiusMedium,
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground2,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        display: "flex",
        alignItems: "center",
        gap: "5px",
        transition: "all 0.15s ease",
        ":hover": {
            background: tokens.colorNeutralBackground2,
        },
    },
    tabActive: {
        background: tokens.colorNeutralBackground3,
        color: tokens.colorNeutralForeground1,
        fontWeight: tokens.fontWeightSemibold,
    },
    tabClose: {
        width: "16px",
        height: "16px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "11px",
        color: tokens.colorNeutralForeground3,
        background: "transparent",
        border: "none",
        cursor: "pointer",
        padding: 0,
        lineHeight: 1,
        ":hover": {
            background: tokens.colorNeutralBackground4,
            color: tokens.colorNeutralForeground1,
        },
    },
    dirty: {
        width: "6px",
        height: "6px",
        borderRadius: "50%",
        background: tokens.colorPaletteDarkOrangeBackground1,
        flexShrink: 0,
    },
    addTab: {
        width: "24px",
        height: "24px",
        minWidth: "24px",
        borderRadius: tokens.borderRadiusMedium,
    },
    editorArea: {
        flexGrow: 1,
        minHeight: "0px",
        position: "relative",
        padding: "10px",
        display: "flex",
    },
    monaco: {
        width: "100%",
        height: "100%",
        border: "none",
        outline: "none",
        background: "transparent",
    },
    toolbar: {
        display: "flex",
        alignItems: "center",
        gap: "2px",
        padding: "6px 10px",
        background: tokens.colorNeutralBackground1,
        flexShrink: 0,
        flexWrap: "wrap",
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    actionBar: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "8px 12px",
        background: tokens.colorNeutralBackground1,
        flexShrink: 0,
        borderTop: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    separator: {
        width: "1px",
        height: "18px",
        background: tokens.colorNeutralStroke3,
        margin: "0 4px",
    },
});

const createTab = (title?: string, content?: string): ScriptTab => ({
    id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
    title: title ?? "Untitled",
    content: content ?? "",
    isDirty: false,
});

const nextUntitledNum = (tabs: ScriptTab[]) => {
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
    clients: RobloxClientInfo[];
    savedScripts: Array<{ name: string; content: string }>;
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
}

export const Execute = ({
    clients,
    savedScripts,
    onSave,
    onLoad,
    onDelete,
    onExecute,
    onInject,
    powerUser,
    streamerMode,
    initialTabs,
    initialActiveTabId,
    initialSelectedPids,
    onTabsChange,
    onActiveTabIdChange,
    onSelectedPidsChange,
}: Props) => {
    const styles = useStyles();
    const [tabs, setTabs] = useState<ScriptTab[]>(() => {
        if (initialTabs && initialTabs.length > 0) return initialTabs;
        return [createTab("Untitled (1)")];
    });
    const [activeTabId, setActiveTabId] = useState<string>(initialActiveTabId || tabs[0].id);
    const [selectedPids, setSelectedPids] = useState<string[]>(initialSelectedPids || []);
    const [isExecuting, setIsExecuting] = useState(false);
    const [saveDialogOpen, setSaveDialogOpen] = useState(false);
    const [loadDialogOpen, setLoadDialogOpen] = useState(false);
    const [saveName, setSaveName] = useState("");
    const fileInputRef = useRef<HTMLInputElement>(null);

    const activeTab = tabs.find((t) => t.id === activeTabId) ?? tabs[0];
    const safeClients = Array.isArray(clients) ? clients : [];

    const selectedClientsText = selectedPids.length === 0
        ? ""
        : selectedPids.length === 1
            ? (streamerMode ? "Client 1" : safeClients.find((c) => String(c.pid) === selectedPids[0])?.name) ?? "1 client"
            : `${selectedPids.length} clients selected`;

    useEffect(() => { onTabsChange?.(tabs); }, [tabs]);
    useEffect(() => { onActiveTabIdChange?.(activeTabId); }, [activeTabId]);
    useEffect(() => { onSelectedPidsChange?.(selectedPids); }, [selectedPids]);

    useEffect(() => {
        const readyPids = safeClients
            .filter((c) => c.state === 3)
            .map((c) => String(c.pid));
        if (readyPids.length > 0) {
            setSelectedPids(readyPids);
        }
    }, [safeClients]);

    const handleOpenFile = () => {
        fileInputRef.current?.click();
    };

    const handleFileSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const content = ev.target?.result as string;
            updateTabContent(activeTabId, content);
            setTabs((prev) =>
                prev.map((t) =>
                    t.id === activeTabId
                        ? { ...t, title: file.name.replace(/\.[^.]+$/, ""), content, isDirty: true }
                        : t,
                ),
            );
        };
        reader.readAsText(file);
        e.target.value = "";
    };

    const updateTabContent = (id: string, content: string) => {
        setTabs((prev) =>
            prev.map((t) => {
                if (t.id !== id) return t;
                const isFirstEdit = t.title === "Untitled" && t.content === "" && content.trim().length > 0;
                const newTitle = isFirstEdit
                    ? content.trim().split("\n")[0].slice(0, 40).trim() || "Untitled"
                    : t.title;
                return { ...t, content, title: newTitle, isDirty: true };
            }),
        );
    };

    const addTab = () => {
        const num = nextUntitledNum(tabs);
        const newTab = createTab(`Untitled (${num})`);
        setTabs((prev) => [...prev, newTab]);
        setActiveTabId(newTab.id);
    };

    const closeTab = (id: string) => {
        setTabs((prev) => {
            const filtered = prev.filter((t) => t.id !== id);
            if (filtered.length === 0) return [createTab()];
            return filtered;
        });
        if (activeTabId === id) {
            setTabs((prev) => {
                const idx = tabs.findIndex((t) => t.id === id);
                const newIdx = Math.min(idx, prev.length - 1);
                setActiveTabId(prev[newIdx].id);
                return prev;
            });
        }
    };

    const handleExecute = async () => {
        if (!activeTab?.content.trim()) return;
        setIsExecuting(true);
        const pids: string[] =
            selectedPids.length > 0
                ? selectedPids
                : safeClients.map((c) => String(c.pid));
        try {
            await window.ContextBridge.proxyExecute(activeTab.content, pids.map(Number));
            onExecute(activeTab.content, pids.map(Number));
        } catch {
            onExecute(activeTab.content, pids.map(Number));
        }
        setTimeout(() => setIsExecuting(false), 1000);
    };

    const handleSave = () => {
        if (saveName.trim() && activeTab?.content) {
            onSave(saveName.trim(), activeTab.content);
            setTabs((prev) =>
                prev.map((t) =>
                    t.id === activeTabId ? { ...t, title: saveName.trim(), isDirty: false } : t,
                ),
            );
            setSaveDialogOpen(false);
            setSaveName("");
        }
    };

    return (
        <div className={styles.outer}>
        <div className={styles.root}>
            <div className={styles.tabBar}>
                <div className={styles.tabList}>
                    {tabs.map((tab) => (
                        <div
                            key={tab.id}
                            className={`${styles.tab} ${activeTabId === tab.id ? styles.tabActive : ""}`}
                            onClick={() => setActiveTabId(tab.id)}
                            role="tab"
                            aria-selected={activeTabId === tab.id}
                        >
                            <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                {tab.title}
                            </span>
                            {tab.isDirty && <span className={styles.dirty} />}
                            {tabs.length > 1 && (
                                <button
                                    className={styles.tabClose}
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        closeTab(tab.id);
                                    }}
                                >
                                    ×
                                </button>
                            )}
                        </div>
                    ))}
                </div>
                <Button size="small" appearance="transparent" icon={<AddRegular />} onClick={addTab} className={styles.addTab} />
            </div>

            <div className={styles.editorArea}>
                <input
                    ref={fileInputRef}
                    type="file"
                    accept=".lua,.luau,.txt,.script"
                    style={{ display: "none" }}
                    onChange={handleFileSelected}
                />
                <div style={{ flex: 1, borderRadius: 8, border: `1px solid ${tokens.colorNeutralStroke2}`, overflow: "hidden", display: "flex", flexDirection: "column" }}>
                    <MonacoEditor
                        value={activeTab?.content ?? ""}
                        onChange={(val) => updateTabContent(activeTabId, val)}
                        language="lua"
                        theme="vs-dark"
                    />
                </div>
            </div>

            <div className={styles.toolbar}>
                <Tooltip content="Clear editor" relationship="label">
                    <Button size="small" appearance="subtle" icon={<EraserRegular style={{ fontSize: 13 }} />} onClick={() => updateTabContent(activeTabId, "")} />
                </Tooltip>
                <Tooltip content="Copy all" relationship="label">
                    <Button size="small" appearance="subtle" icon={<CopyRegular style={{ fontSize: 13 }} />} onClick={() => window.ContextBridge.clipboardWrite(activeTab?.content ?? "")} />
                </Tooltip>
                <Tooltip content="Paste" relationship="label">
                    <Button
                        size="small"
                        appearance="subtle"
                        icon={<ClipboardPasteRegular style={{ fontSize: 13 }} />}
                        onClick={async () => {
                            const text = await window.ContextBridge.clipboardRead();
                            updateTabContent(activeTabId, (activeTab?.content ?? "") + text);
                        }}
                    />
                </Tooltip>
                <Tooltip content="Clear clipboard" relationship="label">
                    <Button size="small" appearance="subtle" icon={<DeleteRegular style={{ fontSize: 13 }} />} onClick={() => window.ContextBridge.clipboardClear()} />
                </Tooltip>
                <div className={styles.separator} />
                <Tooltip content="Open file" relationship="label">
                    <Button size="small" appearance="subtle" icon={<FolderOpenRegular style={{ fontSize: 13 }} />} onClick={handleOpenFile} />
                </Tooltip>
                <div style={{ marginLeft: "auto", display: "flex", gap: 4 }}>
                    <Button
                        size="small"
                        appearance="subtle"
                        icon={<SaveRegular style={{ fontSize: 13 }} />}
                        onClick={() => {
                            setSaveName(activeTab?.title === "Untitled" ? "" : activeTab?.title ?? "");
                            setSaveDialogOpen(true);
                        }}
                    >
                        Save
                    </Button>
                    <Button
                        size="small"
                        appearance="subtle"
                        icon={<SearchRegular style={{ fontSize: 13 }} />}
                        onClick={() => setLoadDialogOpen(true)}
                    >
                        Load
                    </Button>
                </div>
            </div>

            <div className={styles.actionBar}>
                <Button size="small" appearance="subtle" icon={<SyringeRegular style={{ fontSize: 14 }} />} onClick={onInject}>
                    Inject
                </Button>

                <Dropdown
                    size="small"
                    placeholder={safeClients.length === 0 ? "No clients" : "Select clients"}
                    value={selectedClientsText}
                    multiselect
                    inlinePopup
                    style={{ minWidth: "180px" }}
                    selectedOptions={selectedPids}
                    onOptionSelect={(_, data) => setSelectedPids(data.selectedOptions)}
                >
                    {safeClients.map((c, i) => {
                        const displayName = streamerMode ? `Client ${i + 1}` : c.name;
                        const statusLabel = powerUser
                            ? c.state === 3 ? " (Ready)" : c.state === 2 ? " (Attached)" : c.state === 1 ? " (Injecting)" : c.state === 0 ? " (Pending)" : " (Dead)"
                            : "";
                        return (
                            <Option key={c.pid} value={String(c.pid)} text={displayName}>
                                {displayName}{statusLabel}
                            </Option>
                        );
                    })}
                </Dropdown>

                <Button
                    appearance="primary"
                    size="medium"
                    icon={isExecuting ? undefined : <PlayRegular style={{ fontSize: 15 }} />}
                    onClick={handleExecute}
                    disabled={isExecuting || !activeTab?.content.trim() || safeClients.length === 0}
                    style={{ minWidth: "110px", marginLeft: "auto" }}
                >
                    {isExecuting ? <Spinner size="tiny" label="Executing..." labelPosition="after" /> : safeClients.length === 0 ? "No clients" : "Execute"}
                </Button>
            </div>

            {saveDialogOpen && (
                <div
                    style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                    onClick={() => setSaveDialogOpen(false)}
                >
                    <div
                        style={{ background: tokens.colorNeutralBackground1, padding: 24, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12, width: 360, boxShadow: tokens.shadow16 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Subtitle1>Save Script</Subtitle1>
                        <input
                            placeholder="Script name"
                            value={saveName}
                            onChange={(e) => setSaveName(e.target.value)}
                            onKeyDown={(e) => e.key === "Enter" && handleSave()}
                            autoFocus
                            style={{ padding: "8px 12px", borderRadius: 8, border: `1px solid ${tokens.colorNeutralStroke1}`, background: tokens.colorNeutralBackground2, color: tokens.colorNeutralForeground1, fontSize: 14, outline: "none" }}
                        />
                        <div style={{ display: "flex", gap: 8, justifyContent: "flex-end" }}>
                            <Button appearance="subtle" onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
                            <Button appearance="primary" onClick={handleSave} disabled={!saveName.trim()}>Save</Button>
                        </div>
                    </div>
                </div>
            )}

            {loadDialogOpen && (
                <div
                    style={{ position: "absolute", inset: 0, background: "rgba(0,0,0,0.5)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 100 }}
                    onClick={() => setLoadDialogOpen(false)}
                >
                    <div
                        style={{ background: tokens.colorNeutralBackground1, padding: 24, borderRadius: 12, display: "flex", flexDirection: "column", gap: 12, width: 420, maxHeight: 400, boxShadow: tokens.shadow16 }}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <Subtitle1>Load Script</Subtitle1>
                        {savedScripts.length === 0 ? (
                            <Body1 style={{ color: tokens.colorNeutralForeground3 }}>No saved scripts</Body1>
                        ) : (
                            <div style={{ display: "flex", flexDirection: "column", gap: 4, overflow: "auto" }}>
                                {savedScripts.map((s) => (
                                    <div
                                        key={s.name}
                                        style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "8px 12px", borderRadius: 8, background: tokens.colorNeutralBackground2, cursor: "pointer", transition: "background 0.15s" }}
                                        onClick={() => {
                                            onLoad(s.content);
                                            updateTabContent(activeTabId, s.content);
                                            setTabs((prev) => prev.map((t) => t.id === activeTabId ? { ...t, title: s.name, isDirty: false } : t));
                                            setLoadDialogOpen(false);
                                        }}
                                    >
                                        <Body1 style={{ flexGrow: 1 }}>{s.name}</Body1>
                                        <Button size="small" appearance="transparent" onClick={(e) => { e.stopPropagation(); onDelete(s.name); }}>×</Button>
                                    </div>
                                ))}
                            </div>
                        )}
                        <Button appearance="subtle" onClick={() => setLoadDialogOpen(false)}>Close</Button>
                    </div>
                </div>
            )}
        </div>
        </div>
    );
};

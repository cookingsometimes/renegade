import { useCallback, useEffect, useRef, useState } from "react";
import type { SavedScript, ScriptBloxScript, ScriptHubTab } from "@common/types";
import "./ScriptHub.css";

const DEBOUNCE_MS = 400;

export const ScriptHub = () => {
    const [tab, setTab] = useState<ScriptHubTab>("local");
    const [localScripts, setLocalScripts] = useState<SavedScript[]>([]);
    const [selectedLocal, setSelectedLocal] = useState<string | null>(null);
    const [localContent, setLocalContent] = useState("");
    const [newName, setNewName] = useState("");
    const [searchQuery, setSearchQuery] = useState("");
    const [searchResults, setSearchResults] = useState<ScriptBloxScript[]>([]);
    const [searchLoading, setSearchLoading] = useState(false);
    const [searchPage, setSearchPage] = useState(1);
    const [hasMore, setHasMore] = useState(false);
    const [selectedOnline, setSelectedOnline] = useState<ScriptBloxScript | null>(null);
    const [onlineScriptSource, setOnlineScriptSource] = useState("");
    const [sourceLoading, setSourceLoading] = useState(false);
    const [toast, setToast] = useState<string | null>(null);
    const searchTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    const searchInputRef = useRef<HTMLInputElement>(null);

    const showToast = useCallback((msg: string) => {
        setToast(msg);
        setTimeout(() => setToast(null), 2000);
    }, []);

    const loadLocalScripts = useCallback(async () => {
        try {
            const list = await window.ContextBridge.loadScripts();
            setLocalScripts(list);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => { loadLocalScripts(); }, [loadLocalScripts]);

    useEffect(() => {
        if (tab === "online" && searchResults.length === 0 && !searchQuery) {
            loadTrending();
        }
    }, [tab]);

    const loadTrending = async () => {
        setSearchLoading(true);
        try {
            const res = await window.ContextBridge.trendingScriptblox();
            const scripts = res?.result?.scripts ?? [];
            setSearchResults(scripts);
            setHasMore(scripts.length >= 20);
        } catch { /* ignore */ }
        setSearchLoading(false);
    };

    const handleSearch = useCallback((query: string) => {
        setSearchQuery(query);
        setSearchPage(1);
        if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
        if (!query.trim()) {
            loadTrending();
            return;
        }
        searchTimerRef.current = setTimeout(async () => {
            setSearchLoading(true);
            try {
                const res = await window.ContextBridge.searchScriptblox(query, 1);
                const scripts = res?.result?.scripts ?? [];
                setSearchResults(scripts);
                setHasMore(scripts.length >= 20);
            } catch { /* ignore */ }
            setSearchLoading(false);
        }, DEBOUNCE_MS);
    }, []);

    const loadMore = async () => {
        const nextPage = searchPage + 1;
        setSearchLoading(true);
        try {
            const res = searchQuery.trim()
                ? await window.ContextBridge.searchScriptblox(searchQuery, nextPage)
                : await window.ContextBridge.trendingScriptblox();
            const scripts = res?.result?.scripts ?? [];
            setSearchResults((prev) => [...prev, ...scripts]);
            setSearchPage(nextPage);
            setHasMore(scripts.length >= 20);
        } catch { /* ignore */ }
        setSearchLoading(false);
    };

    const handleSelectOnline = async (script: ScriptBloxScript) => {
        setSelectedOnline(script);
        setSourceLoading(true);
        setOnlineScriptSource("");
        try {
            const res = await window.ContextBridge.scriptbloxSource(script.slug);
            const source = res?.script?.script ?? script.script ?? "";
            setOnlineScriptSource(source);
        } catch {
            setOnlineScriptSource(script.script ?? "");
        }
        setSourceLoading(false);
    };

    const handleCopy = async (text: string) => {
        try {
            await navigator.clipboard.writeText(text);
            showToast("Copied!");
        } catch { /* ignore */ }
    };

    const handleCreateTab = (script: ScriptBloxScript) => {
        const source = script.script ?? "";
        if (!source) return;
        const event = new CustomEvent("renegade:createTab", { detail: { name: script.title, content: source } });
        window.dispatchEvent(event);
        showToast("Tab created");
    };

    const handleExecuteDirect = (script: ScriptBloxScript) => {
        const source = script.script ?? "";
        if (!source) return;
        const event = new CustomEvent("renegade:executeScript", { detail: { script: source } });
        window.dispatchEvent(event);
        showToast("Executing...");
    };

    const handleSaveLocal = async () => {
        if (!newName.trim()) return;
        await window.ContextBridge.saveScript(newName.trim(), localContent);
        setNewName("");
        setLocalContent("");
        setSelectedLocal(null);
        loadLocalScripts();
    };

    const handleLoadLocal = (s: SavedScript) => {
        setSelectedLocal(s.name);
        setLocalContent(s.content);
    };

    const handleDeleteLocal = async (name: string) => {
        await window.ContextBridge.deleteScript(name);
        if (selectedLocal === name) {
            setSelectedLocal(null);
            setLocalContent("");
        }
        loadLocalScripts();
    };

    const formatViews = (n: number) => {
        if (n >= 1000000) return `${(n / 1000000).toFixed(1)}M`;
        if (n >= 1000) return `${(n / 1000).toFixed(1)}K`;
        return String(n);
    };

    return (
        <div className="page-scripts">
            <div className="page-header">
                <h2 className="page-title">Script Hub</h2>
                <div className="scripts-tab-row">
                    <button
                        className={`scripts-tab-btn ${tab === "local" ? "active" : ""}`}
                        onClick={() => setTab("local")}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" /></svg>
                        Local
                    </button>
                    <button
                        className={`scripts-tab-btn ${tab === "online" ? "active" : ""}`}
                        onClick={() => setTab("online")}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><line x1="2" y1="12" x2="22" y2="12" /><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z" /></svg>
                        ScriptBlox
                    </button>
                </div>
            </div>

            {tab === "local" ? (
                <div className="scripts-layout">
                    <div className="scripts-sidebar">
                        <div className="scripts-new">
                            <input
                                className="scripts-input"
                                placeholder="Script name..."
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => { if (e.key === "Enter") handleSaveLocal(); }}
                            />
                            <button className="scripts-save-btn" onClick={handleSaveLocal} disabled={!newName.trim()}>
                                Save
                            </button>
                        </div>
                        <div className="scripts-list">
                            {localScripts.length === 0 && (
                                <div className="scripts-empty">No saved scripts</div>
                            )}
                            {localScripts.map((s) => (
                                <div
                                    key={s.name}
                                    className={`script-item ${selectedLocal === s.name ? "selected" : ""}`}
                                    onClick={() => handleLoadLocal(s)}
                                >
                                    <div className="script-item-info">
                                        <span className="script-item-name">{s.name}</span>
                                        <span className="script-item-date">{new Date(s.saved).toLocaleDateString()}</span>
                                    </div>
                                    <div className="script-item-actions">
                                        <button className="script-item-open" onClick={(e) => { e.stopPropagation(); const ev = new CustomEvent("renegade:createTab", { detail: { name: s.name, content: s.content } }); window.dispatchEvent(ev); }} title="Open in Execute">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 007.54.54l3-3a5 5 0 00-7.07-7.07l-1.72 1.71" /><path d="M14 11a5 5 0 00-7.54-.54l-3 3a5 5 0 007.07 7.07l1.71-1.71" /></svg>
                                        </button>
                                        <button className="script-item-exec" onClick={(e) => { e.stopPropagation(); const ev = new CustomEvent("renegade:executeScript", { detail: { script: s.content } }); window.dispatchEvent(ev); }} title="Execute">
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                        </button>
                                        <button className="script-item-delete" onClick={(e) => { e.stopPropagation(); handleDeleteLocal(s.name); }}>
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                                <line x1="18" y1="6" x2="6" y2="18" />
                                                <line x1="6" y1="6" x2="18" y2="18" />
                                            </svg>
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                    <div className="scripts-editor">
                        <textarea
                            className="scripts-textarea"
                            value={localContent}
                            onChange={(e) => setLocalContent(e.target.value)}
                            placeholder="-- Script content..."
                            spellCheck={false}
                        />
                    </div>
                </div>
            ) : (
                <div className="scripts-layout online">
                    <div className="scripts-search-bar">
                        <svg className="scripts-search-icon" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                        <input
                            ref={searchInputRef}
                            className="scripts-search-input"
                            placeholder="Search ScriptBlox..."
                            value={searchQuery}
                            onChange={(e) => handleSearch(e.target.value)}
                        />
                        {searchQuery && (
                            <button className="scripts-search-clear" onClick={() => { setSearchQuery(""); handleSearch(""); searchInputRef.current?.focus(); }}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
                            </button>
                        )}
                    </div>

                    <div className="scripts-online-layout">
                        <div className="scripts-results-list">
                            {searchLoading && searchResults.length === 0 && (
                                <div className="scripts-loading">
                                    <div className="scripts-spinner" />
                                </div>
                            )}
                            {!searchLoading && searchResults.length === 0 && (
                                <div className="scripts-empty">
                                    {searchQuery ? "No results found" : "Loading trending..."}
                                </div>
                            )}
                            {searchResults.map((s) => (
                                <div
                                    key={s._id}
                                    className={`script-result-item ${selectedOnline?._id === s._id ? "selected" : ""}`}
                                    onClick={() => handleSelectOnline(s)}
                                >
                                    <div className="script-result-thumb">
                                        {s.game?.imageUrl ? (
                                            <img src={s.game.imageUrl} alt="" className="script-result-img" />
                                        ) : (
                                            <div className="script-result-placeholder">
                                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            </div>
                                        )}
                                    </div>
                                    <div className="script-result-info">
                                        <span className="script-result-title">{s.title}</span>
                                        <span className="script-result-game">{s.game?.name ?? "Universal"}</span>
                                        <div className="script-result-meta">
                                            <span className="script-result-views">
                                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                                                {formatViews(s.views ?? 0)}
                                            </span>
                                            {s.verified && <span className="script-result-badge verified">Verified</span>}
                                            {s.key && <span className="script-result-badge key">Key</span>}
                                            {s.isPatched && <span className="script-result-badge patched">Patched</span>}
                                        </div>
                                    </div>
                                </div>
                            ))}
                            {hasMore && !searchLoading && (
                                <button className="scripts-load-more" onClick={loadMore}>Load more</button>
                            )}
                            {searchLoading && searchResults.length > 0 && (
                                <div className="scripts-loading-inline">
                                    <div className="scripts-spinner small" />
                                </div>
                            )}
                        </div>

                        <div className="scripts-preview">
                            {selectedOnline ? (
                                <>
                                    <div className="scripts-preview-header">
                                        <div className="scripts-preview-title-row">
                                            <h3 className="scripts-preview-title">{selectedOnline.title}</h3>
                                            {selectedOnline.verified && (
                                                <svg className="scripts-preview-verified" width="16" height="16" viewBox="0 0 24 24" fill="var(--accent)" stroke="none"><path d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" /></svg>
                                            )}
                                        </div>
                                        <span className="scripts-preview-game">{selectedOnline.game?.name ?? "Universal"}</span>
                                        <div className="scripts-preview-stats">
                                            <span>{formatViews(selectedOnline.views ?? 0)} views</span>
                                            {selectedOnline.likes != null && <span>{selectedOnline.likes} likes</span>}
                                        </div>
                                    </div>
                                    <div className="scripts-preview-actions">
                                        <button className="scripts-action-btn copy" onClick={() => handleCopy(onlineScriptSource || selectedOnline.script || "")} disabled={!onlineScriptSource && !selectedOnline.script}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" /><rect x="8" y="2" width="8" height="4" rx="1" ry="1" /></svg>
                                            Copy
                                        </button>
                                        <button className="scripts-action-btn tab" onClick={() => handleCreateTab(selectedOnline)} disabled={!onlineScriptSource && !selectedOnline.script}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" /></svg>
                                            New Tab
                                        </button>
                                        <button className="scripts-action-btn execute" onClick={() => handleExecuteDirect(selectedOnline)} disabled={!onlineScriptSource && !selectedOnline.script}>
                                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                            Execute
                                        </button>
                                    </div>
                                    <div className="scripts-preview-code">
                                        {sourceLoading ? (
                                            <div className="scripts-loading">
                                                <div className="scripts-spinner" />
                                            </div>
                                        ) : (
                                            <pre className="scripts-code-block">{onlineScriptSource || selectedOnline.script || "-- No source available --"}</pre>
                                        )}
                                    </div>
                                </>
                            ) : (
                                <div className="scripts-empty">Select a script to preview</div>
                            )}
                        </div>
                    </div>
                </div>
            )}

            {toast && (
                <div className="scripts-toast">{toast}</div>
            )}
        </div>
    );
};

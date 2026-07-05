import { useState, useEffect } from "react";

const C = {
    bg: "#0d1117",
    surface: "#161b22",
    border: "#21262d",
    accent: "#1f6feb",
    hover: "#1c2128",
    text: "#c9d1d9",
    muted: "#8b949e",
};

interface ScriptHubItem {
    id: string;
    title: string;
    loadstring: string;
    description: string;
    views: number;
    likeCount: number;
}

export const Scripts = ({ initialQuery, onQueryChange, onExecute }: { initialQuery?: string; onQueryChange?: (q: string) => void; onExecute?: (script: string, pids: number[]) => void }) => {
    const [query, setQuery] = useState(initialQuery || "");
    const [trending, setTrending] = useState<ScriptHubItem[]>([]);
    const [results, setResults] = useState<ScriptHubItem[]>([]);
    const [searching, setSearching] = useState(false);
    const [loadingTrending, setLoadingTrending] = useState(true);

    useEffect(() => { onQueryChange?.(query); }, [query]);

    useEffect(() => {
        loadTrending();
    }, []);

    const loadTrending = async () => {
        setLoadingTrending(true);
        try {
            const data = await window.ContextBridge.getTrendingScripts();
            setTrending(data as ScriptHubItem[]);
        } catch { /* ignore */ }
        setLoadingTrending(false);
    };

    const handleSearch = async () => {
        if (!query.trim()) {
            setResults([]);
            return;
        }
        setSearching(true);
        try {
            const data = await window.ContextBridge.searchScripts(query);
            setResults(data as ScriptHubItem[]);
        } catch { /* ignore */ }
        setSearching(false);
    };

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === "Enter") handleSearch();
    };

    const items = query.trim() ? results : trending;

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg }}>
            {/* Search bar */}
            <div style={{ padding: 12, borderBottom: `1px solid ${C.border}` }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, background: C.surface, borderRadius: 8, padding: "8px 12px", border: `1px solid ${C.border}` }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
                    </svg>
                    <input
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        onKeyDown={handleKeyDown}
                        placeholder="Search scripts... (Enter to search)"
                        style={{ background: "transparent", color: C.text, fontSize: 13, border: "none", outline: "none", width: "100%" }}
                    />
                    {query.trim() && (
                        <button
                            onClick={() => { setQuery(""); setResults([]); }}
                            style={{ background: "none", border: "none", color: C.muted, cursor: "pointer", padding: 0, display: "flex" }}
                        >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    )}
                </div>
            </div>

            {/* Script list */}
            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
                {loadingTrending && (
                    <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Loading trending scripts...</div>
                )}
                {searching && (
                    <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>Searching...</div>
                )}
                {!loadingTrending && !searching && items.length === 0 && (
                    <div style={{ textAlign: "center", padding: 24, color: C.muted, fontSize: 12 }}>
                        {query.trim() ? "No results found" : "No trending scripts"}
                    </div>
                )}
                {items.map((s) => (
                    <ScriptRow key={s.id} script={s} onExecute={onExecute} />
                ))}
            </div>
        </div>
    );
};

function ScriptRow({ script, onExecute }: { script: ScriptHubItem; onExecute?: (script: string, pids: number[]) => void }) {
    const [hover, setHover] = useState(false);
    return (
        <div
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
            style={{
                display: "flex", alignItems: "center", justifyContent: "space-between",
                padding: "10px 12px", borderRadius: 8, cursor: "pointer", marginBottom: 2,
                background: hover ? C.hover : "transparent", transition: "background 0.15s",
            }}
        >
            <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{script.title}</div>
                <div style={{ fontSize: 11, color: C.muted, marginTop: 2 }}>{script.description?.slice(0, 60) || "No description"}</div>
                <div style={{ fontSize: 10, color: C.muted, marginTop: 2 }}>
                    {script.views?.toLocaleString()} views · {script.likeCount?.toLocaleString()} likes
                </div>
            </div>
            {hover && (
                <div style={{ display: "flex", gap: 6, flexShrink: 0, marginLeft: 8 }}>
                    <button
                        onClick={(e) => { e.stopPropagation(); onExecute?.(script.loadstring, []); }}
                        style={{
                            background: "none", border: `1px solid ${C.accent}`, borderRadius: 6, color: C.accent,
                            cursor: "pointer", padding: "4px 10px", fontSize: 11, fontWeight: 500,
                        }}
                    >
                        Execute
                    </button>
                    <button
                        onClick={(e) => { e.stopPropagation(); navigator.clipboard?.writeText(script.loadstring); }}
                        style={{
                            background: "none", border: `1px solid ${C.border}`, borderRadius: 6, color: C.muted,
                            cursor: "pointer", padding: "4px 10px", fontSize: 11,
                        }}
                    >
                        Copy
                    </button>
                </div>
            )}
        </div>
    );
}

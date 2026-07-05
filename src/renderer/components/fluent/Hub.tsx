import {
    Body1,
    Button,
    Card,
    Field,
    Input,
    makeStyles,
    Spinner,
    Subtitle1,
    tokens,
} from "@fluentui/react-components";
import { PlayRegular, SearchRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "16px",
        flex: 1,
        minHeight: 0,
        padding: "24px",
        boxSizing: "border-box",
        overflowY: "auto",
    },
    scriptCard: {
        padding: "16px",
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    scriptHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "flex-start",
    },
    meta: {
        display: "flex",
        gap: "12px",
        fontSize: "12px",
        color: tokens.colorNeutralForeground3,
    },
});

interface ScriptHubItem {
    id: string;
    title: string;
    loadstring: string;
    description: string;
    views: number;
    likeCount: number;
    game?: string;
}

export const Hub = ({ initialQuery, onQueryChange, onExecute }: { initialQuery?: string; onQueryChange?: (q: string) => void; onExecute?: (script: string, pids: number[]) => void }) => {
    const styles = useStyles();
    const [trending, setTrending] = useState<ScriptHubItem[]>([]);
    const [results, setResults] = useState<ScriptHubItem[]>([]);
    const [query, setQuery] = useState(initialQuery || "");
    const [searching, setSearching] = useState(false);
    const [loadingTrending, setLoadingTrending] = useState(true);

    useEffect(() => {
        loadTrending();
    }, []);

    useEffect(() => { onQueryChange?.(query); }, [query]);

    const loadTrending = async () => {
        setLoadingTrending(true);
        try {
            const data = await window.ContextBridge.getTrendingScripts();
            setTrending(data as ScriptHubItem[]);
        } catch { /* ignore */ }
        setLoadingTrending(false);
    };

    const handleSearch = async () => {
        if (!query.trim()) return;
        setSearching(true);
        try {
            const data = await window.ContextBridge.searchScripts(query.trim());
            setResults(data as ScriptHubItem[]);
        } catch { /* ignore */ }
        setSearching(false);
    };

    const renderScriptCard = (script: ScriptHubItem) => (
        <Card key={script.id} className={styles.scriptCard}>
            <div className={styles.scriptHeader}>
                <div>
                    <Body1 style={{ fontWeight: 600 }}>{script.title}</Body1>
                    {script.description && (
                        <Body1 style={{ color: tokens.colorNeutralForeground3, fontSize: 12 }}>
                            {script.description}
                        </Body1>
                    )}
                </div>
                <div style={{ display: "flex", gap: 6 }}>
                    <Button
                        size="small"
                        appearance="subtle"
                        icon={<PlayRegular style={{ fontSize: 14 }} />}
                        onClick={() => onExecute?.(script.loadstring, [])}
                    >
                        Execute
                    </Button>
                    <Button
                        size="small"
                        appearance="primary"
                        icon={<PlayRegular style={{ fontSize: 14 }} />}
                        onClick={() => {
                            navigator.clipboard?.writeText(script.loadstring);
                        }}
                    >
                        Copy
                    </Button>
                </div>
            </div>
            <div className={styles.meta}>
                <span>{script.views.toLocaleString()} views</span>
                <span>{script.likeCount.toLocaleString()} likes</span>
            </div>
        </Card>
    );

    return (
        <div className={styles.root}>
            <Subtitle1 block>Script Hub</Subtitle1>

            <div style={{ display: "flex", gap: 8 }}>
                <Field style={{ flexGrow: 1 }}>
                    <Input
                        placeholder="Search scripts..."
                        value={query}
                        onChange={(_, data) => setQuery(data.value)}
                        onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    />
                </Field>
                <Button
                    appearance="primary"
                    icon={<SearchRegular />}
                    onClick={handleSearch}
                    disabled={searching || !query.trim()}
                >
                    Search
                </Button>
            </div>

            {searching && <Spinner label="Searching..." />}

            {results.length > 0 && (
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    <Subtitle1 block>Search Results</Subtitle1>
                    {results.map(renderScriptCard)}
                </div>
            )}

            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <Subtitle1 block>Trending Scripts</Subtitle1>
                {loadingTrending && <Spinner label="Loading trending..." />}
                {trending.map(renderScriptCard)}
            </div>
        </div>
    );
};

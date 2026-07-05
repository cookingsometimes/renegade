import {
    Body1,
    Button,
    makeStyles,
    Subtitle1,
} from "@fluentui/react-components";
import { ArrowClockwiseRegular, DeleteRegular } from "@fluentui/react-icons";
import { useCallback, useEffect, useRef, useState } from "react";
import type { LogEntry } from "@common/ContextBridge";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "12px",
        minHeight: 0,
        padding: "24px",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        flexShrink: 0,
    },
    logContainer: {
        display: "flex",
        flexDirection: "column",
        flexGrow: 1,
        overflow: "hidden",
        background: "var(--colorNeutralBackground2)",
        borderRadius: "8px",
    },
    logScroll: {
        flexGrow: 1,
        overflow: "auto",
        padding: "8px",
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: "12px",
        lineHeight: "1.6",
    },
    logEntry: {
        display: "flex",
        gap: "8px",
        padding: "2px 4px",
        borderBottom: "1px solid var(--colorNeutralStroke3)",
    },
    timestamp: {
        color: "var(--colorNeutralForeground3)",
        flexShrink: 0,
        minWidth: "75px",
    },
    level: {
        flexShrink: 0,
        minWidth: "45px",
        fontWeight: 600,
        textTransform: "uppercase",
    },
    source: {
        color: "var(--colorBrandForeground1)",
        flexShrink: 0,
        minWidth: "60px",
    },
    message: {
        flexGrow: 1,
        wordBreak: "break-word",
    },
});

const LEVEL_COLORS: Record<string, string> = {
    info: "var(--colorNeutralForeground1)",
    debug: "var(--colorNeutralForeground3)",
    warn: "var(--colorPaletteYellowForeground1)",
    error: "var(--colorPaletteRedForeground1)",
};

const LEVEL_BG: Record<string, string> = {
    info: "transparent",
    debug: "transparent",
    warn: "rgba(255, 180, 0, 0.06)",
    error: "rgba(255, 80, 80, 0.06)",
};

export const Logs = () => {
    const styles = useStyles();
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [autoScroll, _setAutoScroll] = useState(true);
    const containerRef = useRef<HTMLDivElement>(null);

    const loadLogs = useCallback(async () => {
        try {
            const data = await window.ContextBridge.getLogs();
            setLogs(data);
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        loadLogs();
        window.ContextBridge.onLog((entry) => {
            setLogs((prev) => [entry, ...prev].slice(0, 500));
        });
    }, []);

    useEffect(() => {
        if (autoScroll && containerRef.current) {
            containerRef.current.scrollTop = 0;
        }
    }, [logs, autoScroll]);

    const handleClear = async () => {
        await window.ContextBridge.clearLogs();
        setLogs([]);
    };

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
    };

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <Subtitle1 block>Logs</Subtitle1>
                <div style={{ display: "flex", gap: "8px" }}>
                    <Button
                        size="small"
                        appearance="subtle"
                        icon={<ArrowClockwiseRegular style={{ fontSize: "14px" }} />}
                        onClick={loadLogs}
                    >
                        Refresh
                    </Button>
                    <Button
                        size="small"
                        appearance="subtle"
                        icon={<DeleteRegular style={{ fontSize: "14px" }} />}
                        onClick={handleClear}
                    >
                        Clear
                    </Button>
                </div>
            </div>

            <div className={styles.logContainer}>
                <div className={styles.logScroll} ref={containerRef}>
                    {logs.length === 0 ? (
                        <Body1 style={{ color: "var(--colorNeutralForeground3)", padding: "12px" }}>
                            No logs yet. Logs will appear here as Xeno starts up.
                        </Body1>
                    ) : (
                        logs.map((entry) => (
                            <div
                                key={entry.id}
                                className={styles.logEntry}
                                style={{ background: LEVEL_BG[entry.level] }}
                            >
                                <span className={styles.timestamp}>{formatTime(entry.timestamp)}</span>
                                <span className={styles.level} style={{ color: LEVEL_COLORS[entry.level] }}>
                                    {entry.level}
                                </span>
                                <span className={styles.source}>[{entry.source}]</span>
                                <span className={styles.message}>{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

import {
    Badge,
    Body1,
    Button,
    Caption1,
    Card,
    makeStyles,
    Spinner,
    Subtitle1,
    tokens,
} from "@fluentui/react-components";
import {
    ArrowClockwiseRegular,
    CheckmarkCircleFilled,
    DismissCircleRegular,
    InfoRegular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import type { LogEntry } from "@common/ContextBridge";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "20px",
        minHeight: 0,
        padding: "24px",
    },
    header: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
    },
    headerLeft: {
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    statsRow: {
        display: "grid",
        gridTemplateColumns: "repeat(4, 1fr)",
        gap: "12px",
    },
    statCard: {
        padding: "16px",
        borderRadius: tokens.borderRadiusLarge,
        display: "flex",
        flexDirection: "column",
        gap: "6px",
    },
    statLabel: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
    },
    statValue: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightBold,
        display: "flex",
        alignItems: "center",
        gap: "6px",
    },
    logContainer: {
        display: "flex",
        flexDirection: "column",
        borderRadius: tokens.borderRadiusXLarge,
        background: tokens.colorNeutralBackground2,
        overflow: "hidden",
    },
    logHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "12px 16px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke2}`,
    },
    logScroll: {
        flexGrow: 1,
        overflow: "auto",
        maxHeight: "400px",
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: tokens.fontSizeBase200,
    },
    logEntry: {
        display: "flex",
        gap: "12px",
        padding: "6px 16px",
        borderBottom: `1px solid ${tokens.colorNeutralStroke3}`,
        lineHeight: "1.6",
        ":hover": {
            background: tokens.colorNeutralBackground1,
        },
    },
    timestamp: {
        color: tokens.colorNeutralForeground3,
        flexShrink: 0,
        minWidth: "80px",
    },
    level: {
        flexShrink: 0,
        minWidth: "50px",
        fontWeight: tokens.fontWeightSemibold,
    },
    message: {
        flexGrow: 1,
        wordBreak: "break-word",
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "32px 16px",
        color: tokens.colorNeutralForeground3,
    },
});

const LEVEL_COLORS: Record<string, string> = {
    info: tokens.colorNeutralForeground1,
    debug: tokens.colorNeutralForeground3,
    warn: tokens.colorPaletteYellowForeground1,
    error: tokens.colorPaletteRedForeground1,
};

export const DLL = () => {
    const styles = useStyles();
    const [health, setHealth] = useState<{
        status: string;
        version: string;
        clients: Array<{ id: number; pid: number; name: string; state: number; stateName: string; displayText: string }>;
        proxyPort: number;
        mode: string;
    } | null>(null);
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const h = await window.ContextBridge.proxyHealth();
            setHealth(h);
            const l = await window.ContextBridge.proxyGetLogs();
            setLogs((l as { logs: LogEntry[] }).logs || []);
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        const interval = setInterval(refresh, 5000);
        return () => clearInterval(interval);
    }, [refresh]);

    const formatTime = (ts: number) => {
        const d = new Date(ts);
        return d.toLocaleTimeString("en-US", { hour12: false }) + "." + String(d.getMilliseconds()).padStart(3, "0");
    };

    if (!health && !loading) {
        return (
            <div className={styles.root}>
                <div className={styles.header}>
                    <div className={styles.headerLeft}>
                        <Subtitle1 block>Server Status</Subtitle1>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                            Proxy server diagnostics
                        </Caption1>
                    </div>
                    <Button size="small" appearance="subtle" icon={<ArrowClockwiseRegular />} onClick={refresh}>
                        Refresh
                    </Button>
                </div>
                <Card>
                    <div className={styles.emptyState}>
                        <DismissCircleRegular fontSize={48} style={{ color: tokens.colorPaletteRedForeground1 }} />
                        <Body1>Server not running</Body1>
                        <Caption1>Start the proxy server to use DLL mode</Caption1>
                    </div>
                </Card>
            </div>
        );
    }

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Subtitle1 block>Server Status</Subtitle1>
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                        Xeno.dll proxy diagnostics
                    </Caption1>
                </div>
                <Button size="small" appearance="subtle" icon={loading ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />} onClick={refresh} disabled={loading}>
                    Refresh
                </Button>
            </div>

            {health && (
                <div className={styles.statsRow}>
                    <Card className={styles.statCard}>
                        <span className={styles.statLabel}>Status</span>
                        <span className={styles.statValue}>
                            {health.status === "ok" ? (
                                <>
                                    <CheckmarkCircleFilled fontSize={18} style={{ color: tokens.colorPaletteGreenForeground1 }} />
                                    <span style={{ color: tokens.colorPaletteGreenForeground1 }}>Running</span>
                                </>
                            ) : (
                                <>
                                    <DismissCircleRegular fontSize={18} style={{ color: tokens.colorPaletteRedForeground1 }} />
                                    <span style={{ color: tokens.colorPaletteRedForeground1 }}>Offline</span>
                                </>
                            )}
                        </span>
                    </Card>
                    <Card className={styles.statCard}>
                        <span className={styles.statLabel}>Version</span>
                        <span className={styles.statValue}>{health.version || "—"}</span>
                    </Card>
                    <Card className={styles.statCard}>
                        <span className={styles.statLabel}>Port</span>
                        <span className={styles.statValue} style={{ fontFamily: "monospace" }}>
                            {health.proxyPort || "—"}
                        </span>
                    </Card>
                    <Card className={styles.statCard}>
                        <span className={styles.statLabel}>Clients</span>
                        <span className={styles.statValue}>{health.clients.length}</span>
                    </Card>
                </div>
            )}

            <div className={styles.logContainer}>
                <div className={styles.logHeader}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                        <InfoRegular fontSize={16} style={{ color: tokens.colorNeutralForeground3 }} />
                        <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>Server Logs</Body1>
                    </div>
                    <Badge appearance="filled" size="small">
                        {logs.length}
                    </Badge>
                </div>
                <div className={styles.logScroll}>
                    {logs.length === 0 ? (
                        <div className={styles.emptyState}>
                            <Caption1>No logs yet</Caption1>
                        </div>
                    ) : (
                        logs.slice(0, 100).map((entry) => (
                            <div key={entry.id} className={styles.logEntry}>
                                <span className={styles.timestamp}>{formatTime(entry.timestamp)}</span>
                                <span className={styles.level} style={{ color: LEVEL_COLORS[entry.level] }}>
                                    {entry.level}
                                </span>
                                <span className={styles.message}>{entry.message}</span>
                            </div>
                        ))
                    )}
                </div>
            </div>
        </div>
    );
};

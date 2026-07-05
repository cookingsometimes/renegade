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
    PersonRegular,
    PlayRegular,
    SyringeRegular,
} from "@fluentui/react-icons";
import { useCallback, useEffect, useState } from "react";
import type { RobloxClientInfo } from "@common/types";
import { useNotification } from "../Notifications";

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
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "12px",
    },
    statCard: {
        padding: "16px",
        borderRadius: tokens.borderRadiusLarge,
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    statLabel: {
        fontSize: tokens.fontSizeBase200,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground3,
        textTransform: "uppercase" as const,
        letterSpacing: "0.5px",
    },
    statValue: {
        fontSize: tokens.fontSizeHero700,
        fontWeight: tokens.fontWeightBold,
    },
    clientList: {
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    clientCard: {
        padding: "16px 20px",
        borderRadius: tokens.borderRadiusXLarge,
        boxShadow: tokens.shadow4,
        display: "flex",
        alignItems: "center",
        gap: "16px",
        transitionProperty: "box-shadow, transform",
        transitionDuration: tokens.durationNormal,
        ":hover": {
            boxShadow: tokens.shadow8,
        },
    },
    clientAvatar: {
        width: "40px",
        height: "40px",
        borderRadius: tokens.borderRadiusCircular,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    clientInfo: {
        flexGrow: 1,
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        minWidth: "0px",
    },
    clientName: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
    },
    clientDetails: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    actions: {
        display: "flex",
        gap: "8px",
        flexShrink: 0,
    },
    emptyState: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "8px",
        padding: "48px 24px",
        textAlign: "center",
    },
});

const STATUS_CONFIG: Record<number, { label: string; color: string; bg: string }> = {
    0: { label: "Pending", color: tokens.colorPaletteYellowForeground1, bg: tokens.colorPaletteYellowBackground1 },
    1: { label: "Injecting", color: tokens.colorPaletteYellowForeground1, bg: tokens.colorPaletteYellowBackground1 },
    2: { label: "Attached", color: tokens.colorPaletteGreenForeground1, bg: tokens.colorPaletteGreenBackground1 },
    3: { label: "Ready", color: tokens.colorPaletteGreenForeground1, bg: tokens.colorPaletteGreenBackground1 },
    4: { label: "Dead", color: tokens.colorPaletteRedForeground1, bg: tokens.colorPaletteRedBackground1 },
};

const AVATAR_COLORS = [
    tokens.colorBrandBackground2,
    tokens.colorPaletteBlueBackground2,
    tokens.colorPaletteGreenBackground2,
    tokens.colorPalettePurpleBackground2,
    tokens.colorPaletteRedBackground2,
];

export const Panel = ({ powerUser, streamerMode }: { powerUser: boolean; streamerMode: boolean }) => {
    const styles = useStyles();
    const { notify } = useNotification();
    const [clients, setClients] = useState<RobloxClientInfo[]>([]);
    const [loading, setLoading] = useState(true);
    const [actionPids, setActionPids] = useState<Set<string>>(new Set());

    const refresh = useCallback(async () => {
        setLoading(true);
        try {
            const data = await window.ContextBridge.getClients();
            setClients(data.map((c) => ({ ...c, crashCount: c.crashCount ?? 0 })));
        } catch { /* ignore */ }
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
        window.ContextBridge.onClientsChanged((data) =>
            setClients((data as RobloxClientInfo[]).map((c) => ({ ...c, crashCount: c.crashCount ?? 0 })))
        );
    }, [refresh]);

    const handleAttach = async () => {
        setActionPids(new Set());
        try {
            await window.ContextBridge.proxyAttach();
            notify({ type: "success", title: "Attach sent", message: "Attach command dispatched to all clients." });
        } catch {
            notify({ type: "error", title: "Attach failed", message: "Could not send attach command." });
        }
        setActionPids(new Set());
        refresh();
    };

    const handleExecute = async (pid: number) => {
        const script = `print("Executing on PID: ${pid}")`;
        setActionPids((prev) => new Set(prev).add(`exec-${pid}`));
        try {
            await window.ContextBridge.proxyExecute(script, [pid]);
            notify({ type: "success", title: "Test script sent", message: `PID: ${pid}` });
        } catch {
            notify({ type: "error", title: "Execute failed", message: `Could not execute on PID: ${pid}` });
        }
        setActionPids((prev) => {
            const next = new Set(prev);
            next.delete(`exec-${pid}`);
            return next;
        });
    };

    const attachedCount = clients.filter((c) => c.state === 3).length;

    return (
        <div className={styles.root}>
            <div className={styles.header}>
                <div className={styles.headerLeft}>
                    <Subtitle1 block>Clients</Subtitle1>
                    <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                        {clients.length} Roblox instance{clients.length !== 1 ? "s" : ""} detected
                    </Caption1>
                </div>
                <Button
                    appearance="subtle"
                    icon={loading ? <Spinner size="tiny" /> : <ArrowClockwiseRegular />}
                    onClick={refresh}
                    disabled={loading}
                >
                    Refresh
                </Button>
            </div>

            <div className={styles.statsRow}>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>Total</span>
                    <span className={styles.statValue}>{clients.length}</span>
                </Card>
                <Card className={styles.statCard}>
                    <span className={styles.statLabel}>Attached</span>
                    <span
                        className={styles.statValue}
                        style={{ color: attachedCount > 0 ? tokens.colorPaletteGreenForeground1 : tokens.colorNeutralForeground3 }}
                    >
                        {attachedCount}
                    </span>
                </Card>
            </div>

            {clients.length === 0 ? (
                <Card>
                    <div className={styles.emptyState}>
                        <PersonRegular fontSize={48} style={{ color: tokens.colorNeutralForeground3 }} />
                        <Body1 style={{ color: tokens.colorNeutralForeground3 }}>
                            {loading ? "Scanning for clients..." : "No Roblox clients detected"}
                        </Body1>
                        <Caption1 style={{ color: tokens.colorNeutralForeground3 }}>
                            {!loading && "No clients detected."}
                        </Caption1>
                    </div>
                </Card>
            ) : (
                <div className={styles.clientList}>
                    {clients.map((client, index) => {
                        const status = STATUS_CONFIG[client.state] ?? STATUS_CONFIG[4];
                        const pid = Number(client.pid);
                        const avatarColor = AVATAR_COLORS[index % AVATAR_COLORS.length];
                        return (
                            <Card key={client.pid} className={styles.clientCard}>
                                <div
                                    className={styles.clientAvatar}
                                    style={{ background: avatarColor }}
                                >
                                    <PersonRegular fontSize={20} style={{ color: tokens.colorNeutralForeground1 }} />
                                </div>
                                <div className={styles.clientInfo}>
                                    <span className={styles.clientName}>
                                        {streamerMode ? `Client ${index + 1}` : client.name}
                                    </span>
                                    <span className={styles.clientDetails}>
                                        {powerUser ? `PID: ${client.pid}` : client.displayText || `Instance ${index + 1}`}
                                    </span>
                                </div>
                                <Badge
                                    appearance="filled"
                                    style={{ color: status.color, background: status.bg, flexShrink: 0 }}
                                >
                                    {powerUser ? status.label : client.state === 3 ? "Ready" : client.state >= 2 ? "Active" : "Waiting"}
                                </Badge>
                                <div className={styles.actions}>
                                    <Button
                                        size="small"
                                        appearance="secondary"
                                        icon={actionPids.has(String(pid)) ? <Spinner size="tiny" /> : <SyringeRegular />}
                                        onClick={handleAttach}
                                        disabled={actionPids.has(String(pid)) || client.state === 3}
                                    >
                                        Attach
                                    </Button>
                                    <Button
                                        size="small"
                                        appearance="primary"
                                        icon={actionPids.has(`exec-${pid}`) ? <Spinner size="tiny" /> : <PlayRegular />}
                                        onClick={() => handleExecute(pid)}
                                        disabled={actionPids.has(`exec-${pid}`) || client.state < 2}
                                    >
                                        Test
                                    </Button>
                                </div>
                            </Card>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

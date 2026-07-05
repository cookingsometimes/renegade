import {
    Badge,
    Body1,
    Button,
    Card,
    makeStyles,
    tokens,
} from "@fluentui/react-components";
import {
    CheckmarkCircleFilled,
    DismissCircleRegular,
    CodeRegular,
    PeopleRegular,
    PlayRegular,
} from "@fluentui/react-icons";
import type { ExecutionLog, PageId, RobloxClientInfo } from "@common/types";

const useStyles = makeStyles({
    root: {
        display: "flex",
        flexDirection: "column",
        gap: "24px",
        minHeight: 0,
        padding: "32px",
        overflowY: "auto",
    },
    welcomeSection: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        textAlign: "center",
        gap: "12px",
        padding: "40px 0 24px",
    },
    welcomeTitle: {
        fontSize: tokens.fontSizeHero900,
        fontWeight: tokens.fontWeightBold,
    },
    welcomeSubtitle: {
        fontSize: tokens.fontSizeBase400,
        color: tokens.colorNeutralForeground3,
        maxWidth: "400px",
    },
    statusBadge: {
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        padding: "8px 16px",
        borderRadius: tokens.borderRadiusLarge,
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightSemibold,
    },
    actionsGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(2, 1fr)",
        gap: "16px",
        maxWidth: "500px",
        width: "100%",
        margin: "0 auto",
    },
    actionCard: {
        padding: "24px",
        borderRadius: tokens.borderRadiusXLarge,
        boxShadow: tokens.shadow4,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
        cursor: "pointer",
        transitionProperty: "box-shadow, transform",
        transitionDuration: tokens.durationNormal,
        ":hover": {
            boxShadow: tokens.shadow8,
            transform: "translateY(-2px)",
        },
    },
    actionIcon: {
        width: "48px",
        height: "48px",
        borderRadius: tokens.borderRadiusCircular,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
    },
    actionTitle: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
    },
    actionDesc: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
        textAlign: "center" as const,
    },
    recentSection: {
        maxWidth: "500px",
        width: "100%",
        margin: "0 auto",
    },
    recentHeader: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "8px",
    },
    logItem: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "10px 12px",
        borderRadius: tokens.borderRadiusMedium,
        ":hover": {
            background: tokens.colorNeutralBackground2,
        },
    },
    scriptPreview: {
        fontFamily: "'Cascadia Code', 'Fira Code', 'Consolas', monospace",
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground2,
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
        maxWidth: "350px",
    },
});

interface Props {
    isAttached: boolean;
    clients: RobloxClientInfo[];
    executionLog: ExecutionLog[];
    onNavigate: (page: PageId) => void;
    powerUser: boolean;
}

export const Dashboard = ({ isAttached, clients, executionLog, onNavigate, powerUser }: Props) => {
    const styles = useStyles();
    const attachedCount = clients.filter((c) => c.state === 3).length;

    return (
        <div className={styles.root}>
            <div className={styles.welcomeSection}>
                <span className={styles.welcomeTitle}>Welcome to Renegade</span>
                <span className={styles.welcomeSubtitle}>
                    Your script execution companion. Get started by executing a script or browsing the script hub.
                </span>

                {isAttached ? (
                    <div
                        className={styles.statusBadge}
                        style={{
                            background: tokens.colorPaletteGreenBackground1,
                            color: tokens.colorPaletteGreenForeground1,
                        }}
                    >
                        <CheckmarkCircleFilled fontSize={16} />
                        {powerUser
                            ? `Connected — ${attachedCount} client${attachedCount !== 1 ? "s" : ""} ready`
                            : "Connected"}
                    </div>
                ) : (
                    <div
                        className={styles.statusBadge}
                        style={{
                            background: tokens.colorNeutralBackground4,
                            color: tokens.colorNeutralForeground3,
                        }}
                    >
                        <DismissCircleRegular fontSize={16} />
                        Not connected
                    </div>
                )}
            </div>

            <div className={styles.actionsGrid}>
                <Card
                    className={styles.actionCard}
                    onClick={() => onNavigate("execute")}
                >
                    <div
                        className={styles.actionIcon}
                        style={{ background: tokens.colorBrandBackground2 }}
                    >
                        <PlayRegular fontSize={24} style={{ color: tokens.colorBrandForeground2 }} />
                    </div>
                    <span className={styles.actionTitle}>Execute Script</span>
                    <span className={styles.actionDesc}>Write or paste a script and run it</span>
                </Card>

                <Card
                    className={styles.actionCard}
                    onClick={() => onNavigate("scripts")}
                >
                    <div
                        className={styles.actionIcon}
                        style={{ background: tokens.colorPalettePurpleBackground2 }}
                    >
                        <CodeRegular fontSize={24} style={{ color: tokens.colorPalettePurpleForeground2 }} />
                    </div>
                    <span className={styles.actionTitle}>Script Hub</span>
                    <span className={styles.actionDesc}>Browse trending scripts</span>
                </Card>

                <Card
                    className={styles.actionCard}
                    onClick={() => onNavigate("clients")}
                >
                    <div
                        className={styles.actionIcon}
                        style={{ background: tokens.colorPaletteBlueBackground2 }}
                    >
                        <PeopleRegular fontSize={24} style={{ color: tokens.colorPaletteBlueForeground2 }} />
                    </div>
                    <span className={styles.actionTitle}>Clients</span>
                    <span className={styles.actionDesc}>{powerUser ? `${clients.length} Roblox instance${clients.length !== 1 ? "s" : ""} detected` : "Manage connected clients"}</span>
                </Card>

                <Card
                    className={styles.actionCard}
                    onClick={() => onNavigate("settings")}
                >
                    <div
                        className={styles.actionIcon}
                        style={{ background: tokens.colorNeutralBackground4 }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={tokens.colorNeutralForeground2} strokeWidth="2">
                            <circle cx="12" cy="12" r="3" />
                            <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" />
                        </svg>
                    </div>
                    <span className={styles.actionTitle}>Settings</span>
                    <span className={styles.actionDesc}>Configure Renegade</span>
                </Card>

                <Card
                    className={styles.actionCard}
                    onClick={() => onNavigate("about")}
                >
                    <div
                        className={styles.actionIcon}
                        style={{ background: tokens.colorNeutralBackground4 }}
                    >
                        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={tokens.colorNeutralForeground2} strokeWidth="2">
                            <circle cx="12" cy="12" r="10" />
                            <path d="M12 16v-4M12 8h.01" />
                        </svg>
                    </div>
                    <span className={styles.actionTitle}>About</span>
                    <span className={styles.actionDesc}>Learn more about Renegade</span>
                </Card>
            </div>

            {executionLog.length > 0 && (
                <div className={styles.recentSection}>
                    <div className={styles.recentHeader}>
                        <Body1 style={{ fontWeight: tokens.fontWeightSemibold }}>Recent</Body1>
                        <Button
                            size="small"
                            appearance="subtle"
                            onClick={() => onNavigate("logs")}
                        >
                            View all
                        </Button>
                    </div>
                    {executionLog.slice(0, 3).map((entry) => (
                        <div key={entry.id} className={styles.logItem}>
                            <span className={styles.scriptPreview}>
                                {entry.script.slice(0, 60)}
                                {entry.script.length > 60 ? "..." : ""}
                            </span>
                            <Badge
                                appearance="filled"
                                color={entry.status === "success" ? "success" : "danger"}
                                size="small"
                            >
                                {entry.status === "success" ? "OK" : "FAIL"}
                            </Badge>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

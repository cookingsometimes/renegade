import { Button, Card, makeStyles, Switch, SwitchOnChangeData, tokens } from "@fluentui/react-components";
import { ArrowClockwiseRegular } from "@fluentui/react-icons";
import { useEffect, useState } from "react";
import type { ThemeId } from "../../themes/ThemeContext";
import { availableThemes } from "../../themes";
import { useNotification } from "../Notifications";

const useStyles = makeStyles({
    container: {
        display: "flex",
        flexDirection: "column",
        flex: 1,
        minHeight: 0,
        overflow: "hidden",
    },
    scrollArea: {
        flex: 1,
        overflowY: "auto",
        padding: "16px 20px",
        gap: "16px",
        display: "flex",
        flexDirection: "column",
    },
    header: {
        display: "flex",
        alignItems: "center",
        gap: "12px",
        marginBottom: "8px",
    },
    headerTitle: {
        fontSize: "20px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    card: {
        backgroundColor: tokens.colorNeutralBackground2,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: "8px",
        padding: "16px",
    },
    cardTitle: {
        fontSize: "13px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
        marginBottom: "12px",
    },
    row: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "8px 0",
    },
    rowLabel: {
        display: "flex",
        flexDirection: "column" as const,
        gap: "2px",
    },
    labelText: {
        fontSize: "13px",
        fontWeight: "500",
        color: tokens.colorNeutralForeground1,
    },
    subText: {
        fontSize: "11px",
        color: tokens.colorNeutralForeground3,
    },
    pathBox: {
        display: "flex",
        alignItems: "center",
        gap: "8px",
        padding: "6px 10px",
        backgroundColor: tokens.colorNeutralBackground1,
        border: `1px solid ${tokens.colorNeutralStroke2}`,
        borderRadius: "4px",
        fontSize: "12px",
        color: tokens.colorNeutralForeground2,
        fontFamily: "monospace",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap" as const,
        maxWidth: "400px",
    },
    updateBtn: {
        marginTop: "8px",
    },
    autoUpdateRow: {
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginTop: "8px",
    },
    themeGrid: {
        display: "grid",
        gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
        gap: "8px",
    },
    themeOption: {
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "6px",
        padding: "12px 8px",
        borderRadius: "8px",
        border: `2px solid ${tokens.colorNeutralStroke2}`,
        background: tokens.colorNeutralBackground1,
        cursor: "pointer",
        transition: "border-color 0.15s, background 0.15s",
        textAlign: "center" as const,
    },
    themeOptionActive: {
        background: tokens.colorBrandBackground2,
    },
    themeName: {
        fontSize: "12px",
        fontWeight: "600",
        color: tokens.colorNeutralForeground1,
    },
    themeDesc: {
        fontSize: "10px",
        color: tokens.colorNeutralForeground3,
    },
});

interface Props {
    powerUser: boolean;
    onPowerUserChange?: (value: boolean) => void;
    themeId?: ThemeId;
    onThemeChange?: (id: ThemeId) => void;
    streamerMode?: boolean;
    onStreamerModeChange?: (v: boolean) => void;
    autoUpdate?: boolean;
    onAutoUpdateChange?: (v: boolean) => void;
}

export const Settings = ({
    powerUser,
    onPowerUserChange,
    themeId = "fluent",
    onThemeChange,
    streamerMode = false,
    onStreamerModeChange,
    autoUpdate = true,
    onAutoUpdateChange,
}: Props) => {
    const styles = useStyles();
    const { notify } = useNotification();
    const [xenoDir, setXenoDir] = useState("");
    const [scriptsDir, setScriptsDir] = useState("");
    const [proxyUrl, setProxyUrl] = useState("");

    useEffect(() => {
        load();
    }, []);

    const load = async () => {
        try {
            const dir = await window.ContextBridge.getXenoDir();
            if (dir) setXenoDir(dir);
        } catch { /* ignore */ }
        try {
            const dir = await window.ContextBridge.getScriptsDir();
            if (dir) setScriptsDir(dir);
        } catch { /* ignore */ }
        try {
            const url = await window.ContextBridge.getProxyUrl();
            if (url) setProxyUrl(url);
        } catch { /* ignore */ }
    };

    const handlePowerUserChange = (_e: unknown, data: SwitchOnChangeData) => {
        onPowerUserChange?.(data.checked);
    };

    const handleThemeSelect = (id: ThemeId) => {
        onThemeChange?.(id);
    };

    const handleCheckForUpdates = async () => {
        try {
            const info = await window.ContextBridge.checkForUpdates();
            if (info.needsUpdate) {
                const result = await window.ContextBridge.downloadXeno();
                if (result.success) {
                    notify({ type: "success", title: "Update complete", message: `Updated to v${result.version}` });
                }
            }
        } catch { /* ignore */ }
    };

    return (
        <div className={styles.container}>
            <div className={styles.header}>
                <span className={styles.headerTitle}>Settings</span>
            </div>

            <div className={styles.scrollArea}>
                <Card className={styles.card}>
                <div className={styles.cardTitle}>General</div>
                <div className={styles.autoUpdateRow}>
                    <div className={styles.rowLabel}>
                        <span className={styles.labelText}>Auto-update</span>
                        <span className={styles.subText}>Automatically download new versions when available</span>
                    </div>
                    <Switch
                        checked={autoUpdate}
                        onChange={(_e: unknown, data: SwitchOnChangeData) => onAutoUpdateChange?.(data.checked)}
                    />
                </div>
                <Button
                    className={styles.updateBtn}
                    appearance="secondary"
                    size="small"
                    icon={<ArrowClockwiseRegular />}
                    onClick={handleCheckForUpdates}
                >
                    Check for Updates
                </Button>
            </Card>

            <Card className={styles.card}>
                <div className={styles.cardTitle}>Theme</div>
                <div className={styles.themeGrid}>
                    {availableThemes.map((t) => (
                        <div
                            key={t.id}
                            className={`${styles.themeOption} ${themeId === t.id ? styles.themeOptionActive : ""}`}
                            onClick={() => handleThemeSelect(t.id)}
                        >
                            <span className={styles.themeName}>{t.name}</span>
                            <span className={styles.themeDesc}>{t.description}</span>
                        </div>
                    ))}
                </div>
            </Card>

            <Card className={styles.card}>
                <div className={styles.cardTitle}>Interface</div>
                <div className={styles.row}>
                    <div className={styles.rowLabel}>
                        <span className={styles.labelText}>Power User Mode</span>
                        <span className={styles.subText}>Show technical details like ports, DLL status, and logs</span>
                    </div>
                    <Switch
                        checked={powerUser}
                        onChange={handlePowerUserChange}
                    />
                </div>
                <div className={styles.row}>
                    <div className={styles.rowLabel}>
                        <span className={styles.labelText}>Streamer Mode</span>
                        <span className={styles.subText}>Hide client names and sensitive info for screen recording</span>
                    </div>
                    <Switch
                        checked={streamerMode}
                        onChange={(_e: unknown, data: SwitchOnChangeData) => onStreamerModeChange?.(data.checked)}
                    />
                </div>
            </Card>

            <Card className={styles.card}>
                <div className={styles.cardTitle}>Paths</div>
                <div className={styles.row}>
                    <div className={styles.rowLabel}>
                        <span className={styles.labelText}>Scripts Directory</span>
                        <span className={styles.subText}>Where saved scripts are stored</span>
                    </div>
                    <div className={styles.pathBox}>{scriptsDir || "Not set"}</div>
                </div>
                {powerUser && (
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <span className={styles.labelText}>Xeno Directory</span>
                            <span className={styles.subText}>Where the executor is installed</span>
                        </div>
                        <div className={styles.pathBox}>{xenoDir || "Not set"}</div>
                    </div>
                )}
            </Card>

            {powerUser && (
                <Card className={styles.card}>
                    <div className={styles.cardTitle}>Server</div>
                    <div className={styles.row}>
                        <div className={styles.rowLabel}>
                            <span className={styles.labelText}>Proxy Server</span>
                            <span className={styles.subText}>HTTP bridge to Xeno.dll</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                            <div className={styles.pathBox}>{proxyUrl || "Not running"}</div>
                            <div
                                style={{
                                    width: 8,
                                    height: 8,
                                    borderRadius: "50%",
                                    backgroundColor: proxyUrl ? tokens.colorPaletteGreenBackground1 : tokens.colorPaletteRedBackground1,
                                    flexShrink: 0,
                                }}
                            />
                        </div>
                    </div>
                </Card>
            )}
            </div>
        </div>
    );
};

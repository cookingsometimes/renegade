import { Body1, ProgressBar, makeStyles, tokens } from "@fluentui/react-components";
import {
    ArrowDownloadRegular,
    CodeRegular,
    DashboardRegular,
    DismissCircleRegular,
    DocumentRegular,
    InfoRegular,
    PeopleRegular,
    SearchRegular,
    SettingsRegular,
} from "@fluentui/react-icons";
import type { DownloadStateInfo } from "@common/ContextBridge";
import type { PageId } from "@common/types";

const useStyles = makeStyles({
    sidebar: {
        height: "100%",
        width: "220px",
        display: "flex",
        flexDirection: "column",
        boxSizing: "border-box",
        flexShrink: 0,
        background: "transparent",
    },
    nav: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        padding: "0 8px",
        flexGrow: 1,
    },
    navItem: {
        display: "flex",
        alignItems: "center",
        gap: "10px",
        padding: "10px 12px",
        borderRadius: tokens.borderRadiusMedium,
        cursor: "pointer",
        border: "none",
        background: "transparent",
        color: tokens.colorNeutralForeground2,
        fontSize: "14px",
        fontFamily: "inherit",
        width: "100%",
        textAlign: "left" as const,
        transition: "background 0.15s, color 0.15s",
        ":hover": {
            background: tokens.colorNeutralBackground2,
        },
    },
    navItemActive: {
        background: tokens.colorBrandBackground2,
        color: tokens.colorBrandForeground1,
        fontWeight: 600,
        ":hover": {
            background: tokens.colorBrandBackground2,
        },
    },
    footer: {
        padding: "12px 20px",
        display: "flex",
        flexDirection: "column",
        gap: "4px",
    },
    statusDot: {
        width: "8px",
        height: "8px",
        borderRadius: "50%",
        display: "inline-block",
        marginRight: "6px",
    },
    downloadSection: {
        display: "flex",
        flexDirection: "column",
        gap: "6px",
        padding: "10px 20px",
    },
});

const navItems: { id: PageId; label: string; icon: React.FC<{ style?: React.CSSProperties }>; dllOnly?: boolean }[] = [
    { id: "dashboard", label: "Dashboard", icon: DashboardRegular },
    { id: "execute", label: "Execute", icon: CodeRegular },
    { id: "scripts", label: "Scripts", icon: SearchRegular },
    { id: "clients", label: "Clients", icon: PeopleRegular },
    { id: "dllStatus", label: "DLL Status", icon: InfoRegular, dllOnly: true },
    { id: "logs", label: "Logs", icon: DocumentRegular },
    { id: "settings", label: "Settings", icon: SettingsRegular },
    { id: "about", label: "About", icon: InfoRegular },
];

interface Props {
    activePage: PageId;
    onPageChange: (page: PageId) => void;
    xenoVersion: string;
    isAttached: boolean;
    clientCount: number;
    updateAvailable: boolean;
    downloadState: DownloadStateInfo;
    powerUser: boolean;
}

export const Sidebar = ({
    activePage,
    onPageChange,
    xenoVersion: _xenoVersion,
    isAttached: _isAttached,
    clientCount,
    updateAvailable,
    downloadState,
    powerUser,
}: Props) => {
    const styles = useStyles();
    const isDownloading = downloadState.state === "downloading" || downloadState.state === "fetching_url" || downloadState.state === "extracting" || downloadState.state === "launching";
    const isError = downloadState.state === "error";
    const isReady = downloadState.state === "ready";

    const visibleNavItems = navItems.filter((item) => {
        if (item.id === "dllStatus" && !powerUser) return false;
        if (item.id === "logs" && !powerUser) return false;
        return true;
    });

    return (
        <div className={styles.sidebar}>
            <nav className={styles.nav}>
                {visibleNavItems.map((item) => {
                    const Icon = item.icon;
                    return (
                        <button
                            key={item.id}
                            className={`${styles.navItem} ${activePage === item.id ? styles.navItemActive : ""}`}
                            onClick={() => onPageChange(item.id)}
                        >
                            <Icon style={{ fontSize: "18px" }} />
                            {item.label}
                            {item.id === "execute" && updateAvailable && (
                                <ArrowDownloadRegular
                                    style={{ marginLeft: "auto", fontSize: "14px", color: "#ff6b35" }}
                                />
                            )}
                        </button>
                    );
                })}
            </nav>

            <div className={styles.footer}>
                <div style={{ display: "flex", alignItems: "center", fontSize: "12px", color: tokens.colorNeutralForeground3 }}>
                    <span
                        className={styles.statusDot}
                        style={{
                            background: isReady
                                ? "#4caf50"
                                : isDownloading
                                    ? "#ff9800"
                                    : isError
                                        ? "#f44336"
                                        : "#666",
                        }}
                    />
                    {isDownloading
                            ? stateLabels[downloadState.state] ?? "Downloading..."
                                : isReady
                                    ? "Ready"
                                    : isError
                                    ? "Download failed"
                                    : "Not installed"}
                </div>
                {powerUser && (
                    <div style={{ fontSize: "12px", color: tokens.colorNeutralForeground3 }}>
                        {isReady ? `${clientCount} client${clientCount !== 1 ? "s" : ""}` : ""}
                    </div>
                )}
            </div>

            {isDownloading && (
                <div className={styles.downloadSection}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                        <Body1 style={{ fontSize: "11px", color: tokens.colorNeutralForeground3 }}>
                            {downloadState.state === "downloading"
                                ? `Downloading... ${downloadState.progress}%`
                                : downloadState.state === "fetching_url"
                                    ? "Connecting to API..."
                                    : downloadState.state === "extracting"
                                        ? "Extracting files..."
                                        : "Starting Xeno..."}
                        </Body1>
                        <Body1 style={{ fontSize: "11px", color: tokens.colorNeutralForeground3 }}>
                            {downloadState.state === "downloading" ? `${downloadState.progress}%` : ""}
                        </Body1>
                    </div>
                    <ProgressBar
                        value={downloadState.state === "downloading" ? downloadState.progress / 100 : undefined}
                        style={{ height: "4px" }}
                    />
                </div>
            )}

            {isError && (
                <div className={styles.downloadSection}>
                    <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <DismissCircleRegular style={{ fontSize: "14px", color: tokens.colorPaletteRedForeground1 }} />
                        <Body1 style={{ fontSize: "11px", color: tokens.colorPaletteRedForeground1 }}>
                            {downloadState.error || "Download failed. Check connection."}
                        </Body1>
                    </div>
                </div>
            )}

        </div>
    );
};

const stateLabels: Record<string, string> = {
    idle: "Waiting...",
    fetching_url: "Connecting...",
    downloading: "Downloading...",
    extracting: "Extracting...",
    launching: "Starting...",
    ready: "Ready",
    error: "Failed",
};

import { makeStyles } from "@fluentui/react-components";
import {
    CheckmarkCircleRegular,
    DismissCircleRegular,
    InfoRegular,
    WarningRegular,
} from "@fluentui/react-icons";
import { createContext, useCallback, useContext, useRef, useState } from "react";

export interface Notification {
    id: string;
    type: "success" | "error" | "info" | "warning";
    title: string;
    message?: string;
    duration?: number;
}

interface NotificationContextValue {
    notify: (n: Omit<Notification, "id">) => void;
}

const NotificationContext = createContext<NotificationContextValue>({
    notify: () => {},
});

export const useNotification = () => useContext(NotificationContext);

const useStyles = makeStyles({
    container: {
        position: "fixed",
        bottom: "16px",
        right: "16px",
        display: "flex",
        flexDirection: "column-reverse",
        gap: "8px",
        zIndex: 9999,
        pointerEvents: "none",
    },
    toast: {
        pointerEvents: "auto",
        display: "flex",
        alignItems: "flex-start",
        gap: "12px",
        padding: "14px 18px",
        borderRadius: "12px",
        minWidth: "300px",
        maxWidth: "420px",
        cursor: "pointer",
        animation: "slideInBottomRight 0.3s ease-out",
    },
    content: {
        display: "flex",
        flexDirection: "column",
        gap: "3px",
        flexGrow: "1",
    },
});

type NotifStyle = {
    bg: string;
    border: string;
    iconColor: string;
    titleColor: string;
    msgColor: string;
};

const STYLE_MAP: Record<string, NotifStyle> = {
    success: {
        bg: "#1a3a1a",
        border: "1px solid #2ea04366",
        iconColor: "#3fb950",
        titleColor: "#3fb950",
        msgColor: "#8bd59b",
    },
    error: {
        bg: "#3a1a1a",
        border: "1px solid #f8514966",
        iconColor: "#f85149",
        titleColor: "#f85149",
        msgColor: "#f0a0a0",
    },
    info: {
        bg: "#1a2a3a",
        border: "1px solid #58a6ff66",
        iconColor: "#58a6ff",
        titleColor: "#58a6ff",
        msgColor: "#a0c4e8",
    },
    warning: {
        bg: "#3a2a1a",
        border: "1px solid #d2992266",
        iconColor: "#e3b341",
        titleColor: "#e3b341",
        msgColor: "#d4c090",
    },
};

const ICON_MAP: Record<string, React.FC<{ style?: React.CSSProperties }>> = {
    success: CheckmarkCircleRegular,
    error: DismissCircleRegular,
    info: InfoRegular,
    warning: WarningRegular,
};

export const NotificationProvider = ({ children }: { children: React.ReactNode }) => {
    const styles = useStyles();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const counterRef = useRef(0);

    const remove = useCallback((id: string) => {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
    }, []);

    const notify = useCallback(
        (n: Omit<Notification, "id">) => {
            const id = `n-${++counterRef.current}`;
            const entry: Notification = { id, duration: 3500, ...n };
            setNotifications((prev) => [...prev, entry]);
            setTimeout(() => remove(id), entry.duration);
        },
        [remove],
    );

    return (
        <NotificationContext.Provider value={{ notify }}>
            {children}
            <div className={styles.container}>
                {notifications.map((n) => {
                    const Icon = ICON_MAP[n.type] ?? InfoRegular;
                    const s = STYLE_MAP[n.type] ?? STYLE_MAP.info;
                    return (
                        <div
                            key={n.id}
                            className={styles.toast}
                            style={{
                                background: s.bg,
                                border: s.border,
                                boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
                            }}
                            onClick={() => remove(n.id)}
                        >
                            <Icon
                                style={{
                                    fontSize: "20px",
                                    marginTop: "1px",
                                    flexShrink: 0,
                                    color: s.iconColor,
                                }}
                            />
                            <div className={styles.content}>
                                <span
                                    style={{
                                        fontSize: "13px",
                                        fontWeight: 600,
                                        color: s.titleColor,
                                    }}
                                >
                                    {n.title}
                                </span>
                                {n.message && (
                                    <span
                                        style={{
                                            fontSize: "12px",
                                            color: s.msgColor,
                                            lineHeight: 1.4,
                                        }}
                                    >
                                        {n.message}
                                    </span>
                                )}
                            </div>
                        </div>
                    );
                })}
            </div>
        </NotificationContext.Provider>
    );
};

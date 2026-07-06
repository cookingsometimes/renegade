import type { PageId } from "@common/types";
import "./TopBar.css";

interface Props {
    activePage: PageId;
    onPageChange: (page: PageId) => void;
    serverRunning: boolean;
    serverVersion: string;
    clientCount: number;
}

const NAV_ITEMS: { id: PageId; label: string }[] = [
    { id: "dashboard", label: "Home" },
    { id: "execute", label: "Execute" },
    { id: "clients", label: "Clients" },
    { id: "scripts", label: "Scripts" },
    { id: "logs", label: "Logs" },
    { id: "settings", label: "Settings" },
    { id: "about", label: "About" },
];

export const TopBar = ({ activePage, onPageChange, serverRunning, serverVersion, clientCount }: Props) => {
    return (
        <div className="topbar">
            <div className="topbar-nav">
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        className={`topbar-nav-item ${activePage === item.id ? "active" : ""}`}
                        onClick={() => onPageChange(item.id)}
                    >
                        {item.label}
                        {item.id === "clients" && clientCount > 0 && (
                            <span className="topbar-badge">{clientCount}</span>
                        )}
                    </button>
                ))}
            </div>
            <div className="topbar-status">
                <span className={`topbar-status-dot ${serverRunning ? "online" : "offline"}`} />
                <span className="topbar-status-text">
                    {serverRunning ? (serverVersion || "?") : "Offline"}
                </span>
            </div>
        </div>
    );
};

import type { PageId, ExecutorType } from "@common/types";
import "./Sidebar.css";

interface Props {
    activePage: PageId;
    onPageChange: (page: PageId) => void;
    serverRunning: boolean;
    serverVersion: string;
    clientCount: number;
    collapsed: boolean;
    onToggleCollapse: () => void;
    executor: ExecutorType;
    velocityStatus: { available: boolean; initialized: boolean; version: string; state: string; injectedPids: number[] };
}

const NAV_ITEMS: { id: PageId; label: string; icon: string }[] = [
    { id: "dashboard", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
    { id: "downloads", label: "Downloads", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
    { id: "execute", label: "Execute", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
    { id: "clients", label: "Clients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "scripts", label: "Script Hub", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { id: "logs", label: "Logs", icon: "M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" },
];

const SETTINGS_ITEMS: { id: PageId; label: string; icon: string }[] = [
    { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
    { id: "about", label: "About", icon: "M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" },
];

export const Sidebar = ({ activePage, onPageChange, serverRunning, serverVersion, clientCount, collapsed, onToggleCollapse, executor, velocityStatus }: Props) => {
    return (
        <div className={`sidebar ${collapsed ? "collapsed" : ""}`}>
            <div className="sidebar-section">
                {!collapsed && <div className="sidebar-label">Menu</div>}
                {NAV_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
                        onClick={() => onPageChange(item.id)}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="sidebar-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d={item.icon} />
                            </svg>
                        </span>
                        <span className="sidebar-item-text">{item.label}</span>
                        {item.id === "clients" && clientCount > 0 && (
                            <span className="sidebar-badge">{clientCount}</span>
                        )}
                    </button>
                ))}
            </div>

            <div className="sidebar-spacer" />

            <div className="sidebar-section">
                {!collapsed && <div className="sidebar-label">System</div>}
                {SETTINGS_ITEMS.map((item) => (
                    <button
                        key={item.id}
                        className={`sidebar-item ${activePage === item.id ? "active" : ""}`}
                        onClick={() => onPageChange(item.id)}
                        title={collapsed ? item.label : undefined}
                    >
                        <span className="sidebar-item-icon">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d={item.icon} />
                            </svg>
                        </span>
                        <span className="sidebar-item-text">{item.label}</span>
                    </button>
                ))}
            </div>

            <button className="sidebar-collapse-btn" onClick={onToggleCollapse} title={collapsed ? "Expand" : "Collapse"}>
                <span className="sidebar-item-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <polyline points={collapsed ? "9 18 15 12 9 6" : "15 18 9 12 15 6"} />
                    </svg>
                </span>
                <span className="sidebar-collapse-label sidebar-item-text">Collapse</span>
            </button>

            <div className="sidebar-status">
                <div className="sidebar-status-row">
                    <span className={`sidebar-status-dot ${serverRunning ? "online" : "offline"}`} />
                    <span className="sidebar-status-text">
                        {serverRunning ? `${serverVersion || "?"}` : "Offline"}
                    </span>
                </div>
                {!collapsed && (
                    <div className="sidebar-executor-badge" data-executor={executor}>
                        {executor === "xeno" ? "Xeno" : "Velocity"}
                        {executor === "velocity" && velocityStatus.state === "Attached" && (
                            <span className="sidebar-velocity-dot" />
                        )}
                    </div>
                )}
            </div>
        </div>
    );
};

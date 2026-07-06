import type { PageId, UiMode } from "@common/types";
import iconUrl from "../../icon.png";
import "./TitleBar.css";

interface Props {
    uiMode: UiMode;
    activePage?: PageId;
    onPageChange?: (page: PageId) => void;
    serverRunning?: boolean;
    clientCount?: number;
}

const COMPACT_NAV: { id: PageId; label: string; icon: string }[] = [
    { id: "dashboard", label: "Home", icon: "M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-4 0a1 1 0 01-1-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 01-1 1" },
    { id: "execute", label: "Execute", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
    { id: "scripts", label: "Scripts", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
];

export const TitleBar = ({ uiMode, activePage, onPageChange, serverRunning, clientCount }: Props) => {
    const isCompact = uiMode === "compact";

    return (
        <div className={`titlebar ${isCompact ? "compact" : ""}`}>
            {isCompact ? (
                <>
                    <div className="titlebar-left">
                        <img src={iconUrl} alt="Renegade" className="titlebar-icon" />
                        <span className="titlebar-title-compact">Renegade</span>
                    </div>

                    <div className="titlebar-center">
                        {COMPACT_NAV.map((item) => (
                            <button
                                key={item.id}
                                className={`titlebar-nav-btn ${activePage === item.id ? "active" : ""}`}
                                onClick={() => onPageChange?.(item.id)}
                                title={item.label}
                            >
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                    <path d={item.icon} />
                                </svg>
                                {item.id === "execute" && clientCount != null && clientCount > 0 && (
                                    <span className="titlebar-nav-badge">{clientCount}</span>
                                )}
                            </button>
                        ))}
                    </div>

                    <div className="titlebar-right">
                        <button
                            className={`titlebar-nav-btn ${activePage === "downloads" ? "active" : ""}`}
                            onClick={() => onPageChange?.("downloads")}
                            title="Downloads"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" />
                            </svg>
                        </button>
                        <button
                            className={`titlebar-nav-btn ${activePage === "settings" ? "active" : ""}`}
                            onClick={() => onPageChange?.("settings")}
                            title="Settings"
                        >
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <circle cx="12" cy="12" r="3" />
                                <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" />
                            </svg>
                        </button>
                        <div className="titlebar-divider" />
                        <div className="titlebar-status">
                            <span className={`titlebar-status-dot ${serverRunning ? "online" : ""}`} />
                        </div>
                        <div className="titlebar-controls">
                            <button className="titlebar-btn" title="Minimize" onClick={() => window.ContextBridge.minimize()}>
                                <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="5.5" width="8" height="1" fill="currentColor" rx="0.5" /></svg>
                            </button>
                            <button className="titlebar-btn" title="Maximize" onClick={() => window.ContextBridge.toggleMaximize()}>
                                <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" rx="1" /></svg>
                            </button>
                            <button className="titlebar-btn close" title="Close" onClick={() => window.ContextBridge.close()}>
                                <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                            </button>
                        </div>
                    </div>
                </>
            ) : (
                <>
                    <span className="titlebar-title">Renegade</span>
                    <div className="titlebar-controls">
                        <button className="titlebar-btn" title="Minimize" onClick={() => window.ContextBridge.minimize()}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="5.5" width="8" height="1" fill="currentColor" rx="0.5" /></svg>
                        </button>
                        <button className="titlebar-btn" title="Maximize" onClick={() => window.ContextBridge.toggleMaximize()}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><rect x="2" y="2" width="8" height="8" fill="none" stroke="currentColor" strokeWidth="1" rx="1" /></svg>
                        </button>
                        <button className="titlebar-btn close" title="Close" onClick={() => window.ContextBridge.close()}>
                            <svg width="12" height="12" viewBox="0 0 12 12"><path d="M3 3l6 6M9 3l-6 6" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" /></svg>
                        </button>
                    </div>
                </>
            )}
        </div>
    );
};

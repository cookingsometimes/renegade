import type { PageId } from "@common/types";
import "./Dashboard.css";

interface Props {
    serverRunning: boolean;
    serverVersion: string;
    clientCount: number;
    onNavigate: (page: PageId) => void;
    onAttach: () => void;
}

export const Dashboard = ({ serverRunning, serverVersion, clientCount, onNavigate, onAttach }: Props) => {
    return (
        <div className="dashboard">
            <div className="dashboard-header">
                <div>
                    <div className="dashboard-greeting">Welcome back</div>
                    <div className="dashboard-sub">Renegade is ready to go.</div>
                </div>
            </div>

            <div className="dashboard-cards">
                <div className="dash-card">
                    <div className="dash-card-header">
                        <span className="dash-card-label">Server</span>
                        <div className="dash-card-icon" style={{ background: serverRunning ? "var(--success-subtle)" : "var(--error-subtle)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={serverRunning ? "var(--success)" : "var(--error)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                <line x1="6" y1="6" x2="6.01" y2="6" />
                                <line x1="6" y1="18" x2="6.01" y2="18" />
                            </svg>
                        </div>
                    </div>
                    <div className="dash-card-value">{serverRunning ? "Online" : "Offline"}</div>
                    <div className="dash-card-sub">{serverRunning ? `${serverVersion || "?"}` : "Not running"}</div>
                </div>

                <div className="dash-card">
                    <div className="dash-card-header">
                        <span className="dash-card-label">Clients</span>
                        <div className="dash-card-icon" style={{ background: clientCount > 0 ? "var(--accent-subtle)" : "var(--bg-tertiary)" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={clientCount > 0 ? "var(--accent)" : "var(--text-tertiary)"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M23 21v-2a4 4 0 00-3-3.87" />
                                <path d="M16 3.13a4 4 0 010 7.75" />
                            </svg>
                        </div>
                    </div>
                    <div className="dash-card-value">{clientCount}</div>
                    <div className="dash-card-sub">{clientCount > 0 ? "Roblox detected" : "No clients"}</div>
                </div>
            </div>

            <div className="action-grid">
                <button className="action-btn primary" onClick={onAttach}>
                    <div className="action-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <circle cx="12" cy="12" r="10" />
                            <line x1="12" y1="8" x2="12" y2="16" />
                            <line x1="8" y1="12" x2="16" y2="12" />
                        </svg>
                    </div>
                    Inject
                </button>
                <button className="action-btn" onClick={() => onNavigate("execute")}>
                    <div className="action-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="16 18 22 12 16 6" />
                            <polyline points="8 6 2 12 8 18" />
                        </svg>
                    </div>
                    Execute Script
                </button>
                <button className="action-btn" onClick={() => onNavigate("clients")}>
                    <div className="action-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                            <circle cx="9" cy="7" r="4" />
                            <path d="M23 21v-2a4 4 0 00-3-3.87" />
                            <path d="M16 3.13a4 4 0 010 7.75" />
                        </svg>
                    </div>
                    View Clients
                </button>
                <button className="action-btn" onClick={() => onNavigate("scripts")}>
                    <div className="action-icon">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                        </svg>
                    </div>
                    Script Hub
                </button>
            </div>
        </div>
    );
};

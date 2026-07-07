import type { PageId, ExecutorType } from "@common/types";
import "./Dashboard.css";

interface Props {
    serverRunning: boolean;
    serverVersion: string;
    xenoVersion: string;
    appVersion: string;
    clientCount: number;
    onNavigate: (page: PageId) => void;
    executor: ExecutorType;
    velocityStatus: { available: boolean; initialized: boolean; version: string; state: string; injectedPids: number[] };
}

export const Dashboard = ({ serverRunning, serverVersion, xenoVersion, appVersion, clientCount, onNavigate, executor, velocityStatus }: Props) => {
    return (
        <div className="dashboard">
            <div className="dashboard-top">
                <div className="dash-welcome-card">
                    <div className="dash-welcome-text">
                        <span className="dash-welcome-title">Welcome to Renegade</span>
                        <span className="dash-welcome-sub">Your script executor, ready to go.</span>
                    </div>
                    <div className="dash-welcome-actions">
                        <button className="dash-action-btn cyan" onClick={() => onNavigate("execute")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                            Execute
                        </button>
                        <button className="dash-action-btn dark" onClick={() => onNavigate("scripts")}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z" /><line x1="3" y1="6" x2="21" y2="6" /><path d="M16 10a4 4 0 01-8 0" /></svg>
                            Script Hub
                        </button>
                    </div>
                </div>

                <div className="dash-status-card">
                    <span className="dash-status-label">Status</span>
                    <div className="dash-status-rows">
                        <div className="dash-status-row">
                            <span className="dash-status-key">Server</span>
                            <span className={`dash-status-value ${serverRunning ? "online" : "offline"}`}>
                                {serverRunning ? "Online" : "Offline"}
                            </span>
                        </div>
                        <div className="dash-status-row">
                            <span className="dash-status-key">Clients</span>
                            <span className="dash-status-value">{clientCount}</span>
                        </div>
                        <div className="dash-status-row">
                            <span className="dash-status-key">Executor</span>
                            <span className={`dash-status-value executor-tag executor-${executor}`}>
                                {executor === "xeno" ? "Xeno" : "Velocity"}
                                {executor === "velocity" && <span className="exec-badge exp">Exp</span>}
                            </span>
                        </div>
                        {executor === "velocity" && (
                            <div className="dash-status-row">
                                <span className="dash-status-key">Inject</span>
                                <span className={`dash-status-value ${velocityStatus.state === "Attached" ? "online" : "offline"}`}>
                                    {velocityStatus.state}
                                </span>
                            </div>
                        )}
                    </div>

                    <span className="dash-status-label" style={{ marginTop: 4 }}>Versions</span>
                    <div className="dash-status-rows">
                        <div className="dash-status-row">
                            <span className="dash-status-key">Renegade</span>
                            <span className="dash-status-value">{appVersion || "—"}</span>
                        </div>
                        <div className="dash-status-row">
                            <span className="dash-status-key">Server</span>
                            <span className="dash-status-value">{serverVersion || "—"}</span>
                        </div>
                        {executor === "xeno" ? (
                            <div className="dash-status-row">
                                <span className="dash-status-key">Xeno</span>
                                <span className="dash-status-value">{xenoVersion || "—"}</span>
                            </div>
                        ) : (
                            <div className="dash-status-row">
                                <span className="dash-status-key">Velocity</span>
                                <span className="dash-status-value">{velocityStatus.version || "—"}</span>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

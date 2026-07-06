import type { RobloxClient } from "@common/types";
import "./Clients.css";

interface Props {
    clients: RobloxClient[];
}

export const Clients = ({ clients }: Props) => {
    return (
        <div className="page-clients">
            <div className="page-header">
                <h2 className="page-title">Clients</h2>
                <span className="page-subtitle">{clients.length} connected</span>
            </div>
            <div className="clients-list">
                {clients.length === 0 && (
                    <div className="clients-empty">
                        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="var(--text-tertiary)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                            <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                            <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                            <line x1="6" y1="6" x2="6.01" y2="6" />
                            <line x1="6" y1="18" x2="6.01" y2="18" />
                        </svg>
                        <span>No Roblox clients detected</span>
                        <span className="clients-empty-sub">Launch Roblox and inject to see clients here</span>
                    </div>
                )}
                {clients.map((c) => (
                    <div key={c[0]} className="client-card">
                        <div className="client-card-header">
                            <span className="client-name">{c[1]}</span>
                            <span className="client-pid">PID {c[0]}</span>
                        </div>
                        <div className="client-card-body">
                            {c[2] && <span className="client-detail">v{c[2]}</span>}
                            {c[4] > 0 && (
                                <span className="client-detail">
                                    Detected {new Date(c[4] * 1000).toLocaleTimeString()}
                                </span>
                            )}
                            <span className="client-detail">State: {c[3]}</span>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

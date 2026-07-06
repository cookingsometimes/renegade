import { useCallback, useEffect, useState } from "react";
import "./Logs.css";

type LogEntry = {
    id: string;
    timestamp: number;
    level: string;
    source: string;
    message: string;
};

export const Logs = () => {
    const [logs, setLogs] = useState<LogEntry[]>([]);
    const [filter, setFilter] = useState("");

    const loadLogs = useCallback(async () => {
        try {
            const data = await window.ContextBridge.getLogs();
            const entries = Array.isArray(data.logs) ? (data.logs as LogEntry[]) : [];
            setLogs(entries.reverse());
        } catch { /* ignore */ }
    }, []);

    useEffect(() => {
        loadLogs();
        const id = setInterval(loadLogs, 5000);
        return () => clearInterval(id);
    }, [loadLogs]);

    const filtered = filter
        ? logs.filter((l) => l.level.toLowerCase().includes(filter.toLowerCase()) || l.message.toLowerCase().includes(filter.toLowerCase()))
        : logs;

    return (
        <div className="page-logs">
            <div className="page-header">
                <h2 className="page-title">Logs</h2>
                <input
                    className="logs-filter"
                    placeholder="Filter..."
                    value={filter}
                    onChange={(e) => setFilter(e.target.value)}
                />
            </div>
            <div className="logs-list">
                {filtered.length === 0 && (
                    <div className="logs-empty">No logs found</div>
                )}
                {filtered.map((l, i) => (
                    <div key={l.id || i} className={`log-entry log-${l.level.toLowerCase()}`}>
                        <span className="log-time">{new Date(l.timestamp).toLocaleTimeString()}</span>
                        <span className={`log-level log-level-${l.level.toLowerCase()}`}>{l.level}</span>
                        <span className="log-source">{l.source}</span>
                        <span className="log-message">{l.message}</span>
                    </div>
                ))}
            </div>
        </div>
    );
};

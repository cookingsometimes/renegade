import { useEffect, useRef, useState } from "react";
import "./Downloads.css";

type DownloadStatus = "checking" | "not_installed" | "installed" | "downloading" | "starting" | "ready" | "error";

interface ComponentStatus {
    status: DownloadStatus;
    version: string;
    progress: number;
    bytesReceived: number;
    error: string;
    retryAttempt: number;
    retryMax: number;
    retryError: string;
}

interface Props {
    serverInstalled: boolean;
    serverRunning: boolean;
    serverVersion: string;
    xenoInstalled: boolean;
    xenoVersion: string;
    onReady: () => void;
}

export const Downloads = ({ serverInstalled, serverRunning, serverVersion, xenoInstalled, xenoVersion, onReady }: Props) => {
    const [server, setServer] = useState<ComponentStatus>({
        status: serverInstalled ? (serverRunning ? "ready" : "installed") : "not_installed",
        version: serverVersion,
        progress: 0,
        bytesReceived: 0,
        error: "",
        retryAttempt: 0,
        retryMax: 0,
        retryError: "",
    });
    const [xeno, setXeno] = useState<ComponentStatus>({
        status: xenoInstalled ? "ready" : "not_installed",
        version: xenoVersion,
        progress: 0,
        bytesReceived: 0,
        error: "",
        retryAttempt: 0,
        retryMax: 0,
        retryError: "",
    });
    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        window.ContextBridge.onDownloadProgress((b: number) => {
            setServer((prev) => ({ ...prev, bytesReceived: b }));
        });
        window.ContextBridge.onXenoProgress((b: number) => {
            setXeno((prev) => ({ ...prev, bytesReceived: b }));
        });
        window.ContextBridge.onServerRetry((data: { attempt: number; max: number; retrying?: boolean; error?: string }) => {
            setServer((prev) => ({
                ...prev,
                retryAttempt: data.attempt,
                retryMax: data.max,
                retryError: data.retrying ? data.error ?? "" : "",
            }));
        });
        window.ContextBridge.onXenoRetry((data: { attempt: number; max: number; retrying?: boolean; error?: string }) => {
            setXeno((prev) => ({
                ...prev,
                retryAttempt: data.attempt,
                retryMax: data.max,
                retryError: data.retrying ? data.error ?? "" : "",
            }));
        });
        refreshStatus();
    }, []);

    useEffect(() => {
        if (serverInstalled && serverRunning && server.status !== "ready") {
            setServer((prev) => ({ ...prev, status: "ready", version: serverVersion }));
        }
    }, [serverInstalled, serverRunning, serverVersion]);

    useEffect(() => {
        if (xenoInstalled && xeno.status !== "ready") {
            setXeno((prev) => ({ ...prev, status: "ready", version: xenoVersion }));
        }
    }, [xenoInstalled, xenoVersion]);

    const refreshStatus = async () => {
        try {
            const [srv, xenoExists, xenoVer] = await Promise.all([
                window.ContextBridge.getServerStatus(),
                window.ContextBridge.isXenoInstalled(),
                window.ContextBridge.getXenoVersion(),
            ]);
            setServer((prev) => ({
                ...prev,
                status: srv.installed ? (srv.running ? "ready" : "installed") : "not_installed",
                version: srv.serverVersion || prev.version,
                progress: srv.installed && srv.running ? 100 : prev.progress,
                bytesReceived: prev.bytesReceived,
                error: "",
                retryAttempt: prev.retryAttempt,
                retryMax: prev.retryMax,
                retryError: "",
            }));
            setXeno((prev) => ({
                ...prev,
                status: xenoExists ? "ready" : "not_installed",
                version: xenoVer || prev.version,
                progress: xenoExists ? 100 : prev.progress,
                bytesReceived: prev.bytesReceived,
                error: "",
                retryAttempt: prev.retryAttempt,
                retryMax: prev.retryMax,
                retryError: "",
            }));
        } catch { /* ignore */ }
    };

    const handleDownloadServer = async () => {
        setServer((prev) => ({ ...prev, status: "downloading", progress: 0, bytesReceived: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" }));
        try {
            const r = await window.ContextBridge.downloadServer();
            if (!r.success) throw new Error(r.error);
            setServer((prev) => ({ ...prev, status: "starting", progress: 0 }));
            await startServerLoop();
        } catch (e) {
            setServer((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const startServerLoop = async () => {
        for (let i = 0; i < 30; i++) {
            setServer((prev) => ({ ...prev, progress: Math.min(90, (i / 30) * 100) + 10 }));
            const s = await window.ContextBridge.startServer();
            if (s.success) {
                setServer((prev) => ({ ...prev, status: "installed", progress: 100 }));
                const ver = await window.ContextBridge.getVersion();
                setServer((prev) => ({ ...prev, version: ver }));
                return;
            }
            if (i < 29) await new Promise((r) => setTimeout(r, 1000));
        }
        throw new Error("Server did not start");
    };

    const handleDownloadXeno = async () => {
        setXeno((prev) => ({ ...prev, status: "downloading", progress: 0, bytesReceived: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" }));
        try {
            const r = await window.ContextBridge.downloadXeno();
            if (!r.success) throw new Error(r.error);
            setXeno((prev) => ({ ...prev, status: "ready", progress: 100 }));
            for (let i = 0; i < 10; i++) {
                const ver = await window.ContextBridge.getXenoVersion();
                if (ver) {
                    setXeno((prev) => ({ ...prev, version: ver }));
                    break;
                }
                await new Promise((r) => setTimeout(r, 1000));
            }
            refreshStatus();
        } catch (e) {
            setXeno((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const handleStartServer = async () => {
        setServer((prev) => ({ ...prev, status: "starting", progress: 0, error: "" }));
        try {
            await startServerLoop();
        } catch (e) {
            setServer((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const handleRetry = (target: "server" | "xeno") => {
        if (target === "server") {
            setServer({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        } else {
            setXeno({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        }
    };

    const allReady = server.status === "ready" && xeno.status === "ready";

    return (
        <div className="downloads">
            <div className="downloads-header">
                <h2 className="page-title">Downloads</h2>
                <span className="downloads-subtitle">Manage components required by Renegade</span>
            </div>

            <div className="downloads-grid">
                <div className="download-card">
                    <div className="download-card-header">
                        <div className="download-card-icon server">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="2" width="20" height="8" rx="2" ry="2" />
                                <rect x="2" y="14" width="20" height="8" rx="2" ry="2" />
                                <line x1="6" y1="6" x2="6.01" y2="6" />
                                <line x1="6" y1="18" x2="6.01" y2="18" />
                            </svg>
                        </div>
                        <div className="download-card-info">
                            <span className="download-card-name">RenegadeServer</span>
                            <span className="download-card-version">
                                {server.version || "Not installed"}
                            </span>
                        </div>
                        <div className={`download-status-badge ${server.status}`}>
                            {server.status === "ready" && "Ready"}
                            {server.status === "installed" && "Installed"}
                            {server.status === "downloading" && "Downloading..."}
                            {server.status === "starting" && "Starting..."}
                            {server.status === "not_installed" && "Not installed"}
                            {server.status === "error" && "Error"}
                            {server.status === "checking" && "Checking..."}
                        </div>
                    </div>

                    {(server.status === "downloading" || server.status === "starting") && (
                        <div className="download-progress-section">
                            <div className="download-progress-bar">
                                <div
                                    className="download-progress-fill"
                                    style={server.status === "downloading" && server.bytesReceived > 0
                                        ? { width: "30%", opacity: 0.6 }
                                        : { width: `${server.progress}%` }}
                                />
                            </div>
                            <div className="download-progress-text">
                                {server.status === "downloading" && server.retryError
                                    ? `Retry ${server.retryAttempt}/${server.retryMax}: ${server.retryError}`
                                    : server.status === "downloading" && server.bytesReceived > 0
                                        ? `${(server.bytesReceived / 1048576).toFixed(1)} MB downloaded`
                                        : server.status === "starting"
                                            ? `Starting... ${Math.round(server.progress)}%`
                                            : server.status === "downloading" && server.retryAttempt > 1
                                                ? `Attempt ${server.retryAttempt}/${server.retryMax}...`
                                                : "Preparing download..."}
                            </div>
                        </div>
                    )}

                    {server.error && (
                        <div className="download-error">{server.error}</div>
                    )}

                    <div className="download-card-actions">
                        {server.status === "not_installed" && (
                            <button className="download-btn primary" onClick={handleDownloadServer}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Download
                            </button>
                        )}
                        {server.status === "installed" && (
                            <button className="download-btn primary" onClick={handleStartServer}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                Start Server
                            </button>
                        )}
                        {server.status === "error" && (
                            <button className="download-btn" onClick={() => handleRetry("server")}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                Retry
                            </button>
                        )}
                        {server.status === "ready" && (
                            <div className="download-ready-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Running
                            </div>
                        )}
                    </div>
                </div>

                <div className="download-card">
                    <div className="download-card-header">
                        <div className="download-card-icon xeno">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                        </div>
                        <div className="download-card-info">
                            <span className="download-card-name">Xeno</span>
                            <span className="download-card-version">
                                {xeno.version || "Not installed"}
                            </span>
                        </div>
                        <div className={`download-status-badge ${xeno.status}`}>
                            {xeno.status === "ready" && "Ready"}
                            {xeno.status === "installed" && "Installed"}
                            {xeno.status === "downloading" && "Downloading..."}
                            {xeno.status === "not_installed" && "Not installed"}
                            {xeno.status === "error" && "Error"}
                            {xeno.status === "checking" && "Checking..."}
                        </div>
                    </div>

                    {xeno.status === "downloading" && (
                        <div className="download-progress-section">
                            <div className="download-progress-bar">
                                <div
                                    className="download-progress-fill"
                                    style={xeno.bytesReceived > 0
                                        ? { width: "30%", opacity: 0.6 }
                                        : { width: `${xeno.progress}%` }}
                                />
                            </div>
                            <div className="download-progress-text">
                                {xeno.retryError
                                    ? `Retry ${xeno.retryAttempt}/${xeno.retryMax}: ${xeno.retryError}`
                                    : xeno.bytesReceived > 0
                                        ? `${(xeno.bytesReceived / 1048576).toFixed(1)} MB downloaded`
                                        : xeno.retryAttempt > 1
                                            ? `Attempt ${xeno.retryAttempt}/${xeno.retryMax}...`
                                            : "Preparing download..."}
                            </div>
                        </div>
                    )}

                    {xeno.error && (
                        <div className="download-error">{xeno.error}</div>
                    )}

                    <div className="download-card-actions">
                        {xeno.status === "not_installed" && (
                            <button
                                className="download-btn primary"
                                onClick={handleDownloadXeno}
                                disabled={server.status !== "ready" && server.status !== "installed"}
                            >
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                Download
                            </button>
                        )}
                        {xeno.status === "error" && (
                            <button className="download-btn" onClick={() => handleRetry("xeno")}>
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                Retry
                            </button>
                        )}
                        {xeno.status === "ready" && (
                            <div className="download-ready-badge">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                Ready
                            </div>
                        )}
                    </div>
                </div>
            </div>

            {allReady && (
                <div className="downloads-all-ready">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                    All components ready. You can start using Renegade.
                    <button className="download-btn primary small" onClick={onReady}>Go to Dashboard</button>
                </div>
            )}
        </div>
    );
};

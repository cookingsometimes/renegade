import { useEffect, useRef, useState } from "react";
import "./Downloads.css";

type DownloadStatus = "checking" | "not_installed" | "installed" | "downloading" | "starting" | "ready" | "error";

interface ComponentStatus {
    status: DownloadStatus;
    version: string;
    progress: number;
    bytesReceived: number;
    totalBytes: number;
    error: string;
    retryAttempt: number;
    retryMax: number;
    retryError: string;
}

interface AppUpdateState {
    checking: boolean;
    available: boolean;
    latestVersion: string;
    currentVersion: string;
    portableUrl: string;
    portableFilename: string;
    setupUrl: string;
    setupFilename: string;
    downloading: boolean;
    downloadType: "portable" | "setup" | null;
    bytesReceived: number;
    totalBytes: number;
    downloaded: boolean;
    filePath: string;
    error: string;
}

interface Props {
    serverInstalled: boolean;
    serverRunning: boolean;
    serverVersion: string;
    xenoInstalled: boolean;
    xenoVersion: string;
    velocityInstalled: boolean;
    velocityVersion: string;
    onReady: () => void;
    onInstallComplete: () => void;
}

const formatBytes = (b: number): string => {
    if (b === 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(b) / Math.log(1024));
    return `${(b / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`;
};

export const Downloads = ({ serverInstalled, serverRunning, serverVersion, xenoInstalled, xenoVersion, velocityInstalled, velocityVersion, onReady, onInstallComplete }: Props) => {
    const [server, setServer] = useState<ComponentStatus>({
        status: serverInstalled ? (serverRunning ? "ready" : "installed") : "not_installed",
        version: serverVersion,
        progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "",
    });
    const [xeno, setXeno] = useState<ComponentStatus>({
        status: xenoInstalled ? "ready" : "not_installed",
        version: xenoVersion,
        progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "",
    });
    const [velocity, setVelocity] = useState<ComponentStatus>({
        status: velocityInstalled ? "ready" : "not_installed",
        version: velocityVersion,
        progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "",
    });
    const [appUpdate, setAppUpdate] = useState<AppUpdateState>({
        checking: true, available: false, latestVersion: "", currentVersion: "",
        portableUrl: "", portableFilename: "", setupUrl: "", setupFilename: "",
        downloading: false, downloadType: null,
        bytesReceived: 0, totalBytes: 0, downloaded: false, filePath: "",
        error: "",
    });
    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        window.ContextBridge.onServerDownloadProgress((p: { bytesReceived: number; totalBytes: number }) => {
            setServer((prev) => ({ ...prev, bytesReceived: p.bytesReceived, totalBytes: p.totalBytes }));
        });
        window.ContextBridge.onXenoProgress((p: { bytesReceived: number; totalBytes: number }) => {
            setXeno((prev) => ({ ...prev, bytesReceived: p.bytesReceived, totalBytes: p.totalBytes }));
        });
        window.ContextBridge.onServerRetry((data: { attempt: number; max: number; retrying?: boolean; error?: string }) => {
            setServer((prev) => ({ ...prev, retryAttempt: data.attempt, retryMax: data.max, retryError: data.retrying ? data.error ?? "" : "" }));
        });
        window.ContextBridge.onXenoRetry((data: { attempt: number; max: number; retrying?: boolean; error?: string }) => {
            setXeno((prev) => ({ ...prev, retryAttempt: data.attempt, retryMax: data.max, retryError: data.retrying ? data.error ?? "" : "" }));
        });
        window.ContextBridge.onVelocityProgress((p: { phase: string; bytesReceived: number; totalBytes: number }) => {
            setVelocity((prev) => ({ ...prev, bytesReceived: p.bytesReceived, totalBytes: p.totalBytes }));
        });
        window.ContextBridge.onVelocityRetry((data: { attempt: number; max: number; retrying?: boolean; error?: string }) => {
            setVelocity((prev) => ({ ...prev, retryAttempt: data.attempt, retryMax: data.max, retryError: data.retrying ? data.error ?? "" : "" }));
        });
        window.ContextBridge.onAppUpdateProgress((p: { bytesReceived: number; totalBytes: number }) => {
            setAppUpdate((prev) => ({ ...prev, bytesReceived: p.bytesReceived, totalBytes: p.totalBytes }));
        });
        refreshStatus();
        checkAppUpdate();
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

    useEffect(() => {
        if (velocityInstalled && velocity.status !== "ready") {
            setVelocity((prev) => ({ ...prev, status: "ready", version: velocityVersion }));
        }
    }, [velocityInstalled, velocityVersion]);

    const checkAppUpdate = async () => {
        setAppUpdate((prev) => ({ ...prev, checking: true }));
        try {
            const result = await window.ContextBridge.checkForAppUpdate();
            setAppUpdate((prev) => ({
                ...prev, checking: false,
                available: result.available,
                latestVersion: result.latestVersion,
                currentVersion: result.currentVersion,
                portableUrl: result.portableUrl,
                portableFilename: result.portableFilename,
                setupUrl: result.setupUrl,
                setupFilename: result.setupFilename,
            }));
        } catch {
            setAppUpdate((prev) => ({ ...prev, checking: false }));
        }
    };

    const refreshStatus = async () => {
        try {
            const [srv, xenoExists, xenoVer, velocityExists, velocityVer] = await Promise.all([
                window.ContextBridge.getServerStatus(),
                window.ContextBridge.isXenoInstalled(),
                window.ContextBridge.getXenoVersion(),
                window.ContextBridge.isVelocityInstalled(),
                window.ContextBridge.getVelocityVersion(),
            ]);
            setServer((prev) => ({
                ...prev,
                status: srv.installed ? (srv.running ? "ready" : "installed") : "not_installed",
                version: srv.serverVersion || prev.version,
                error: "",
                retryError: "",
            }));
            setXeno((prev) => ({
                ...prev,
                status: xenoExists ? "ready" : "not_installed",
                version: xenoVer || prev.version,
                error: "",
                retryError: "",
            }));
            setVelocity((prev) => ({
                ...prev,
                status: velocityExists ? "ready" : "not_installed",
                version: velocityVer || prev.version,
                error: "",
                retryError: "",
            }));
        } catch (e) {
            window.ContextBridge.log("ERROR", "Downloads", `refreshStatus failed: ${(e as Error).message}`);
        }
    };

    const handleDownloadServer = async () => {
        setServer((prev) => ({ ...prev, status: "downloading", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" }));
        try {
            const r = await window.ContextBridge.downloadServer();
            if (!r.success) throw new Error(r.error);
            setServer((prev) => ({ ...prev, status: "starting", progress: 0 }));
            await startServerLoop();
            onInstallComplete();
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
        setXeno((prev) => ({ ...prev, status: "downloading", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" }));
        try {
            const r = await window.ContextBridge.downloadXeno();
            if (!r.success) throw new Error(r.error);
            setXeno((prev) => ({ ...prev, status: "ready", progress: 100 }));
            for (let i = 0; i < 10; i++) {
                const ver = await window.ContextBridge.getXenoVersion();
                if (ver) { setXeno((prev) => ({ ...prev, version: ver })); break; }
                await new Promise((r) => setTimeout(r, 1000));
            }
            refreshStatus();
            onInstallComplete();
        } catch (e) {
            setXeno((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const handleStartServer = async () => {
        setServer((prev) => ({ ...prev, status: "starting", progress: 0, error: "" }));
        try { await startServerLoop(); } catch (e) {
            setServer((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const handleRetry = (target: "server" | "xeno") => {
        if (target === "server") {
            setServer({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        } else {
            setXeno({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        }
    };

    const handleRestartServer = async () => {
        setServer((prev) => ({ ...prev, status: "starting", progress: 0, error: "" }));
        try {
            await window.ContextBridge.stopServer();
            await new Promise((r) => setTimeout(r, 1500));
            await startServerLoop();
        } catch (e) {
            setServer((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const handleReinstallServer = async () => {
        await window.ContextBridge.stopServer();
        setServer({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        setTimeout(() => handleDownloadServer(), 100);
    };

    const handleReinstallXeno = async () => {
        setXeno({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        setTimeout(() => handleDownloadXeno(), 100);
    };

    const handleDownloadVelocity = async () => {
        setVelocity((prev) => ({ ...prev, status: "downloading", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" }));
        try {
            const r = await window.ContextBridge.downloadVelocity();
            if (!r.success) throw new Error(r.error);
            setVelocity((prev) => ({ ...prev, status: "ready", progress: 100, version: r.version || prev.version }));
            refreshStatus();
            onInstallComplete();
        } catch (e) {
            setVelocity((prev) => ({ ...prev, status: "error", error: (e as Error).message }));
        }
    };

    const handleRetryVelocity = () => {
        setVelocity({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
    };

    const handleReinstallVelocity = async () => {
        setVelocity({ status: "not_installed", version: "", progress: 0, bytesReceived: 0, totalBytes: 0, error: "", retryAttempt: 0, retryMax: 0, retryError: "" });
        setTimeout(() => handleDownloadVelocity(), 100);
    };

    const handleDownloadAppUpdate = async (type: "portable" | "setup") => {
        const url = type === "portable" ? appUpdate.portableUrl : appUpdate.setupUrl;
        const filename = type === "portable" ? appUpdate.portableFilename : appUpdate.setupFilename;
        setAppUpdate((prev) => ({ ...prev, downloading: true, downloadType: type, downloaded: false, bytesReceived: 0, totalBytes: 0, error: "" }));
        try {
            const r = await window.ContextBridge.downloadAppUpdate(url, filename);
            if (!r.success) throw new Error(r.error);
            setAppUpdate((prev) => ({ ...prev, downloaded: true, filePath: r.filePath || "" }));
        } catch (e) {
            setAppUpdate((prev) => ({ ...prev, downloading: false, downloadType: null, error: (e as Error).message }));
        }
    };

    const handleFinalizeUpdate = () => {
        if (appUpdate.downloadType === "portable") {
            window.ContextBridge.finalizePortable(appUpdate.filePath, appUpdate.latestVersion);
        } else {
            window.ContextBridge.finalizeSetup(appUpdate.filePath, appUpdate.latestVersion);
        }
    };

    const allReady = server.status === "ready" && xeno.status === "ready" && velocity.status === "ready";

    const serverProgress = server.totalBytes > 0 ? (server.bytesReceived / server.totalBytes) * 100 : (server.bytesReceived > 0 ? 30 : server.progress);
    const xenoProgress = xeno.totalBytes > 0 ? (xeno.bytesReceived / xeno.totalBytes) * 100 : (xeno.bytesReceived > 0 ? 30 : xeno.progress);
    const velocityProgress = velocity.totalBytes > 0 ? (velocity.bytesReceived / velocity.totalBytes) * 100 : (velocity.bytesReceived > 0 ? 30 : velocity.progress);
    const appUpdateProgress = appUpdate.totalBytes > 0 ? (appUpdate.bytesReceived / appUpdate.totalBytes) * 100 : 0;

    return (
        <div className="downloads">
            <div className="downloads-header">
                <h2 className="page-title">Downloads</h2>
                <span className="downloads-subtitle">Manage components required by Renegade</span>
            </div>

            <div className="downloads-section">
                <div className="downloads-section-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M12 2L2 7l10 5 10-5-10-5z" /><path d="M2 17l10 5 10-5" /><path d="M2 12l10 5 10-5" /></svg>
                    <span className="downloads-section-title">Renegade</span>
                </div>
                <div className="downloads-grid two-col">
                    <div className="download-card">
                        <div className="download-card-header">
                            <div className="download-card-icon server">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="2" y="2" width="20" height="8" rx="2" /><rect x="2" y="14" width="20" height="8" rx="2" /><line x1="6" y1="6" x2="6.01" y2="6" /><line x1="6" y1="18" x2="6.01" y2="18" /></svg>
                            </div>
                            <div className="download-card-info">
                                <span className="download-card-name">RenegadeServer</span>
                                <span className="download-card-version">{server.version || "Not installed"}</span>
                            </div>
                            <div className={`download-status-badge ${server.status}`}>
                                {server.status === "ready" && "Ready"}
                                {server.status === "installed" && "Installed"}
                                {server.status === "downloading" && "Downloading"}
                                {server.status === "starting" && "Starting"}
                                {server.status === "not_installed" && "Not installed"}
                                {server.status === "error" && "Error"}
                                {server.status === "checking" && "Checking"}
                            </div>
                        </div>

                        {(server.status === "downloading" || server.status === "starting") && (
                            <div className="download-progress-section">
                                <div className="download-progress-bar">
                                    <div className="download-progress-fill" style={{ width: `${serverProgress}%` }} />
                                </div>
                                <div className="download-progress-text">
                                    {server.status === "starting"
                                        ? `Starting... ${Math.round(server.progress)}%`
                                        : server.retryError
                                            ? `Retry ${server.retryAttempt}/${server.retryMax}: ${server.retryError}`
                                            : server.totalBytes > 0
                                                ? `${formatBytes(server.bytesReceived)} / ${formatBytes(server.totalBytes)}`
                                                : `${formatBytes(server.bytesReceived)} downloaded`}
                                </div>
                            </div>
                        )}

                        {server.error && <div className="download-error">{server.error}</div>}

                        <div className="download-card-actions">
                            {server.status === "not_installed" && (
                                <button className="download-btn primary" onClick={handleDownloadServer}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Download
                                </button>
                            )}
                            {server.status === "installed" && (
                                <button className="download-btn primary" onClick={handleStartServer}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="5 3 19 12 5 21 5 3" /></svg>
                                    Start Server
                                </button>
                            )}
                            {server.status === "error" && (
                                <button className="download-btn" onClick={() => handleRetry("server")}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                    Retry
                                </button>
                            )}
                            {server.status === "ready" && (
                                <div className="download-card-actions-row">
                                    <div className="download-ready-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        Running
                                    </div>
                                    <button className="download-btn" onClick={handleRestartServer}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                        Restart
                                    </button>
                                    <button className="download-btn" onClick={handleReinstallServer}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                        Reinstall
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="download-card update-card">
                        <div className="download-card-header">
                            <div className="download-card-icon update">
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                            </div>
                            <div className="download-card-info">
                                <span className="download-card-name">Renegade App</span>
                                <span className="download-card-version">
                                    {appUpdate.checking ? "Checking..." : appUpdate.currentVersion || "Unknown"}
                                </span>
                            </div>
                            <div className={`download-status-badge ${appUpdate.available ? "downloading" : "ready"}`}>
                                {appUpdate.checking ? "Checking" : appUpdate.available ? "Update available" : "Up to date"}
                            </div>
                        </div>

                        {appUpdate.downloading && (
                            <div className="download-progress-section">
                                <div className="download-progress-bar">
                                    <div className="download-progress-fill" style={{ width: `${appUpdateProgress}%` }} />
                                </div>
                                <div className="download-progress-text">
                                    {appUpdate.totalBytes > 0
                                        ? `${formatBytes(appUpdate.bytesReceived)} / ${formatBytes(appUpdate.totalBytes)}`
                                        : `${formatBytes(appUpdate.bytesReceived)} downloaded`}
                                </div>
                            </div>
                        )}

                        {appUpdate.error && <div className="download-error">{appUpdate.error}</div>}

                        <div className="download-card-actions">
                            {appUpdate.checking && (
                                <span className="download-checking-text">Checking for updates...</span>
                            )}
                            {!appUpdate.checking && appUpdate.available && !appUpdate.downloading && !appUpdate.downloaded && (
                                <div className="download-card-actions-row">
                                    <button className="download-btn primary" onClick={() => handleDownloadAppUpdate("portable")}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                        Portable
                                    </button>
                                    <button className="download-btn primary" onClick={() => handleDownloadAppUpdate("setup")}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                        Setup
                                    </button>
                                </div>
                            )}
                            {!appUpdate.checking && appUpdate.available && appUpdate.downloading && !appUpdate.downloaded && (
                                <span className="download-ready-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="12" y1="2" x2="12" y2="6" /><line x1="12" y1="18" x2="12" y2="22" /><line x1="4.93" y1="4.93" x2="7.76" y2="7.76" /><line x1="16.24" y1="16.24" x2="19.07" y2="19.07" /></svg>
                                    Downloading {appUpdate.downloadType === "portable" ? "Portable" : "Setup"}...
                                </span>
                            )}
                            {!appUpdate.checking && appUpdate.available && appUpdate.downloaded && (
                                <button className="download-btn primary" onClick={handleFinalizeUpdate}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="20 6 9 17 4 12" /></svg>
                                    {appUpdate.downloadType === "portable" ? "Show in Explorer" : "Run Installer"}
                                </button>
                            )}
                            {!appUpdate.checking && !appUpdate.available && (
                                <div className="download-ready-badge">
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                    v{appUpdate.currentVersion || "?"}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            <div className="downloads-section">
                <div className="downloads-section-header">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>
                    <span className="downloads-section-title">Executors</span>
                </div>
                <div className="downloads-grid two-col">
                    <div className="download-card">
                        <div className="download-card-header">
                            <div className="download-card-icon xeno">
                                <img src="https://www.xeno.now/images/xeno.png" alt="Xeno" className="download-card-img" />
                            </div>
                            <div className="download-card-info">
                                <span className="download-card-name">Xeno</span>
                                <span className="download-card-version">{xeno.version || "Not installed"}</span>
                            </div>
                            <div className={`download-status-badge ${xeno.status}`}>
                                {xeno.status === "ready" && "Ready"}
                                {xeno.status === "downloading" && "Downloading"}
                                {xeno.status === "not_installed" && "Not installed"}
                                {xeno.status === "error" && "Error"}
                                {xeno.status === "checking" && "Checking"}
                            </div>
                        </div>

                        {xeno.status === "downloading" && (
                            <div className="download-progress-section">
                                <div className="download-progress-bar">
                                    <div className="download-progress-fill" style={{ width: `${xenoProgress}%` }} />
                                </div>
                                <div className="download-progress-text">
                                    {xeno.retryError
                                        ? `Retry ${xeno.retryAttempt}/${xeno.retryMax}: ${xeno.retryError}`
                                        : xeno.totalBytes > 0
                                            ? `${formatBytes(xeno.bytesReceived)} / ${formatBytes(xeno.totalBytes)}`
                                            : `${formatBytes(xeno.bytesReceived)} downloaded`}
                                </div>
                            </div>
                        )}

                        {xeno.error && <div className="download-error">{xeno.error}</div>}

                        <div className="download-card-actions">
                            {xeno.status === "not_installed" && (
                                <button className="download-btn primary" onClick={handleDownloadXeno} disabled={server.status !== "ready" && server.status !== "installed"}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Download
                                </button>
                            )}
                            {xeno.status === "error" && (
                                <button className="download-btn" onClick={() => handleRetry("xeno")}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                    Retry
                                </button>
                            )}
                            {xeno.status === "ready" && (
                                <div className="download-card-actions-row">
                                    <div className="download-ready-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        Ready
                                    </div>
                                    <button className="download-btn" onClick={handleReinstallXeno}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                        Reinstall
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="download-card">
                        <div className="download-card-header">
                            <div className="download-card-icon velocity">
                                <img src="https://cdn.discordapp.com/icons/943223926509699072/30a91456d27f02fc4623b75495a87cce.webp?size=1024" alt="Velocity" className="download-card-img rounded" />
                            </div>
                            <div className="download-card-info">
                                <span className="download-card-name">Velocity</span>
                                <span className="download-card-version">{velocity.version || "Not installed"}</span>
                            </div>
                            <div className={`download-status-badge ${velocity.status}`}>
                                {velocity.status === "ready" && "Ready"}
                                {velocity.status === "downloading" && "Downloading"}
                                {velocity.status === "not_installed" && "Not installed"}
                                {velocity.status === "error" && "Error"}
                            </div>
                        </div>

                        {velocity.status === "downloading" && (
                            <div className="download-progress-section">
                                <div className="download-progress-bar">
                                    <div className="download-progress-fill velocity" style={{ width: `${velocityProgress}%` }} />
                                </div>
                                <div className="download-progress-text">
                                    {velocity.retryError
                                        ? `Retry ${velocity.retryAttempt}/${velocity.retryMax}: ${velocity.retryError}`
                                        : velocity.totalBytes > 0
                                            ? `${formatBytes(velocity.bytesReceived)} / ${formatBytes(velocity.totalBytes)}`
                                            : `${formatBytes(velocity.bytesReceived)} downloaded`}
                                </div>
                            </div>
                        )}

                        {velocity.error && <div className="download-error">{velocity.error}</div>}

                        <div className="download-card-actions">
                            {velocity.status === "not_installed" && (
                                <button className="download-btn primary velocity" onClick={handleDownloadVelocity}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                                    Download
                                </button>
                            )}
                            {velocity.status === "error" && (
                                <button className="download-btn" onClick={handleRetryVelocity}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                    Retry
                                </button>
                            )}
                            {velocity.status === "ready" && (
                                <div className="download-card-actions-row">
                                    <div className="download-ready-badge">
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                                        Ready
                                    </div>
                                    <button className="download-btn" onClick={handleReinstallVelocity}>
                                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="23 4 23 10 17 10" /><path d="M20.49 15a9 9 0 11-2.12-9.36L23 10" /></svg>
                                        Reinstall
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>

            {allReady && (
                <div className="downloads-all-ready">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><polyline points="20 6 9 17 4 12" /></svg>
                    All components ready.
                    <button className="download-btn primary small" onClick={onReady}>Go to Dashboard</button>
                </div>
            )}
        </div>
    );
};

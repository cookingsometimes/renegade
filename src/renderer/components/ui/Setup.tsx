import { useEffect, useRef, useState } from "react";
import "./Setup.css";

type Step = "check" | "download-server" | "start-server" | "download-xeno" | "ready";

const STEPS: { id: Step; label: string }[] = [
    { id: "download-server", label: "Download server" },
    { id: "start-server", label: "Start server" },
    { id: "download-xeno", label: "Download Xeno" },
];

interface Props {
    onReady: () => void;
}

export const Setup = ({ onReady }: Props) => {
    const [step, setStep] = useState<Step>("check");
    const [error, setError] = useState("");
    const [progress, setProgress] = useState(0);
    const [bytesReceived, setBytesReceived] = useState(0);
    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        window.ContextBridge.onDownloadProgress((b: number) => setBytesReceived(b));
        window.ContextBridge.onXenoProgress((b: number) => setBytesReceived(b));
        checkStatus();
    }, []);

    const checkStatus = async () => {
        try {
            const [server, xeno] = await Promise.all([
                window.ContextBridge.getServerStatus(),
                window.ContextBridge.isXenoInstalled(),
            ]);

            if (server.installed && xeno) {
                setStep("start-server");
                autoStart();
                return;
            }

            if (server.installed) {
                setStep("start-server");
                autoStart();
                return;
            }

            setStep("download-server");
        } catch {
            setStep("download-server");
        }
    };

    const autoStart = async () => {
        try {
            for (let i = 0; i < 30; i++) {
                setProgress(Math.min(90, (i / 30) * 100) + 10);
                const s = await window.ContextBridge.startServer();
                if (s.success) {
                    setStep("ready");
                    setTimeout(() => onReady(), 800);
                    return;
                }
                if (i < 29) await new Promise((r) => setTimeout(r, 1000));
            }
            throw new Error("Server did not start");
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const handleDownloadServer = async () => {
        setProgress(0);
        setBytesReceived(0);
        try {
            setProgress(-1);
            const r = await window.ContextBridge.downloadServer();
            if (!r.success) throw new Error(r.error);
            setProgress(100);
            setStep("start-server");
            startServerFlow();
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const startServerFlow = async () => {
        setProgress(0);
        try {
            for (let i = 0; i < 30; i++) {
                setProgress(Math.min(90, (i / 30) * 100) + 10);
                const s = await window.ContextBridge.startServer();
                if (s.success) {
                    setProgress(100);
                    downloadXenoFlow();
                    return;
                }
                if (i < 29) await new Promise((r) => setTimeout(r, 1000));
            }
            throw new Error("Server did not start");
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const downloadXenoFlow = async () => {
        setStep("download-xeno");
        setProgress(0);
        setBytesReceived(0);
        try {
            const isXeno = await window.ContextBridge.isXenoInstalled();
            if (isXeno) {
                setStep("ready");
                setTimeout(() => onReady(), 800);
                return;
            }
            setProgress(-1);
            const r = await window.ContextBridge.downloadXeno();
            if (!r.success) throw new Error(r.error);
            setProgress(100);
            setStep("ready");
            setTimeout(() => onReady(), 800);
        } catch (e) {
            setError((e as Error).message);
        }
    };

    const currentIdx = STEPS.findIndex((s) => s.id === step);
    const doneSteps = STEPS.slice(0, currentIdx).map((s) => s.id);

    return (
        <div className="setup">
            <div className="setup-card">
                <div className="setup-icon">
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                        <polyline points="7 10 12 15 17 10" />
                        <line x1="12" y1="15" x2="12" y2="3" />
                    </svg>
                </div>

                <div className="setup-title">Setup Renegade</div>
                <div className="setup-subtitle">We need to download a few things to get started.</div>

                {step !== "check" && step !== "ready" && (
                    <div className="setup-steps">
                        {STEPS.map((s) => {
                            const isActive = s.id === step;
                            const isDone = doneSteps.includes(s.id);
                            return (
                                <div key={s.id} className={`setup-step ${isActive ? "active" : ""} ${isDone ? "done" : ""}`}>
                                    <div className="setup-step-icon">
                                        {isDone ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                                        ) : isActive ? (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" /></svg>
                                        ) : (
                                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10" /></svg>
                                        )}
                                    </div>
                                    <span className="setup-step-text">{s.label}</span>
                                </div>
                            );
                        })}
                    </div>
                )}

                {step === "check" && (
                    <div className="setup-btn" style={{ opacity: 0.6, pointerEvents: "none" }}>
                        Checking...
                    </div>
                )}

                {step === "download-server" && !error && (
                    <>
                        {progress === -1 && bytesReceived > 0 && (
                            <div className="setup-subtitle" style={{ fontSize: 11 }}>
                                {(bytesReceived / 1048576).toFixed(1)} MB downloaded
                            </div>
                        )}
                        <div className="setup-progress">
                            <div className="setup-progress-fill" style={progress === -1 ? { width: "30%", opacity: 0.5 } : { width: `${progress}%` }} />
                        </div>
                        <button className="setup-btn" onClick={handleDownloadServer}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" /></svg>
                            Download Server
                        </button>
                    </>
                )}

                {step === "start-server" && !error && (
                    <>
                        <div className="setup-progress">
                            <div className="setup-progress-fill" style={{ width: `${progress}%` }} />
                        </div>
                        <div className="setup-btn" style={{ opacity: 0.6, pointerEvents: "none" }}>
                            Starting server...
                        </div>
                    </>
                )}

                {step === "download-xeno" && !error && (
                    <>
                        {progress === -1 && bytesReceived > 0 && (
                            <div className="setup-subtitle" style={{ fontSize: 11 }}>
                                {(bytesReceived / 1048576).toFixed(1)} MB downloaded
                            </div>
                        )}
                        <div className="setup-progress">
                            <div className="setup-progress-fill" style={progress === -1 ? { width: "30%", opacity: 0.5 } : { width: `${progress}%` }} />
                        </div>
                        <div className="setup-btn" style={{ opacity: 0.6, pointerEvents: "none" }}>
                            Downloading Xeno...
                        </div>
                    </>
                )}

                {error && (
                    <>
                        <div className="setup-error">{error}</div>
                        <button className="setup-btn" onClick={() => { setError(""); setStep("check"); checkStatus(); }}>
                            Try Again
                        </button>
                    </>
                )}

                {step === "ready" && (
                    <div className="setup-ready">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                        All set! Launching...
                    </div>
                )}
            </div>
        </div>
    );
};

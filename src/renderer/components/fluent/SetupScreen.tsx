import { Body1, Button, Caption1, Radio, RadioGroup, Spinner, Title1, makeStyles, tokens } from "@fluentui/react-components";
import { ArrowDownloadRegular, CheckmarkCircleRegular, DismissCircleRegular, CloudArrowDownRegular, ServerRegular, PuzzlePieceRegular } from "@fluentui/react-icons";
import { useEffect, useRef, useState } from "react";

type Phase = "select" | "installing" | "ready" | "error";
type InstallStep = "download-server" | "start-server" | "download-xeno";

interface Source {
    name: string;
    url: string;
    filename: string;
}

const STEP_ORDER: InstallStep[] = ["download-server", "start-server", "download-xeno"];

const STEP_META: Record<InstallStep, { label: string; icon: React.FC<{ style?: React.CSSProperties }> }> = {
    "download-server": { label: "Download RenegadeServer", icon: ArrowDownloadRegular },
    "start-server": { label: "Start server", icon: ServerRegular },
    "download-xeno": { label: "Download Xeno", icon: PuzzlePieceRegular },
};

const useStyles = makeStyles({
    root: {
        height: "100vh",
        width: "100vw",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: `linear-gradient(135deg, ${tokens.colorNeutralBackground1} 0%, ${tokens.colorNeutralBackground2} 100%)`,
    },
    card: {
        width: "480px",
        maxWidth: "90vw",
        padding: "48px 40px 40px",
        borderRadius: "20px",
        background: tokens.colorNeutralBackground2,
        boxShadow: `0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "24px",
    },
    iconWrap: {
        width: "72px",
        height: "72px",
        borderRadius: "18px",
        background: `linear-gradient(135deg, ${tokens.colorBrandBackground} 0%, ${tokens.colorBrandBackground2} 100%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: `0 4px 16px ${tokens.colorBrandBackground}33`,
    },
    title: {
        textAlign: "center" as const,
    },
    subtitle: {
        textAlign: "center" as const,
        color: tokens.colorNeutralForeground2,
        marginTop: "-12px",
    },
    sourceList: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "8px",
    },
    sourceCard: {
        width: "100%",
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "14px 18px",
        borderRadius: tokens.borderRadiusLarge,
        background: tokens.colorNeutralBackground1,
        border: `2px solid ${tokens.colorNeutralStroke2}`,
        cursor: "pointer",
        ":hover": {
            background: tokens.colorNeutralBackground3,
        },
    },
    sourceCardSelected: {
        border: `2px solid ${tokens.colorBrandBackground}`,
    },
    sourceRadio: {
        flexShrink: 0,
    },
    sourceInfo: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        flexGrow: 1,
    },
    sourceName: {
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
        color: tokens.colorNeutralForeground1,
    },
    sourceFile: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    downloadBtn: {
        width: "100%",
        height: "48px",
        borderRadius: tokens.borderRadiusLarge,
        fontSize: tokens.fontSizeBase400,
        fontWeight: tokens.fontWeightSemibold,
    },
    stepsContainer: {
        width: "100%",
        display: "flex",
        flexDirection: "column",
        gap: "0",
        position: "relative" as const,
    },
    stepRow: {
        display: "flex",
        alignItems: "center",
        gap: "14px",
        padding: "12px 0",
        position: "relative" as const,
    },
    stepIndicator: {
        width: "36px",
        height: "36px",
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
    },
    stepPending: {
        background: tokens.colorNeutralStroke2,
    },
    stepActive: {
        background: tokens.colorBrandBackground,
        boxShadow: `0 0 0 4px ${tokens.colorBrandBackground}22`,
    },
    stepDone: {
        background: tokens.colorPaletteGreenBackground1,
    },
    stepContent: {
        display: "flex",
        flexDirection: "column",
        gap: "2px",
        flexGrow: 1,
    },
    stepLabel: {
        fontSize: tokens.fontSizeBase300,
        fontWeight: tokens.fontWeightMedium,
        color: tokens.colorNeutralForeground1,
    },
    stepSub: {
        fontSize: tokens.fontSizeBase200,
        color: tokens.colorNeutralForeground3,
    },
    progressBar: {
        width: "100%",
        height: "6px",
        borderRadius: "3px",
        background: tokens.colorNeutralStroke2,
        overflow: "hidden",
        marginTop: "8px",
    },
    progressFill: {
        height: "100%",
        borderRadius: "3px",
        background: `linear-gradient(90deg, ${tokens.colorBrandBackground}, ${tokens.colorBrandBackground2})`,
    },
    errorBox: {
        width: "100%",
        padding: "16px",
        borderRadius: tokens.borderRadiusLarge,
        background: `${tokens.colorPaletteRedBackground1}33`,
        border: `1px solid ${tokens.colorPaletteRedBorder1}44`,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "12px",
    },
    readyBox: {
        width: "100%",
        padding: "20px",
        borderRadius: tokens.borderRadiusLarge,
        background: `${tokens.colorPaletteGreenBackground1}33`,
        border: `1px solid ${tokens.colorPaletteGreenBorder1}44`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "10px",
    },
});

interface Props {
    onReady: () => void;
}

function formatBytes(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1048576).toFixed(1)} MB`;
}

export const SetupScreen = ({ onReady }: Props) => {
    const styles = useStyles();
    const [phase, setPhase] = useState<Phase>("select");
    const [sources, setSources] = useState<Source[]>([]);
    const [selectedUrl, setSelectedUrl] = useState("");
    const [currentStep, setCurrentStep] = useState<InstallStep>("download-server");
    const [doneSteps, setDoneSteps] = useState<Set<InstallStep>>(new Set());
    const [progress, setProgress] = useState(0);
    const [bytesReceived, setBytesReceived] = useState(0);
    const [error, setError] = useState("");
    const initRef = useRef(false);

    useEffect(() => {
        if (initRef.current) return;
        initRef.current = true;
        loadSources();
        window.ContextBridge.onSetupDownloadProgress((bytes) => {
            setBytesReceived(bytes);
        });
        window.ContextBridge.onXenoDownloadProgress((bytes) => {
            setBytesReceived(bytes);
        });
    }, []);

    const loadSources = async () => {
        const res = await window.ContextBridge.setupGetSources();
        if (res.error || res.sources.length === 0) {
            setError(res.error || "No download sources available");
            setPhase("error");
            return;
        }
        setSources(res.sources);
        setSelectedUrl(res.sources[0].url);
    };

    const markDone = (step: InstallStep) => {
        setDoneSteps((prev) => new Set(prev).add(step));
    };

    const handleStart = async () => {
        setPhase("installing");
        setCurrentStep("download-server");
        setProgress(0);
        setBytesReceived(0);

        const src = sources.find((s) => s.url === selectedUrl);
        if (!src) {
            setError("No source selected");
            setPhase("error");
            return;
        }

        try {
            setProgress(-1);
            const dl = await window.ContextBridge.setupDownloadFromSource(src.url, src.filename);
            if (!dl.success) throw new Error(dl.error);
            setProgress(100);
            markDone("download-server");
        } catch (e) {
            setError((e as Error).message);
            setPhase("error");
            return;
        }

        setCurrentStep("start-server");
        setProgress(0);
        try {
            for (let i = 0; i < 60; i++) {
                setProgress(Math.min(90, (i / 60) * 100) + 10);
                const s = await window.ContextBridge.setupStartServer();
                if (s.success) {
                    setProgress(100);
                    markDone("start-server");
                    break;
                }
                if (i < 59) await new Promise((r) => setTimeout(r, 1000));
                else throw new Error("Server did not start in time");
            }
        } catch (e) {
            setError((e as Error).message);
            setPhase("error");
            return;
        }

        setCurrentStep("download-xeno");
        setProgress(0);
        setBytesReceived(0);
        try {
            setProgress(-1);
            const result = await window.ContextBridge.downloadXeno();
            if (!result.success) throw new Error(result.error);
            setProgress(100);
            markDone("download-xeno");
        } catch (e) {
            setError((e as Error).message);
            setPhase("error");
            return;
        }

        setPhase("ready");
        setTimeout(() => onReady(), 1200);
    };

    const handleRetry = () => {
        setPhase("select");
        setDoneSteps(new Set());
        setProgress(0);
        setError("");
        loadSources();
    };

    return (
        <div className={styles.root}>
            <div className={styles.card}>
                <div className={styles.iconWrap}>
                    <CloudArrowDownRegular style={{ fontSize: 36, color: "white" }} />
                </div>
                <Title1 className={styles.title}>Setup Renegade</Title1>
                {phase === "select" && (
                    <Body1 className={styles.subtitle}>
                        Choose a source and install the server + Xeno to get started.
                    </Body1>
                )}

                {phase === "select" && sources.length > 0 && (
                    <>
                        <div className={styles.sourceList}>
                            <RadioGroup
                                value={selectedUrl}
                                onChange={(_, data) => setSelectedUrl(data.value)}
                            >
                                {sources.map((src) => (
                                    <div
                                        key={src.url}
                                        className={`${styles.sourceCard} ${selectedUrl === src.url ? styles.sourceCardSelected : ""}`}
                                        onClick={() => setSelectedUrl(src.url)}
                                    >
                                        <div className={styles.sourceRadio}>
                                            <Radio value={src.url} style={{ pointerEvents: "none" }} />
                                        </div>
                                        <div className={styles.sourceInfo}>
                                            <span className={styles.sourceName}>{src.name}</span>
                                            <Caption1 className={styles.sourceFile}>{src.filename}</Caption1>
                                        </div>
                                    </div>
                                ))}
                            </RadioGroup>
                        </div>
                        <Button
                            appearance="primary"
                            size="large"
                            className={styles.downloadBtn}
                            onClick={handleStart}
                        >
                            <ArrowDownloadRegular /> Download & Install
                        </Button>
                    </>
                )}

                {phase === "select" && sources.length === 0 && error === "" && (
                    <Spinner label="Fetching sources..." labelPosition="after" />
                )}

                {phase === "installing" && (
                    <>
                        <div className={styles.stepsContainer}>
                            {STEP_ORDER.map((step) => {
                                const meta = STEP_META[step];
                                const Icon = meta.icon;
                                const isDone = doneSteps.has(step);
                                const isCurrent = currentStep === step;
                                const _isPending = !isDone && !isCurrent;
                                return (
                                    <div key={step} className={styles.stepRow}>
                                        <div
                                            className={`${styles.stepIndicator} ${isDone ? styles.stepDone : isCurrent ? styles.stepActive : styles.stepPending}`}
                                        >
                                            {isDone ? (
                                                <CheckmarkCircleRegular style={{ fontSize: 18, color: tokens.colorPaletteGreenForeground1 }} />
                                            ) : isCurrent ? (
                                                <Spinner size="tiny" appearance="inverted" />
                                            ) : (
                                                <Icon style={{ fontSize: 16, color: tokens.colorNeutralForeground3 }} />
                                            )}
                                        </div>
                                        <div className={styles.stepContent}>
                                            <span className={styles.stepLabel}>{meta.label}</span>
                                            {isCurrent && progress === -1 && bytesReceived > 0 && (
                                                <Caption1 className={styles.stepSub}>{formatBytes(bytesReceived)} downloaded...</Caption1>
                                            )}
                                            {isCurrent && progress === -1 && bytesReceived === 0 && (
                                                <Caption1 className={styles.stepSub}>Connecting...</Caption1>
                                            )}
                                            {isCurrent && progress >= 0 && (
                                                <Caption1 className={styles.stepSub}>In progress...</Caption1>
                                            )}
                                            {isDone && (
                                                <Caption1 className={styles.stepSub} style={{ color: tokens.colorPaletteGreenForeground1 }}>Done</Caption1>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                        <div className={styles.progressBar}>
                            <div
                                className={styles.progressFill}
                                style={progress === -1
                                    ? { width: "30%", opacity: 0.6 }
                                    : { width: `${progress}%` }
                                }
                            />
                        </div>
                    </>
                )}

                {phase === "error" && (
                    <div className={styles.errorBox}>
                        <DismissCircleRegular style={{ fontSize: 36, color: tokens.colorPaletteRedForeground1 }} />
                        <Body1 style={{ color: tokens.colorPaletteRedForeground1, textAlign: "center" }}>
                            {error}
                        </Body1>
                        <Button appearance="primary" onClick={handleRetry}>
                            Try Again
                        </Button>
                    </div>
                )}

                {phase === "ready" && (
                    <div className={styles.readyBox}>
                        <CheckmarkCircleRegular style={{ fontSize: 24, color: tokens.colorPaletteGreenForeground1 }} />
                        <Body1 style={{ color: tokens.colorPaletteGreenForeground1, fontWeight: tokens.fontWeightSemibold }}>
                            All set! Launching Renegade...
                        </Body1>
                    </div>
                )}
            </div>
        </div>
    );
};

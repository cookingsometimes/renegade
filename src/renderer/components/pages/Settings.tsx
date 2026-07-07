import type { UiMode, SidebarPosition, ExecutorType } from "@common/types";
import "./Settings.css";

interface Props {
    uiMode: UiMode;
    onUiModeChange: (mode: UiMode) => void;
    autoInject: boolean;
    onAutoInjectToggle: () => void;
    alwaysOnTop: boolean;
    onAlwaysOnTopToggle: () => void;
    sidebarPosition: SidebarPosition;
    onSidebarPositionChange: (pos: SidebarPosition) => void;
    executor: ExecutorType;
    onExecutorChange: (executor: ExecutorType) => void;
}

export const Settings = ({ uiMode, onUiModeChange, autoInject, onAutoInjectToggle, alwaysOnTop, onAlwaysOnTopToggle, sidebarPosition, onSidebarPositionChange, executor, onExecutorChange }: Props) => {
    return (
        <div className="settings">
            <div className="page-header">
                <h2 className="page-title">Settings</h2>
            </div>

            <div className="settings-section">
                <div className="settings-section-label">Executor</div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <span className="settings-row-title">Executor DLL</span>
                        <span className="settings-row-desc">Select which executor backend to use. Velocity requires admin privileges.</span>
                    </div>
                    <div className="settings-mode-switch">
                        <button
                            className={`settings-mode-btn ${executor === "xeno" ? "active" : ""}`}
                            onClick={() => onExecutorChange("xeno")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" />
                                <path d="M2 17l10 5 10-5" />
                                <path d="M2 12l10 5 10-5" />
                            </svg>
                            Xeno
                            <span className="settings-tag settings-tag-stable">Stable</span>
                        </button>
                        <button
                            className={`settings-mode-btn ${executor === "velocity" ? "active" : ""}`}
                            onClick={() => onExecutorChange("velocity")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                            </svg>
                            Velocity
                            <span className="settings-tag settings-tag-experimental">Exp</span>
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-label">Appearance</div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <span className="settings-row-title">Interface Mode</span>
                        <span className="settings-row-desc">Switch between sidebar (Full) and top navbar (Compact) layout</span>
                    </div>
                    <div className="settings-mode-switch">
                        <button
                            className={`settings-mode-btn ${uiMode === "full" ? "active" : ""}`}
                            onClick={() => onUiModeChange("full")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="9" y1="3" x2="9" y2="21" />
                            </svg>
                            Full
                        </button>
                        <button
                            className={`settings-mode-btn ${uiMode === "compact" ? "active" : ""}`}
                            onClick={() => onUiModeChange("compact")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                                <line x1="3" y1="9" x2="21" y2="9" />
                            </svg>
                            Compact
                        </button>
                        <button
                            className={`settings-mode-btn ${uiMode === "overlay" ? "active" : ""}`}
                            onClick={() => onUiModeChange("overlay")}
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                <rect x="2" y="3" width="20" height="14" rx="2" />
                                <rect x="8" y="7" width="12" height="10" rx="1" fill="none" />
                            </svg>
                            Overlay
                        </button>
                    </div>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-label">Window</div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <span className="settings-row-title">Always on Top</span>
                        <span className="settings-row-desc">Keep the Renegade window above other windows</span>
                    </div>
                    <button
                        className={`settings-toggle ${alwaysOnTop ? "active" : ""}`}
                        onClick={onAlwaysOnTopToggle}
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>
                {uiMode === "overlay" && (
                    <div className="settings-row" style={{ marginTop: 8 }}>
                        <div className="settings-row-info">
                            <span className="settings-row-title">Sidebar Position</span>
                            <span className="settings-row-desc">Position of the floating sidebar on screen</span>
                        </div>
                        <div className="settings-mode-switch">
                            <button
                                className={`settings-mode-btn ${sidebarPosition === "left" ? "active" : ""}`}
                                onClick={() => onSidebarPositionChange("left")}
                            >
                                Left
                            </button>
                            <button
                                className={`settings-mode-btn ${sidebarPosition === "right" ? "active" : ""}`}
                                onClick={() => onSidebarPositionChange("right")}
                            >
                                Right
                            </button>
                            <button
                                className={`settings-mode-btn ${sidebarPosition === "top" ? "active" : ""}`}
                                onClick={() => onSidebarPositionChange("top")}
                            >
                                Top
                            </button>
                        </div>
                    </div>
                )}
            </div>

            <div className="settings-section">
                <div className="settings-section-label">Injection</div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <span className="settings-row-title">Auto-Inject</span>
                        <span className="settings-row-desc">Automatically inject when a Roblox process is detected</span>
                    </div>
                    <button
                        className={`settings-toggle ${autoInject ? "active" : ""}`}
                        onClick={onAutoInjectToggle}
                    >
                        <span className="settings-toggle-thumb" />
                    </button>
                </div>
            </div>

            <div className="settings-section">
                <div className="settings-section-label">About</div>
                <div className="settings-row">
                    <div className="settings-row-info">
                        <span className="settings-row-title">Renegade</span>
                        <span className="settings-row-desc">Custom UI wrapper for Xeno and Velocity executors</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

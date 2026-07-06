import type { UiMode } from "@common/types";
import "./Settings.css";

interface Props {
    uiMode: UiMode;
    onUiModeChange: (mode: UiMode) => void;
    autoInject: boolean;
    onAutoInjectToggle: () => void;
    alwaysOnTop: boolean;
    onAlwaysOnTopToggle: () => void;
}

export const Settings = ({ uiMode, onUiModeChange, autoInject, onAutoInjectToggle, alwaysOnTop, onAlwaysOnTopToggle }: Props) => {
    return (
        <div className="settings">
            <div className="page-header">
                <h2 className="page-title">Settings</h2>
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
                        <span className="settings-row-desc">Custom UI wrapper for Xeno executor</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

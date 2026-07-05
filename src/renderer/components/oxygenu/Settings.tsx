import type { ThemeId } from "../../themes/ThemeContext";
import { availableThemes } from "../../themes";

const C = {
    bg: "#0d1117",
    surface: "#161b22",
    border: "#21262d",
    accent: "#1f6feb",
    hover: "#1c2128",
    text: "#c9d1d9",
    muted: "#8b949e",
};

interface Props {
    powerUser: boolean;
    onPowerUserChange: (v: boolean) => void;
    themeId?: ThemeId;
    onThemeChange?: (id: ThemeId) => void;
    streamerMode?: boolean;
    onStreamerModeChange?: (v: boolean) => void;
    autoUpdate?: boolean;
    onAutoUpdateChange?: (v: boolean) => void;
}

export const Settings = ({
    powerUser,
    onPowerUserChange,
    themeId = "oxygenu",
    onThemeChange,
    streamerMode = false,
    onStreamerModeChange,
    autoUpdate = true,
    onAutoUpdateChange,
}: Props) => {
    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, padding: 16, overflowY: "auto" }}>
            <div style={{ fontSize: 14, fontWeight: 500, color: C.text, marginBottom: 16 }}>Settings</div>

            <div style={{ maxWidth: 420 }}>
                {/* Theme */}
                <Card title="Theme">
                    {availableThemes.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => onThemeChange?.(t.id)}
                            style={{
                                width: "100%", textAlign: "left", padding: "8px 12px", borderRadius: 8, fontSize: 12, border: "none", cursor: "pointer",
                                display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 2,
                                background: themeId === t.id ? C.accent : C.hover,
                                color: themeId === t.id ? "#fff" : C.text,
                            }}
                        >
                            <span>{t.name}</span>
                            <span style={{ fontSize: 10, opacity: 0.7 }}>{t.description}</span>
                        </button>
                    ))}
                </Card>

                {/* Interface */}
                <Card title="Interface">
                    <Toggle label="Power User" desc="Show technical details" checked={powerUser} onChange={onPowerUserChange} />
                    <Toggle label="Streamer Mode" desc="Hide client names for screen recording" checked={streamerMode} onChange={onStreamerModeChange!} />
                </Card>

                {/* General */}
                <Card title="General">
                    <Toggle label="Auto-update" desc="Automatically download new versions when available" checked={autoUpdate} onChange={(v) => onAutoUpdateChange?.(v)} />
                </Card>

                {powerUser && (
                    <Card title="Server">
                        <InfoRow label="Port" value="13400" />
                        <InfoRow label="Mode" value="DLL" />
                    </Card>
                )}
            </div>
        </div>
    );
};

function Card({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 16, marginBottom: 12 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: C.text, marginBottom: 12 }}>{title}</div>
            {children}
        </div>
    );
}

function Toggle({ label, desc, checked, onChange }: { label: string; desc: string; checked: boolean; onChange: (v: boolean) => void }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
            <div>
                <div style={{ fontSize: 12, color: C.text }}>{label}</div>
                <div style={{ fontSize: 10, color: C.muted }}>{desc}</div>
            </div>
            <button
                onClick={() => onChange(!checked)}
                style={{
                    width: 32, height: 16, borderRadius: 8, border: "none", cursor: "pointer", position: "relative",
                    background: checked ? C.accent : C.border, transition: "background 0.2s",
                }}
            >
                <div style={{
                    width: 12, height: 12, borderRadius: "50%", background: "#fff", position: "absolute", top: 2,
                    left: checked ? 18 : 2, transition: "left 0.2s",
                }} />
            </button>
        </div>
    );
}

function InfoRow({ label, value }: { label: string; value: string }) {
    return (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 12, color: C.muted }}>{label}</span>
            <span style={{ fontSize: 12, color: C.text, fontFamily: "Consolas, monospace" }}>{value}</span>
        </div>
    );
}

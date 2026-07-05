import type { RobloxClientInfo } from "@common/types";

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
    streamerMode: boolean;
}

export const Clients = ({ powerUser, streamerMode }: Props) => {
    const clients: RobloxClientInfo[] = [];

    const stateColor = (state: number) => {
        if (state === 3) return "#3fb950";
        if (state >= 2) return "#e3b341";
        return C.muted;
    };

    const stateLabel = (state: number) => {
        if (state === 3) return "Ready";
        if (state >= 2) return "Active";
        return "Waiting";
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", height: "100%", background: C.bg, padding: 16 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
                <div>
                    <div style={{ fontSize: 14, fontWeight: 500, color: C.text }}>Clients</div>
                    <div style={{ fontSize: 12, color: C.muted }}>
                        {powerUser ? `${clients.length} detected` : `${clients.length} connected`}
                    </div>
                </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 16 }}>
                <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{clients.length}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Total</div>
                </div>
                <div style={{ background: C.surface, borderRadius: 8, border: `1px solid ${C.border}`, padding: 12 }}>
                    <div style={{ fontSize: 20, fontWeight: 600, color: C.text }}>{clients.filter((c) => c.state === 3).length}</div>
                    <div style={{ fontSize: 11, color: C.muted }}>Attached</div>
                </div>
            </div>

            <div style={{ flex: 1, overflowY: "auto" }}>
                {clients.length === 0 ? (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "100%" }}>
                        <div style={{ textAlign: "center", color: C.muted }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={C.muted} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ margin: "0 auto 8px" }}>
                                <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" />
                            </svg>
                            <div style={{ fontSize: 12 }}>No clients detected</div>
                        </div>
                    </div>
                ) : (
                    clients.map((c, i) => (
                        <div key={c.pid} style={{
                            display: "flex", alignItems: "center", justifyContent: "space-between",
                            padding: "8px 12px", borderRadius: 8, background: C.surface, border: `1px solid ${C.border}`, marginBottom: 4,
                        }}>
                            <div style={{ minWidth: 0 }}>
                                <div style={{ fontSize: 13, color: C.text, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                                    {streamerMode ? `Client ${i + 1}` : c.name}
                                </div>
                                <div style={{ fontSize: 11, color: C.muted }}>
                                    {powerUser ? `PID: ${c.pid}` : c.displayText || `Instance ${i + 1}`}
                                </div>
                            </div>
                            <div style={{ fontSize: 11, color: stateColor(c.state), flexShrink: 0 }}>
                                {powerUser ? `State ${c.state}` : stateLabel(c.state)}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

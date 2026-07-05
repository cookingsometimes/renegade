import type { PageId } from "@common/types";
import type { DownloadStateInfo } from "@common/ContextBridge";

const C = {
    bg: "#0d1117",
    border: "#21262d",
    accent: "#1f6feb",
    hover: "#1c2128",
    text: "#c9d1d9",
    muted: "#8b949e",
};

interface Props {
    activePage: PageId;
    onPageChange: (page: PageId) => void;
    xenoVersion: string;
    isAttached: boolean;
    clientCount: number;
    updateAvailable: boolean;
    downloadState: DownloadStateInfo;
    powerUser: boolean;
}

const navItems: { d: string; page: PageId }[] = [
    { d: "M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z M9 22V12h6v10", page: "dashboard" },
    { d: "M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8", page: "scripts" },
    { d: "M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75", page: "clients" },
    { d: "M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z", page: "settings" },
];

export const Sidebar = ({ activePage, onPageChange }: Props) => {
    return (
        <div style={{ width: 48, height: "100%", background: C.bg, borderRight: `1px solid ${C.border}`, display: "flex", flexDirection: "column", alignItems: "center", padding: "12px 0", flexShrink: 0 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                {navItems.map(({ d, page }) => {
                    const active = activePage === page;
                    return (
                        <button
                            key={page}
                            onClick={() => onPageChange(page)}
                            style={{
                                width: 40, height: 40, display: "flex", alignItems: "center", justifyContent: "center",
                                borderRadius: 8, border: "none", cursor: "pointer", transition: "background 0.15s",
                                background: active ? C.accent : "transparent",
                                color: active ? "#fff" : C.muted,
                            }}
                            onMouseEnter={(e) => { if (!active) { e.currentTarget.style.background = C.hover; e.currentTarget.style.color = C.text; } }}
                            onMouseLeave={(e) => { if (!active) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = C.muted; } }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d={d} />
                            </svg>
                        </button>
                    );
                })}
            </div>
        </div>
    );
};

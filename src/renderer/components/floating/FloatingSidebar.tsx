import { useState, useCallback, useRef, useEffect } from "react";
import type { PageId, SidebarPosition } from "@common/types";
import iconUrl from "../../../../build/icon.png";
import "./FloatingSidebar.css";

interface Props {
    activePage: PageId;
    onPageChange: (page: PageId) => void;
    position: SidebarPosition;
    clientCount: number;
    overlay?: boolean;
    onInteractiveEnter?: () => void;
    onInteractiveLeave?: () => void;
    openPanels?: string[];
}

const NAV_ITEMS: { id: PageId; label: string; icon: string }[] = [
    { id: "execute", label: "Execute", icon: "M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" },
    { id: "clients", label: "Clients", icon: "M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" },
    { id: "scripts", label: "Script Hub", icon: "M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" },
    { id: "downloads", label: "Downloads", icon: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" },
];

const SETTINGS_ITEMS: { id: PageId; label: string; icon: string }[] = [
    { id: "settings", label: "Settings", icon: "M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" },
];

export const FloatingSidebar = ({
    activePage,
    onPageChange,
    position,
    clientCount: _clientCount,
    overlay,
    onInteractiveEnter,
    onInteractiveLeave,
    openPanels
}: Props) => {
    const [expanded, setExpanded] = useState(false);
    const [locked, setLocked] = useState(false);
    const expandTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
    const collapseTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

    const cancelAllTimeouts = useCallback(() => {
        if (expandTimeout.current) clearTimeout(expandTimeout.current);
        if (collapseTimeout.current) clearTimeout(collapseTimeout.current);
    }, []);

    const handleMouseEnter = useCallback(() => {
        cancelAllTimeouts();
        onInteractiveEnter?.();
        if (overlay) {
            expandTimeout.current = setTimeout(() => {
                setExpanded(true);
            }, 150);
        } else {
            setExpanded(true);
        }
    }, [overlay, onInteractiveEnter, cancelAllTimeouts]);

    const handleMouseLeave = useCallback(() => {
        cancelAllTimeouts();
        onInteractiveLeave?.();
        if (!locked) {
            collapseTimeout.current = setTimeout(() => {
                setExpanded(false);
            }, overlay ? 400 : 300);
        }
    }, [overlay, onInteractiveLeave, cancelAllTimeouts, locked]);

    useEffect(() => {
        return () => cancelAllTimeouts();
    }, [cancelAllTimeouts]);

    const handleLogoClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setLocked(prev => !prev);
    }, []);

    const handleIndicatorClick = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setExpanded(true);
        setLocked(true);
    }, []);

    const renderItem = (item: { id: PageId; label: string; icon: string }) => {
        const isOpen = openPanels ? openPanels.includes(item.id) : activePage === item.id;
        return (
            <button
                key={item.id}
                className={`floating-sidebar-item ${isOpen ? "active" : ""}`}
                onClick={(e) => {
                    e.stopPropagation();
                    onPageChange(item.id);
                }}
                title={!expanded ? item.label : undefined}
            >
                <span className="floating-sidebar-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                        <path d={item.icon} />
                    </svg>
                </span>
                <span className="floating-sidebar-label">{item.label}</span>
            </button>
        );
    };

    return (
        <div
            className={`floating-sidebar ${position} ${expanded ? "expanded" : "collapsed"} ${overlay ? "overlay-mode" : ""} ${locked ? "locked" : ""}`}
            onMouseEnter={handleMouseEnter}
            onMouseLeave={handleMouseLeave}
            onClick={overlay && !expanded ? handleIndicatorClick : undefined}
        >
            {overlay && !expanded && (
                <div className="floating-sidebar-indicator-bar" />
            )}

            {overlay && expanded && (
                <div 
                    className={`floating-sidebar-logo-container ${locked ? "locked" : ""}`}
                    onClick={handleLogoClick}
                    title={locked ? "Click to Unlock Auto-hide" : "Click to Lock Expanded Menu"}
                    style={{ pointerEvents: "auto", cursor: "pointer" }}
                >
                    <img src={iconUrl} alt="Renegade Logo" className="floating-sidebar-logo" />
                </div>
            )}

            <div className="floating-sidebar-inner">
                <div className="floating-sidebar-section">
                    {NAV_ITEMS.map(renderItem)}
                </div>

                <div className="floating-sidebar-spacer" />

                <div className="floating-sidebar-section">
                    {SETTINGS_ITEMS.map(renderItem)}
                </div>
            </div>
        </div>
    );
};

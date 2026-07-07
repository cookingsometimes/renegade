import { useRef, useCallback, useState, useEffect } from "react";
import "./FloatingPanel.css";

interface Props {
    id: string;
    title: string;
    x: number;
    y: number;
    width: number;
    height: number;
    minWidth?: number;
    minHeight?: number;
    onMove: (id: string, x: number, y: number) => void;
    onResize: (id: string, w: number, h: number) => void;
    onFocus: (id: string) => void;
    zIndex: number;
    children: React.ReactNode;
    onInteractiveEnter?: () => void;
    onInteractiveLeave?: () => void;
}

export const FloatingPanel = ({ id, title, x, y, width, height, minWidth = 320, minHeight = 200, onMove, onResize, onFocus, zIndex, children, onInteractiveEnter, onInteractiveLeave }: Props) => {
    const [dragging, setDragging] = useState(false);
    const [resizing, setResizing] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const resizeStart = useRef({ x: 0, y: 0, w: 0, h: 0 });

    const handleDragStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        setDragging(true);
        dragOffset.current = { x: e.clientX - x, y: e.clientY - y };
        onFocus(id);
    }, [x, y, id, onFocus]);

    const handleResizeStart = useCallback((e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setResizing(true);
        resizeStart.current = { x: e.clientX, y: e.clientY, w: width, h: height };
        onFocus(id);
    }, [width, height, id, onFocus]);

    useEffect(() => {
        if (!dragging && !resizing) return;
        const handleMove = (e: MouseEvent) => {
            if (dragging) {
                onMove(id, Math.max(0, e.clientX - dragOffset.current.x), Math.max(0, e.clientY - dragOffset.current.y));
            }
            if (resizing) {
                onResize(id, Math.max(minWidth, resizeStart.current.w + e.clientX - resizeStart.current.x), Math.max(minHeight, resizeStart.current.h + e.clientY - resizeStart.current.y));
            }
        };
        const handleUp = () => { setDragging(false); setResizing(false); };
        document.addEventListener("mousemove", handleMove);
        document.addEventListener("mouseup", handleUp);
        return () => { document.removeEventListener("mousemove", handleMove); document.removeEventListener("mouseup", handleUp); };
    }, [dragging, resizing, id, onMove, onResize, minWidth, minHeight]);

    return (
        <div className="floating-panel" style={{ left: x, top: y, width, height, zIndex }} onMouseDown={() => onFocus(id)} onMouseEnter={onInteractiveEnter} onMouseLeave={onInteractiveLeave}>
            <div className="floating-panel-header" onMouseDown={handleDragStart}>
                <span className="floating-panel-title">{title}</span>
            </div>
            <div className="floating-panel-content">{children}</div>
            <div className="floating-panel-resize-handle" onMouseDown={handleResizeStart} />
        </div>
    );
};

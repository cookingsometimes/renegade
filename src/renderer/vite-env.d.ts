import type { ContextBridge } from "./ContextBridge";

declare global {
    interface Window {
        ContextBridge: ContextBridge;
        electron: {
            minimize: () => void;
            maximize: () => void;
            close: () => void;
        };
    }
}

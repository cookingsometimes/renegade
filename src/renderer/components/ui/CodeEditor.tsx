import { useEffect, useRef } from "react";
import * as monaco from "monaco-editor";

self.MonacoEnvironment = {
    getWorker: () => {
        const code = [
            "self.MonacoEnvironment = { baseUrl: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.53.0/min/' };",
            "importScripts('https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.53.0/min/vs/base/worker/workerMain.js');",
        ].join("\n");
        const blob = new Blob([code], { type: "application/javascript" });
        return new Worker(URL.createObjectURL(blob));
    },
};

monaco.editor.defineTheme("renegade-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
        { token: "comment", foreground: "6a6a82", fontStyle: "italic" },
        { token: "keyword", foreground: "c678dd" },
        { token: "string", foreground: "98c379" },
        { token: "number", foreground: "d19a66" },
        { token: "type", foreground: "e5c07b" },
        { token: "function", foreground: "61afef" },
        { token: "variable", foreground: "e06c75" },
        { token: "operator", foreground: "56b6c2" },
    ],
    colors: {
        "editor.background": "#0f0f14",
        "editor.foreground": "#e8e8f0",
        "editor.lineHighlightBackground": "#1e1e2850",
        "editor.selectionBackground": "#7c5cff30",
        "editorCursor.foreground": "#7c5cff",
        "editorLineNumber.foreground": "#4a4a62",
        "editorLineNumber.activeForeground": "#7c5cff",
        "editor.inactiveSelectionBackground": "#7c5cff15",
    },
});

interface Props {
    value: string;
    onChange: (value: string) => void;
    language?: string;
}

export const CodeEditor = ({ value, onChange, language = "lua" }: Props) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<monaco.editor.IStandaloneCodeEditor | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!containerRef.current) return;

        const editor = monaco.editor.create(containerRef.current, {
            value,
            language,
            theme: "renegade-dark",
            fontSize: 13,
            fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
            minimap: { enabled: false },
            scrollBeyondLastLine: false,
            padding: { top: 16, bottom: 16 },
            lineNumbers: "on",
            renderLineHighlight: "line",
            bracketPairColorization: { enabled: true },
            smoothScrolling: true,
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            tabSize: 4,
            wordWrap: "on",
            overviewRulerLanes: 0,
            hideCursorInOverviewRuler: true,
            overviewRulerBorder: false,
            automaticLayout: true,
            scrollbar: {
                vertical: "auto",
                horizontal: "auto",
                verticalScrollbarSize: 6,
                horizontalScrollbarSize: 6,
            },
        });

        editorRef.current = editor;

        editor.onDidChangeModelContent(() => {
            onChangeRef.current(editor.getValue());
        });

        return () => {
            editor.dispose();
            editorRef.current = null;
        };
    }, []);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const current = editor.getValue();
        if (current !== value) {
            editor.setValue(value);
        }
    }, [value]);

    useEffect(() => {
        const editor = editorRef.current;
        if (!editor) return;
        const model = editor.getModel();
        if (model) {
            monaco.editor.setModelLanguage(model, language);
        }
    }, [language]);

    return <div ref={containerRef} style={{ width: "100%", height: "100%", overflow: "hidden" }} />;
};

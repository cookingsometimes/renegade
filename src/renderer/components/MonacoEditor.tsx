import { useEffect, useRef } from "react";

interface MonacoWindow {
    require: { config: (opts: Record<string, unknown>) => void; (deps: string[], cb: () => void): void };
    monaco: { editor: { create: (el: HTMLElement, opts: Record<string, unknown>) => MonacoEditorInstance } };
}

interface MonacoEditorInstance {
    getValue: () => string;
    setValue: (val: string) => void;
    onDidChangeModelContent: (cb: () => void) => void;
    dispose: () => void;
}

const win = window as unknown as Partial<MonacoWindow>;

let monacoLoaded = false;
let monacoPromise: Promise<void> | null = null;

const loadMonaco = (): Promise<void> => {
    if (monacoLoaded) return Promise.resolve();
    if (monacoPromise) return monacoPromise;

    monacoPromise = new Promise<void>((resolve) => {
        const loader = win.require;
        if (!loader) {
            resolve();
            return;
        }
        loader.config({ paths: { vs: "https://cdn.jsdelivr.net/npm/monaco-editor@0.52.2/min/vs" } });
        loader(["vs/editor/editor.main"], () => {
            monacoLoaded = true;
            resolve();
        });
    });
    return monacoPromise;
};

interface MonacoEditorProps {
    value: string;
    onChange: (value: string) => void;
    language?: string;
    theme?: string;
}

export const MonacoEditor = ({ value, onChange, language = "lua", theme = "vs-dark" }: MonacoEditorProps) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const editorRef = useRef<MonacoEditorInstance | null>(null);
    const onChangeRef = useRef(onChange);
    onChangeRef.current = onChange;

    useEffect(() => {
        if (!containerRef.current) return;

        loadMonaco().then(() => {
            if (!containerRef.current || !win.monaco) return;

            const editor = win.monaco.editor.create(containerRef.current, {
                value,
                language,
                theme,
                minimap: { enabled: false },
                fontSize: 13,
                fontFamily: "Consolas, monospace",
                lineNumbers: "on",
                scrollBeyondLastLine: false,
                automaticLayout: true,
                tabSize: 4,
                wordWrap: "on",
                padding: { top: 8, bottom: 8 },
                smoothScrolling: true,
                cursorBlinking: "smooth",
                cursorSmoothCaretAnimation: "on",
                renderLineHighlight: "gutter",
                bracketPairColorization: { enabled: false },
                guides: { indentation: false },
            });

            editorRef.current = editor;

            editor.onDidChangeModelContent(() => {
                onChangeRef.current(editor.getValue());
            });
        });

        return () => {
            if (editorRef.current) {
                editorRef.current.dispose();
                editorRef.current = null;
            }
        };
    }, []);

    useEffect(() => {
        if (editorRef.current && editorRef.current.getValue() !== value) {
            editorRef.current.setValue(value);
        }
    }, [value]);

    return <div ref={containerRef} style={{ width: "100%", height: "100%" }} />;
};

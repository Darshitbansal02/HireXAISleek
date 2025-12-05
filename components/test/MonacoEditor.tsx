import React from 'react';
import Editor, { OnMount } from '@monaco-editor/react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card } from "@/components/ui/card";

interface MonacoEditorProps {
    language: string;
    setLanguage: (lang: string) => void;
    code: string;
    setCode: (code: string) => void;
    readOnly?: boolean;
    wordWrap?: "off" | "on" | "wordWrapColumn" | "bounded";
    allowCopy?: boolean;
    theme?: "vs-dark" | "light";
    fontSize?: number;
}

const LANGUAGES = [
    { id: "python", name: "Python 3" },
    { id: "javascript", name: "JavaScript" },
    { id: "cpp", name: "C++" },
    { id: "java", name: "Java" },
];

const MonacoEditor: React.FC<MonacoEditorProps> = ({
    language,
    setLanguage,
    code,
    setCode,
    readOnly = false,
    wordWrap = "off",
    allowCopy = false,
    theme = "vs-dark",
    fontSize = 14,
}) => {
    const editorRef = React.useRef<any>(null);

    const handleEditorDidMount: OnMount = (editor, monaco) => {
        editorRef.current = editor;

        // Optional: Configure editor settings here
        editor.updateOptions({
            minimap: { enabled: false },
            fontSize: fontSize,
            scrollBeyondLastLine: false,
            automaticLayout: true,
            contextmenu: allowCopy, // Enable/Disable right-click menu based on allowCopy
            wordWrap: wordWrap as "off" | "on" | "wordWrapColumn" | "bounded",
            readOnly: readOnly,
            // Enhanced settings
            autoIndent: "full",
            formatOnType: true,
            formatOnPaste: true,
            bracketPairColorization: {
                enabled: true,
            },
            cursorBlinking: "smooth",
            cursorSmoothCaretAnimation: "on",
            smoothScrolling: true,
        });

        if (!allowCopy) {
            // Disable Copy/Paste commands only if allowCopy is false
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyC, () => {
                // Block Copy
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyV, () => {
                // Block Paste
            });
            editor.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyX, () => {
                // Block Cut
            });
        }

        // Disable Command Palette (F1)
        editor.addCommand(monaco.KeyCode.F1, () => { });
    };

    React.useEffect(() => {
        if (editorRef.current) {
            editorRef.current.updateOptions({
                readOnly: readOnly,
                wordWrap: wordWrap,
                contextmenu: allowCopy,
                fontSize: fontSize,
            });
        }
    }, [readOnly, wordWrap, allowCopy, fontSize]);

    return (
        <Card className="flex flex-col h-full border-0 rounded-none bg-[#1e1e1e]">
            <div className="flex items-center justify-between px-4 py-2 bg-[#252526] border-b border-[#3e3e42]">
                <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-gray-400">Language:</span>
                    <Select value={language} onValueChange={setLanguage} disabled={readOnly}>
                        <SelectTrigger className="w-[140px] h-8 bg-[#3e3e42] border-none text-white text-xs">
                            <SelectValue placeholder="Select Language" />
                        </SelectTrigger>
                        <SelectContent className="bg-[#252526] border-[#3e3e42] text-white">
                            {LANGUAGES.map((lang) => (
                                <SelectItem key={lang.id} value={lang.id} className="text-xs hover:bg-[#3e3e42] focus:bg-[#3e3e42]">
                                    {lang.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
                <div className="text-xs text-gray-500">
                    {readOnly ? "Read Only" : "Editor Ready"}
                </div>
            </div>
            <div className="flex-1 min-h-[400px]">
                <Editor
                    height="100%"
                    language={language}
                    value={code}
                    theme={theme}
                    onChange={(value) => setCode(value || "")}
                    onMount={handleEditorDidMount}
                    options={{
                        readOnly: readOnly,
                        fontFamily: "'Fira Code', 'Consolas', monospace",
                        fontLigatures: true,
                        wordWrap: wordWrap as "off" | "on" | "wordWrapColumn" | "bounded",
                        fontSize: fontSize,
                    }}
                />
            </div>
        </Card>
    );
};

export default MonacoEditor;

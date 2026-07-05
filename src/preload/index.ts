import type { ContextBridge } from "@common/ContextBridge";
import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld(
    "ContextBridge",
    <ContextBridge>{
        onNativeThemeChanged: (callback: () => void) =>
            ipcRenderer.on("nativeThemeChanged", callback),

        getXenoStatus: () => ipcRenderer.invoke("xeno:getStatus"),
        getDownloadState: () => ipcRenderer.invoke("xeno:getDownloadState"),
        downloadXeno: () => ipcRenderer.invoke("xeno:download"),
        onXenoDownloadProgress: (callback: (bytes: number) => void) => ipcRenderer.on("xeno:downloadProgress", (_e, bytes: number) => callback(bytes)),
        isXenoDownloaded: () => ipcRenderer.invoke("xeno:isDownloaded"),
        getXenoVersion: () => ipcRenderer.invoke("xeno:getVersion"),
        downloadServer: () => ipcRenderer.invoke("xeno:downloadServer"),
        setupGetSources: () => ipcRenderer.invoke("setup:getSources"),
        setupDownloadFromSource: (url: string, filename: string) => ipcRenderer.invoke("setup:downloadFromSource", url, filename),
        onSetupDownloadProgress: (callback: (bytes: number) => void) => ipcRenderer.on("setup:downloadProgress", (_e, bytes: number) => callback(bytes)),
        setupStartServer: () => ipcRenderer.invoke("setup:startServer"),
        getServerVersion: () => ipcRenderer.invoke("server:getVersion"),
        checkServerUpdate: () => ipcRenderer.invoke("server:checkUpdate"),
        updateServer: () => ipcRenderer.invoke("server:update"),

        onDownloadState: (callback) =>
            ipcRenderer.on("xeno:downloadState", (_e, info) => callback(info)),
        onDownloadLog: (callback) =>
            ipcRenderer.on("xeno:downloadLog", (_e, msg) => callback(msg)),

        checkForUpdates: () => ipcRenderer.invoke("xeno:updateCheck"),
        onUpdateAvailable: (callback) =>
            ipcRenderer.on("xeno:updateAvailable", (_e, info) => callback(info)),

        getClients: () => ipcRenderer.invoke("xeno:getClients"),
        onClientsChanged: (callback) =>
            ipcRenderer.on("xeno:clientsChanged", (_e, clients) => callback(clients)),

        searchScripts: (query: string) => ipcRenderer.invoke("xeno:searchScripts", query),
        getTrendingScripts: () => ipcRenderer.invoke("xeno:trending"),

        clipboardRead: () => ipcRenderer.invoke("clipboard:read"),
        clipboardWrite: (text: string) => ipcRenderer.invoke("clipboard:write", text),
        clipboardClear: () => ipcRenderer.invoke("clipboard:clear"),

        saveScript: (name: string, content: string) =>
            ipcRenderer.invoke("script:save", name, content),
        loadScripts: () => ipcRenderer.invoke("script:loadAll"),
        deleteScript: (name: string) => ipcRenderer.invoke("script:delete", name),

        getExecutionLog: () => ipcRenderer.invoke("xeno:getExecutionLog"),

        getXenoDir: () => ipcRenderer.invoke("xeno:getXenoDir"),
        getScriptsDir: () => ipcRenderer.invoke("xeno:getScriptsDir"),

        getLogs: () => ipcRenderer.invoke("xeno:getLogs"),
        clearLogs: () => ipcRenderer.invoke("xeno:clearLogs"),
        onLog: (callback) => ipcRenderer.on("xeno:log", (_e, entry) => callback(entry)),

        saveAppState: (state) => ipcRenderer.invoke("app:saveState", state),
        loadAppState: () => ipcRenderer.invoke("app:loadState"),

        getProxyUrl: () => ipcRenderer.invoke("xeno:getProxyUrl"),
        onProxyUrl: (callback) =>
            ipcRenderer.on("xeno:proxyUrl", (_e, url) => callback(url)),
        proxyHealth: () => ipcRenderer.invoke("xeno:proxyHealth"),
        proxyGetClients: () => ipcRenderer.invoke("xeno:proxyGetClients"),
        proxyAttach: () => ipcRenderer.invoke("xeno:proxyAttach"),
        proxyExecute: (script, pids) => ipcRenderer.invoke("xeno:proxyExecute", script, pids),
        proxyGetVersion: () => ipcRenderer.invoke("xeno:proxyGetVersion"),
        proxyGetLogs: () => ipcRenderer.invoke("xeno:proxyGetLogs"),
    },
);

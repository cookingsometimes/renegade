import { WebSocket } from "ws";

interface ServerStatus {
  status: string;
  mode: string;
  version: string;
  dllLoaded: boolean;
  initialized: boolean;
  clients: Array<{
    id: number;
    pid: number;
    name: string;
    version: string;
    state: number;
    stateName: string;
    displayText: string;
    isChecked: boolean;
  }>;
}

type EventCallback = (data: unknown) => void;

export class XenoServerClient {
  private baseUrl: string;
  private wsUrl: string;
  private ws: WebSocket | null = null;
  private listeners = new Map<string, Set<EventCallback>>();
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private _connected = false;

  constructor(port = 3420, host = "127.0.0.1") {
    this.baseUrl = `http://${host}:${port}`;
    this.wsUrl = `ws://${host}:${port}/ws`;
  }

  connect(): void {
    this.connectWs();
  }

  private connectWs(): void {
    if (this.ws) {
      this.ws.removeAllListeners("close");
      this.ws.close();
    }

    try {
      this.ws = new WebSocket(this.wsUrl);

      this.ws.on("open", () => {
        this._connected = true;
        if (this.reconnectTimer) { clearTimeout(this.reconnectTimer); this.reconnectTimer = null; }
        this.ws?.send(JSON.stringify({ type: "subscribe", channels: ["*"] }));
      });

      this.ws.on("message", (raw: Buffer) => {
        try {
          const msg = JSON.parse(raw.toString()) as { type: string; data: unknown };
          const cbs = this.listeners.get(msg.type);
          if (cbs) for (const cb of cbs) cb(msg.data);
          const all = this.listeners.get("*");
          if (all) for (const cb of all) cb(msg);
        } catch { /* ignore */ }
      });

      this.ws.on("close", () => {
        this._connected = false;
        this.ws = null;
        this.reconnectTimer = setTimeout(() => this.connectWs(), 3000);
      });

      this.ws.on("error", () => {
        if (this.ws) { this.ws.removeAllListeners("close"); this.ws.close(); }
        this.ws = null;
      });
    } catch {
      this.reconnectTimer = setTimeout(() => this.connectWs(), 3000);
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    if (this.ws) { this.ws.removeAllListeners("close"); this.ws.close(); this.ws = null; }
    this._connected = false;
  }

  isConnected(): boolean {
    return this._connected;
  }

  on(event: string, callback: EventCallback): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(callback);
    return () => this.listeners.get(event)?.delete(callback);
  }

  private async request<T>(path: string, options?: { method?: string; body?: unknown }): Promise<T> {
    const res = await fetch(`${this.baseUrl}/api${path}`, {
      method: options?.method || "GET",
      headers: { "Content-Type": "application/json" },
      body: options?.body ? JSON.stringify(options.body) : undefined,
      signal: AbortSignal.timeout(15000),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: `HTTP ${res.status}` }));
      throw new Error(err.error || `HTTP ${res.status}`);
    }
    return res.json() as Promise<T>;
  }

  async health(): Promise<ServerStatus> {
    return this.request<ServerStatus>("/health");
  }

  async getVersion(): Promise<string> {
    const data = await this.request<{ version: string }>("/version");
    return data.version;
  }

  async getClients(): Promise<ServerStatus["clients"]> {
    const data = await this.request<{ clients: ServerStatus["clients"] }>("/clients");
    return data.clients;
  }

  async attach(): Promise<boolean> {
    const data = await this.request<{ success: boolean }>("/attach", { method: "POST" });
    return data.success;
  }

  async execute(script: string, pids: number[]): Promise<boolean> {
    const data = await this.request<{ success: boolean }>("/execute", {
      method: "POST",
      body: { script, pids },
    });
    return data.success;
  }

  async setSetting(settingID: number, value: number): Promise<boolean> {
    const data = await this.request<{ success: boolean }>("/settings", {
      method: "POST",
      body: { settingID, value },
    });
    return data.success;
  }

  async initDll(): Promise<boolean> {
    const data = await this.request<{ success: boolean }>("/init", { method: "POST" });
    return data.success;
  }

  async stop(): Promise<boolean> {
    const data = await this.request<{ success: boolean }>("/stop", { method: "POST" });
    return data.success;
  }

  checkUpdates(version?: string): Promise<{ needsUpdate: boolean; latestVersion: string }> {
    const qs = version ? `?version=${encodeURIComponent(version)}` : "";
    return this.request<{ needsUpdate: boolean; latestVersion: string }>(`/check-updates${qs}`);
  }

  isDownloaded(): Promise<{ downloaded: boolean }> {
    return this.request<{ downloaded: boolean }>("/downloaded");
  }

  getLogs(limit = 100): Promise<{ logs: unknown[] }> {
    return this.request<{ logs: unknown[] }>(`/logs?limit=${limit}`);
  }
}

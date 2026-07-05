import { spawnSync } from "child_process";

export interface SafeKillResult {
  killed: boolean;
  reason: "killed" | "not_found" | "no_permission" | "error";
  pid: number;
}

export function processExists(pid: number): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  try {
    process.kill(pid, 0);
    return true;
  } catch (e: unknown) {
    const err = e as NodeJS.ErrnoException;
    if (err.code === "ESRCH") return false;
    if (err.code === "EPERM") return true;
    return false;
  }
}

export function safeTaskKillByName(name: string): boolean {
  if (!name) return false;
  if (process.platform !== "win32") return false;
  try {
    const r = spawnSync("taskkill", ["/IM", name, "/T", "/F"], {
      stdio: "ignore",
      windowsHide: true,
      shell: false,
    });
    return r.status === 0;
  } catch {
    return false;
  }
}

export function safeTaskKill(pid: number, force: boolean = true): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (!processExists(pid)) return true;
  if (process.platform === "win32") {
    const args = ["/PID", String(pid), "/T"];
    if (force) args.push("/F");
    try {
      const r = spawnSync("taskkill", args, {
        stdio: "ignore",
        windowsHide: true,
        shell: false,
      });
      return r.status === 0 || !processExists(pid);
    } catch {
      return !processExists(pid);
    }
  } else {
    try {
      process.kill(pid, force ? "SIGKILL" : "SIGTERM");
      return true;
    } catch {
      return !processExists(pid);
    }
  }
}

export function safeTaskKillVerbose(pid: number, force: boolean = true): SafeKillResult {
  if (!Number.isFinite(pid) || pid <= 0) {
    return { killed: false, reason: "error", pid };
  }
  if (!processExists(pid)) {
    return { killed: true, reason: "not_found", pid };
  }
  const ok = safeTaskKill(pid, force);
  if (ok) return { killed: true, reason: "killed", pid };
  try {
    process.kill(pid, 0);
    return { killed: false, reason: "no_permission", pid };
  } catch {
    return { killed: false, reason: "error", pid };
  }
}

export function safeKillTree(pid: number, force: boolean = true): boolean {
  if (!Number.isFinite(pid) || pid <= 0) return false;
  if (!processExists(pid)) return true;
  if (process.platform === "win32") {
    const r = spawnSync("wmic", ["process", "where", `(ParentProcessId=${pid})`, "get", "ProcessId"], {
      stdio: "pipe",
      windowsHide: true,
      shell: false,
      encoding: "utf8" as BufferEncoding,
    });
    const childPids = (r.stdout || "")
      .split(/\s+/)
      .map((s: string) => parseInt(s, 10))
      .filter((n: number) => Number.isFinite(n) && n > 0 && n !== pid);
    for (const cpid of childPids) safeKillTree(cpid, force);
    return safeTaskKill(pid, force);
  } else {
    return safeTaskKill(pid, force);
  }
}

export const killPid = safeTaskKill;
export const killPidTree = safeKillTree;
export const pidExists = processExists;

export default safeTaskKill;

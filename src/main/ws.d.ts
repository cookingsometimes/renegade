declare module "ws" {
    import { Server as HttpServer } from "http";
    import { IncomingMessage } from "http";
    import { Duplex } from "stream";
    import { EventEmitter } from "events";

    class WebSocket extends EventEmitter {
        static readonly OPEN: number;
        static readonly CLOSED: number;
        static readonly CONNECTING: number;
        static readonly CLOSING: number;
        readonly readyState: number;
        constructor(url: string, protocols?: string | string[]);
        send(data: string | Buffer, cb?: (err?: Error) => void): void;
        close(code?: number, reason?: string): void;
        ping(data?: unknown): void;
        pong(data?: unknown): void;
    }

    interface ServerOptions {
        noServer?: boolean;
        server?: HttpServer;
    }

    class WebSocketServer extends EventEmitter {
        constructor(options?: ServerOptions);
        on(event: "connection", listener: (ws: WebSocket, req: IncomingMessage) => void): this;
        handleUpgrade(
            req: IncomingMessage,
            socket: Duplex,
            head: Buffer,
            cb: (ws: WebSocket) => void
        ): void;
        close(cb?: () => void): void;
    }

    export { WebSocketServer, WebSocket };
    export default WebSocket;
}

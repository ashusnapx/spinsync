"use client";

// ═══════════════════════════════════════════
// REALTIME + POLLING FALLBACK SYSTEM
// ═══════════════════════════════════════════

type MessageHandler = (data: unknown) => void;
type StatusHandler = (status: "connected" | "disconnected" | "polling") => void;

interface RealtimeOptions {
  pollIntervalMs?: number;
  pollUrl: string;
  onMessage: MessageHandler;
  onStatus?: StatusHandler;
}

/**
 * Dual-mode realtime client:
 * 1. Primary: SSE (Server-Sent Events) for live updates
 * 2. Fallback: Polling at configured interval when SSE fails
 */
export class RealtimeClient {
  private eventSource: EventSource | null = null;
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private options: Required<RealtimeOptions>;
  private status: "connected" | "disconnected" | "polling" = "disconnected";
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000; // ms, doubles each attempt

  constructor(options: RealtimeOptions) {
    this.options = {
      pollIntervalMs: options.pollIntervalMs || 5000,
      pollUrl: options.pollUrl,
      onMessage: options.onMessage,
      onStatus: options.onStatus || (() => {}),
    };
  }

  /**
   * Connect to the realtime stream. Falls back to polling on failure.
   */
  connect(sseUrl?: string) {
    if (sseUrl) {
      this.connectSSE(sseUrl);
    } else {
      this.startPolling();
    }
  }

  /**
   * Connect via Server-Sent Events.
   */
  private connectSSE(url: string) {
    try {
      this.eventSource = new EventSource(url, { withCredentials: true });

      this.eventSource.onopen = () => {
        this.setStatus("connected");
        this.reconnectAttempts = 0;
        this.stopPolling();
      };

      this.eventSource.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          this.options.onMessage(data);
        } catch {
          this.options.onMessage(event.data);
        }
      };

      this.eventSource.onerror = () => {
        this.eventSource?.close();
        this.eventSource = null;

        if (this.reconnectAttempts < this.maxReconnectAttempts) {
          this.reconnectAttempts++;
          const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
          setTimeout(() => this.connectSSE(url), delay);
        } else {
          // Exhausted reconnection attempts — fall back to polling
          this.startPolling();
        }
      };
    } catch {
      this.startPolling();
    }
  }

  /**
   * Start polling as fallback.
   */
  private startPolling() {
    if (this.pollTimer) return;

    this.setStatus("polling");
    this.poll(); // Immediate first poll

    this.pollTimer = setInterval(() => {
      this.poll();
    }, this.options.pollIntervalMs);
  }

  /**
   * Execute a single poll request.
   */
  private async poll() {
    try {
      const response = await fetch(this.options.pollUrl, {
        credentials: "include",
      });

      if (response.ok) {
        const data = await response.json();
        this.options.onMessage(data);
      }
    } catch (err) {
      console.error("[Realtime] Poll failed:", err);
    }
  }

  /**
   * Stop polling.
   */
  private stopPolling() {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  /**
   * Update and broadcast connection status.
   */
  private setStatus(status: "connected" | "disconnected" | "polling") {
    this.status = status;
    this.options.onStatus(status);
  }

  /**
   * Get current connection status.
   */
  getStatus() {
    return this.status;
  }

  /**
   * Disconnect from all sources.
   */
  disconnect() {
    this.eventSource?.close();
    this.eventSource = null;
    this.stopPolling();
    this.setStatus("disconnected");
    this.reconnectAttempts = 0;
  }
}

/**
 * React hook helper for creating a realtime connection.
 * Usage:
 *   const client = createRealtimeClient({ pollUrl: '/api/machines', onMessage: setMachines })
 *   useEffect(() => { client.connect(); return () => client.disconnect(); }, [])
 */
export function createRealtimeClient(options: RealtimeOptions): RealtimeClient {
  return new RealtimeClient(options);
}

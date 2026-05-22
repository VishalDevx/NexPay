import { outboxService } from "../modules/outbox/outbox.service";
import { metrics } from "../modules/metrics/metrics";

const POLL_INTERVAL_MS = 5000;

class OutboxWorker {
  private intervalId: NodeJS.Timeout | null = null;

  start(): void {
    console.log("[OutboxWorker] Starting outbox processor (polling every 5s)...");

    const poll = async () => {
      try {
        const processed = await outboxService.processOutbox();
        if (processed > 0) {
          console.log(`[OutboxWorker] Processed ${processed} outbox events`);
        }
      } catch (err: any) {
        console.error("[OutboxWorker] Poll error:", err.message);
      }
    };

    poll();
    this.intervalId = setInterval(poll, POLL_INTERVAL_MS);
  }

  stop(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
      console.log("[OutboxWorker] Stopped");
    }
  }
}

export const outboxWorker = new OutboxWorker();
outboxWorker.start();

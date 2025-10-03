import { redis } from "@/lib/redis";

export async function GET() {
  const encoder = new TextEncoder();
  let sub: ReturnType<typeof redis.duplicate> | null = null; 

  const stream = new ReadableStream({
    async start(controller) {
      sub = redis.duplicate();
      if (!sub.status || sub.status === "end") {
        await sub.connect();
      }

      await sub.subscribe("booking:confirmed", "partner:location", "booking:assigned"); 

      sub.on("message", (channel, message) => {
        const payload = JSON.parse(message);
        const ssePayload = JSON.stringify({ channel, ...payload });
        const sseMessage = `data: ${ssePayload}\n\n`;

        try {
          controller.enqueue(encoder.encode(sseMessage));
        } catch (e: any) {
          console.error("Error: Stream controller closed before message could be sent.", e.message);
        }
      });
    },

    cancel(reason) { 
      if (sub) {
        console.log(`Client disconnected. Quitting Redis subscriber.`);
        sub.quit(); 
        sub = null; 
      }
    }
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
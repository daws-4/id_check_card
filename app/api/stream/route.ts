import { NextRequest } from "next/server";

const clients = new Set<ReadableStreamDefaultController>();

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const userId = searchParams.get("userId");

    if (userId) {
        const message = `data: ${JSON.stringify({ userId })}\n\n`;
        for (const controller of Array.from(clients)) {
            try {
                controller.enqueue(new TextEncoder().encode(message));
            } catch {
                clients.delete(controller);
            }
        }
        return new Response(JSON.stringify({ ok: true, userId }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
        });
    }

    let controller: ReadableStreamDefaultController;

    const stream = new ReadableStream({
        start(c) {
            controller = c;
            clients.add(controller);
            controller.enqueue(new TextEncoder().encode(": connected\n\n"));
        },
        cancel() {
            clients.delete(controller);
        },
    });

    return new Response(stream, {
        headers: {
            "Content-Type": "text/event-stream",
            "Cache-Control": "no-cache",
            Connection: "keep-alive",
        },
    });
}

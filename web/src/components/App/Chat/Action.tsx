import { useEffect, useState } from "react";
import { socket } from "@/lib/socket";

type PendingAction = {
    id: string;
    data: { intent?: string; assistant_message?: string | null; [k: string]: unknown };
};

export default function Action() {
    const [pending, setPending] = useState<PendingAction | null>(null);
    const [busy, setBusy] = useState(false);

    useEffect(() => {
        const handleRequest = ({ id, data }: { id: string; data: PendingAction["data"] }) => {
            setPending({ id, data });
            setBusy(false);
        };
        const handlePerformed = ({ id }: { id: string }) => {
            if (pending?.id === id) setPending(null);
            setBusy(false);
        };
        const handleCancelled = ({ id }: { id: string }) => {
            if (pending?.id === id) setPending(null);
            setBusy(false);
        };

        socket.on("chat:action:request", handleRequest);
        socket.on("chat:action", handlePerformed);
        socket.on("chat:action:cancelled", handleCancelled);
        socket.on("chat:error", handleCancelled);

        return () => {
            socket.off("chat:action:request", handleRequest);
            socket.off("chat:action", handlePerformed);
            socket.off("chat:action:cancelled", handleCancelled);
            socket.off("chat:error", handleCancelled);
        };
    }, [pending?.id]);

    if (!pending) return null;

    const confirm = () => {
        if (!pending) return;
        setBusy(true);
        socket.emit("chat:action:confirm", { id: pending.id });
    };

    const decline = () => {
        if (!pending) return;
        setBusy(true);
        socket.emit("chat:action:decline", { id: pending.id });
    };

    const message =
        (typeof pending.data.assistant_message === "string" && pending.data.assistant_message) ||
        "Do you want to proceed with this action?";

    return (
        <div className="flex justify-start">
            <div className="bg-[#13181a] border border-[#1c1c1c] text-white p-4 rounded-[12px] rounded-tl-none w-full">
                <p className="mb-3">{message}</p>
                <div className="flex gap-2">
                    <button
                        onClick={confirm}
                        disabled={busy}
                        className="px-3 py-1 rounded-md bg-[#f8cb00] text-black disabled:opacity-60"
                    >
                        Accept
                    </button>
                    <button
                        onClick={decline}
                        disabled={busy}
                        className="px-3 py-1 rounded-md bg-transparent border border-[#2a2a2a] text-white disabled:opacity-60"
                    >
                        Decline
                    </button>
                </div>
            </div>
        </div>
    );
}


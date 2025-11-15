import { useState } from "react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";

type Props = {
	id: string;
	text: string;
	status: "pending" | "accepted" | "cancelled";
};

export default function Action({ id, text, status }: Props) {
	const [busy, setBusy] = useState(false);

	const confirm = () => {
		setBusy(true);
		socket.emit("chat:action:confirm", { id });
	};

	const decline = () => {
		setBusy(true);
		socket.emit("chat:action:decline", { id });
	};

	const cancelled = status === "cancelled";
	const accepted = status === "accepted";

	return (
		<div className="flex justify-start">
			<div className="bg-[#13181a] bg-diagonal-stripes text-white p-8 rounded-xl w-full">
				<p className="mb-3">
					{text}{" "}
					{cancelled && <span className="text-xs text-gray-400">[cancelled]</span>}
					{accepted && <span className="text-xs text-gray-400">[accepted]</span>}
				</p>

				{status === "pending" && (
					<div className="w-full flex gap-2">
						<Button
							variant="outline"
							onClick={decline}
							disabled={busy}
							className="bg-[#13181a] px-3 py-1 rounded-md border border-[#2a2a2a] text-white disabled:opacity-60 w-1/2"
						>
							Decline
						</Button>
						<Button
							variant="gold"
							onClick={confirm}
							disabled={busy}
							className="px-3 py-1 rounded-md bg-[#f8cb00] text-black disabled:opacity-60 w-1/2"
						>
							Accept
						</Button>
					</div>
				)}
			</div>
		</div>
	);
}

import { Fragment, useMemo, useState } from "react";
import { socket } from "@/lib/socket";
import { Button } from "@/components/ui/button";
import { Play, Square } from "lucide-react";

type Props = {
	id: string;
	text: string;
	status: "pending" | "accepted" | "cancelled";
	isPlaying?: boolean;
	onPlay?: () => void;
	onStop?: () => void;
};

export default function Action({ id, text, status, isPlaying, onPlay, onStop }: Props) {
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

	const showControls = typeof onPlay === "function" && typeof onStop === "function";

	return (
		<div className="flex gap-2 items-start justify-start">
			{showControls && (
				<button
					onClick={isPlaying ? onStop : onPlay}
					className={
						"mt-1 p-1.5 rounded-full transition-colors shrink-0 " +
						(isPlaying ? "bg-red-500 text-white hover:bg-red-600" : "bg-gray-200 text-gray-700 hover:bg-gray-300")
					}
					aria-label={isPlaying ? "Stop" : "Play"}
				>
					{isPlaying ? <Square className="w-3 h-3" fill="currentColor" /> : <Play className="w-3 h-3" fill="currentColor" />}
				</button>
			)}
			<div className="flex-1 bg-[#13181a] bg-diagonal-stripes text-white p-8 rounded-xl">
				<p>
					<SafeTextWithBreaks text={text} />
					{cancelled && <span className="text-xs text-gray-400"> [cancelled]</span>}
				</p>

				{status === "pending" && (
					<div className="w-full flex gap-2 mt-2">
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
const SafeTextWithBreaks = ({ text }: { text: string }) => {
	const normalized = useMemo(() => text.replace(/\\n/g, "\n"), [text]);
	const lines = useMemo(() => normalized.split(/\r?\n/g), [normalized]);

	return (
		<>
			{lines.map((line, i) => (
				<Fragment key={i}>
					{line}
					{i < lines.length - 1 && <><br /><br /></>}
				</Fragment>
			))}
		</>
	);
};


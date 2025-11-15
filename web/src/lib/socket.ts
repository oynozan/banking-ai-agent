import { io, type Socket } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_SOCKET as string;

declare global {
	// eslint-disable-next-line no-var
	var __banking_socket: Socket | undefined;
}

export const socket: Socket =
	globalThis.__banking_socket ??
	io(URL, {
		autoConnect: true,
		// transports: ["websocket"],
	});

if (!globalThis.__banking_socket) {
	globalThis.__banking_socket = socket;
}

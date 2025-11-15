import { io, type Socket } from "socket.io-client";

const URL = process.env.NEXT_PUBLIC_SOCKET as string;

declare global {
	var __banking_socket: Socket | undefined;
}

export const socket: Socket =
	globalThis.__banking_socket ??
	io(URL, {
		autoConnect: false,
		auth: { token: undefined as unknown as string },
	});

if (!globalThis.__banking_socket) {
	globalThis.__banking_socket = socket;
}

export function setSocketAuthToken(token?: string | null) {
	(socket as any).auth = { token: token ?? undefined };
}

export function connectSocket() {
	if (!socket.connected) socket.connect();
}

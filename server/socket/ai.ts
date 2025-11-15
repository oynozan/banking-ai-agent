import { SocketListener } from "../socket";

export class AgentListener extends SocketListener {
    listen() {
        this.socket.on("agent", (data: string) => {
            
        });
    }
}

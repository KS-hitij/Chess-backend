import { WebSocketServer } from "ws";
import { GameManager } from "./GameManager";
import type WebSocket from "ws";
import { v4 as uuid } from "uuid";
const wss = new WebSocketServer({ port: 3001 });

const privateRoomManager: Map<string, { socket: WebSocket, name: string }> = new Map()
const gameManager = new GameManager();
let waiting: { socket: WebSocket, name: string } | null = null;

wss.on("connection", (socket: WebSocket) => {
    console.log("Running");

    socket.on("message", (data: string) => {
        const parsedData = JSON.parse(data);
        switch (parsedData.type) {
            case "join_public":
                if (waiting === null) {
                    waiting = { socket, name: parsedData.payload.name };
                } else {
                    const roomId = uuid();
                    gameManager.join({ roomId: roomId, player1: waiting.socket, player2: socket });
                    waiting.socket.send(JSON.stringify({ type: "init_game", payload: { roomId, color: "white", opponent: parsedData.payload.name } }));
                    socket.send(JSON.stringify({ type: "init_game", payload: { roomId, color: "black", opponent: waiting.name } }));
                    waiting = null;
                }
                break;

            case "move":
                gameManager.move({ roomId: parsedData.payload.roomId, player: socket, from: parsedData.payload.from, to: parsedData.payload.to })
                break;

            case "leave":
                gameManager.leave({ roomId: parsedData.payload.roomId, player: socket });
                privateRoomManager.delete(parsedData.payload.roomId);
                break;

            case "join_private":
                const roomId = parsedData.payload.roomId;
                const playerName = parsedData.payload.name;
                if (privateRoomManager.has(roomId)) {
                    const player1 = privateRoomManager.get(roomId);
                    if (!player1 || !player1.socket || player1.socket.readyState !== 1) {
                        socket.send(JSON.stringify({ type: "error", payload: { message: "Room not available." } }));
                        privateRoomManager.delete(roomId);
                        return;
                    }
                    if (player1.socket === socket) {
                        socket.send(JSON.stringify({ type: "error", payload: { message: "You are already in this room." } }));
                        return;
                    }
                    gameManager.join({ roomId, player1: player1.socket, player2: socket });
                    player1.socket.send(JSON.stringify({
                        type: "init_game",
                        payload: { roomId, color: "white", opponent: playerName }
                    }));
                    socket.send(JSON.stringify({
                        type: "init_game",
                        payload: { roomId, color: "black", opponent: player1.name }
                    }));
                    privateRoomManager.delete(roomId);
                } else {
                    privateRoomManager.set(roomId, { socket, name: playerName });
                }
                break;
            default:
                socket.send(JSON.stringify({ type: "error", payload: { message: "Invalid event" } }))
                break;
        }
    })
    socket.on("close", () => {
        for (const [key, value] of privateRoomManager.entries()) {
            if (value.socket === socket) {
                privateRoomManager.delete(key);
                return;
            }
        }
        if (waiting?.socket === socket) {
            waiting = null;
            return;
        }
        gameManager.leaveBySocket(socket);
    })
});
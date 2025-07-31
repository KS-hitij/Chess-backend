import { Chess } from "chess.js";
import type WebSocket from "ws";
export default class Game {
    board: Chess
    black: WebSocket
    white: WebSocket
    constructor({ black, white }: { black: WebSocket, white: WebSocket }) {
        this.board = new Chess();
        this.black = black;
        this.white = white;
    }

    move({ from, to, player }: { from: string, to: string, player: WebSocket }): void {
        const colorTurn = this.board.turn();
        if (colorTurn === "w" && player !== this.white || colorTurn === "b" && player != this.black) {
            player.send(JSON.stringify({ type: "error", payload: { message: "Wait for your turn" } }));
            return;
        }
        const result = this.board.move({ from, to, promotion: "q" });
        if (!result) {
            this.black.send(JSON.stringify({ type: "error", payload: { message: "Illegal Move" } }));
            this.white.send(JSON.stringify({ type: "error", payload: { message: "Illegal Move" } }));
        }
        this.black.send(JSON.stringify({ type: "history", payload: { history: this.board.history() } }));
        this.white.send(JSON.stringify({ type: "history", payload: { history: this.board.history() } }));

        if (this.board.isCheckmate()) {
            const winner = this.board.turn() == "w" ? this.black : this.white;
            const loser = this.board.turn() == "w" ? this.white : this.black;
            winner.send(JSON.stringify({ type: "board", payload: { board: this.board.fen() } }));
            loser.send(JSON.stringify({ type: "board", payload: { board: this.board.fen() } }));
            setTimeout(() => {
                winner.send(JSON.stringify({ type: "win", payload: { message: "You won the game" } }));
                loser.send(JSON.stringify({ type: "lose", payload: { message: "You lost the game" } }));
                this.black.close();
                this.white.close();
            },400);
            return;
        }
        if(this.board.isCheck()){
            const player = this.board.turn() == "w" ? this.black : this.white;
            player.send(JSON.stringify({type:"check",payload:{message:"Your King is Checked"}}));
        }

        this.black.send(JSON.stringify({ type: "board", payload: { board: this.board.fen() } }));
        this.white.send(JSON.stringify({ type: "board", payload: { board: this.board.fen() } }));
        return;
    }

    leave({ player }: { player: WebSocket }): void {
        if (player == this.black) {
            this.black.send(JSON.stringify({ type: "lose", payload: { message: "You left the game" } }));;
            this.white.send(JSON.stringify({ type: "win", payload: { message: "You won the game. The opposing player left." } }));
            return;
        }
        this.white.send(JSON.stringify({ type: "lose", payload: { message: "You left the game" } }));;
        this.black.send(JSON.stringify({ type: "win", payload: { message: "You won the game. The opposing player left." } }));
    }
}
import Game from "./Game";
import type WebSocket from "ws";
export class GameManager{
    Games:Map<string,Game> = new Map()
    constructor() {
        
    }
    join({roomId,player1,player2}:{roomId:string,player1:WebSocket,player2:WebSocket}){
        if(this.Games.has(roomId)){
            player1.send(JSON.stringify({type:"error",payload:{message:"Room Id must be unique"}}));
            player2.send(JSON.stringify({type:"error",payload:{message:"Room Id must be unique"}}));
            player1.close();
            player2.close();
            return;
        }
        const game = new Game({white:player1,black:player2});
        this.Games.set(roomId,game);
    }

    move({roomId,player,from,to}:{roomId:string,player:WebSocket,from:string,to:string}){
        const game = this.Games.get(roomId);
        if(!game){
            player.send(JSON.stringify({type:"error",payload:{message:"Room Does not exist"}}));
            player.close();
            return;
        }
        game.move({from,to,player});
    }

    leave({roomId,player}:{roomId:string,player:WebSocket}){
        const game = this.Games.get(roomId);
        if(!game){
            player.send(JSON.stringify({type:"error",payload:{message:"Room Does not exist"}}));
            player.close();
            return;
        }
        game.leave({player});
    }

    leaveBySocket(socket:WebSocket){
        this.Games.forEach((game:Game)=>{
            if(game.black===socket){
                game.white.send(JSON.stringify({type:"win",payload:{message:"You won the game. The opposing player left."}}));
                game.white.close();
            }else if(game.white===socket){
                game.black.send(JSON.stringify({type:"win",payload:{message:"You won the game. The opposing player left."}}));
                game.black.close();
            }
        });
    }

}
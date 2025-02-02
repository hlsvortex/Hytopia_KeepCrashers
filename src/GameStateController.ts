import { EventRouter } from 'hytopia';
import { GameState } from './GameState';
import type { GameStateUpdate } from './GameState';
import { gameManager } from './GlobalContext';


export class GameStateController {
    private currentState: GameState = GameState.WaitingForEnoughPlayers;

    private matchStartTimer: number = 5; // Seconds
    private readyPlayers: Set<string> = new Set();
    private minPlayers: number = 2;
    private currentPlayers: number = 0;


    constructor(private eventRouter: EventRouter) 
    {

      
    }

    public update(currentPlayerCount: number) {
        this.currentPlayers = currentPlayerCount;
        switch (this.currentState) {
            case GameState.WaitingForEnoughPlayers:

                
                console.log(`Waiting for players ${currentPlayerCount} / ${this.minPlayers}`);

                if (currentPlayerCount >= this.minPlayers) {
                    this.setState(GameState.WaitingForPlayersReady);
                }
                break;

            case GameState.WaitingForPlayersReady:

                console.log(`Waiting for players ready ${this.readyPlayers.size} / ${currentPlayerCount}`);

                if (this.readyPlayers.size >= this.minPlayers) {
                    this.setState(GameState.MatchStartCountdown);
                }

                break;

            case GameState.MatchStartCountdown:
                console.log(`Match start countdown ${this.matchStartTimer}`);

                this.matchStartTimer--;
                this.eventRouter.emit('MATCH_COUNTDOWN_UPDATE', this.matchStartTimer);
                
                //this.eventRouter.emit('GAME_STATE_UPDATE', this.getStateUpdate());

                if (this.matchStartTimer <= 0) {
                    this.setState(GameState.MatchPlay);
                }
                break;

            case GameState.MatchPlay:
                // Game mode handles match ending
                break;

            case GameState.MatchEnd:
                this.setState(GameState.MatchStats);
                setTimeout(() => this.resetMatch(), 10000);
                break;
        }
    }

    public setState(newState: GameState) {
        this.currentState = newState;
        this.eventRouter.emit('GAME_STATE_CHANGED', newState);

        if (newState === GameState.MatchPlay) {
            gameManager.openDoors();
        }
        
    }

    public getState(): GameState {
        return this.currentState;
    }


    public setPlayerReady(playerId: string, isReady: boolean) {

        console.log(`setPlayerReady ${playerId} ${isReady}!`);
        if (isReady) {
            this.readyPlayers.add(playerId);
        } else {
            this.readyPlayers.delete(playerId);
        }
        this.eventRouter.emit('PLAYER_READY_UPDATE', { playerId, isReady });
    }

    public getStateUpdate(playerId?: string): GameStateUpdate {
        return {
            state: this.currentState,
            message: this.getStateMessage(),
            isReady: playerId ? this.isPlayerReady(playerId) : undefined
        };
    }

    public getStateMessage(): string {
        switch(this.currentState) {
            case GameState.WaitingForEnoughPlayers:
                return `Waiting for players (${this.readyPlayers.size}/${this.minPlayers})`;
            case GameState.WaitingForPlayersReady:
                return `Ready check (${this.readyPlayers.size}/${this.currentPlayers})`;
            case GameState.MatchStartCountdown:
                return `Match starts in ${this.matchStartTimer}`;
            case GameState.MatchPlay:
                //return `${Math.floor(this.matchTimer/60)}:${(this.matchTimer%60).toString().padStart(2, '0')}`;
                return "";
            case GameState.MatchEnd:
                return "Match ended!";
            case GameState.MatchStats:
                return "Showing match statistics...";
            default:
                return "";
        }
    }

    public resetMatch() {
        this.matchStartTimer = 5;
        this.readyPlayers.clear();
        this.setState(GameState.WaitingForEnoughPlayers);
        console.log("Resetting match");
    }

    public isPlayerReady(playerId: string): boolean {
        return this.readyPlayers.has(playerId);
    }
} 
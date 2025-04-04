import { EventRouter, Player, PlayerEvent, World } from 'hytopia';
import { GameState } from './GameState';
import type { GameStateUpdate } from './GameState';
import { gameManager } from './GlobalContext';
import { world } from './GlobalContext';

export enum GameStateEvent {
	GAME_STATE_CHANGED = 'GAME_STATE_CHANGED',
	MATCH_COUNTDOWN_UPDATE = 'MATCH_COUNTDOWN_UPDATE',
	PLAYER_READY_UPDATE = 'PLAYER_READY_UPDATE',
	MATCH_END = 'MATCH_END',
	MATCH_STATS = 'MATCH_STATS',
	POINT_CAPTURED = 'POINT_CAPTURED',
	MATCH_TIME_UPDATE = 'MATCH_TIME_UPDATE',
}

export class GameStateController {
    private currentState: GameState = GameState.WaitingForEnoughPlayers;

    private matchStartTimer: number = 5; // Seconds
    private readyPlayers: Set<string> = new Set();
    private minPlayers: number = 2;
    private currentPlayers: number = 0;

	
    constructor() 
    {
		//GameStateController.eventRouter.emit(GameStateEvent.WAITING_FOR_ENOUGH_PLAYERS, { player: { id: 'test' }, world: world });
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
				world.emit(GameStateEvent.MATCH_COUNTDOWN_UPDATE, this.matchStartTimer);
             
                if (this.matchStartTimer <= 0) {
                    this.setState(GameState.MatchPlay);
                }

                break;

            case GameState.MatchPlay:
                // Game mode handles match ending
                break;

            case GameState.MatchEnd:
                break;
        }
    }

    public setState(newState: GameState) {
        this.currentState = newState;
		world.emit(GameStateEvent.GAME_STATE_CHANGED, newState);
        //gameManager.handleGameStateChange(newState);

        // Handle state transitions
        switch(newState) {
            case GameState.MatchEnd:
                // Show victory screen for 5 seconds then transition to stats
                setTimeout(() => {
                    this.setState(GameState.MatchStats);
                }, 5000);
                break;
            
            case GameState.MatchStats:
                // Show stats for 10 seconds then reset
                setTimeout(() => {
                    // This will hide the scoreboard and reset stats
                    this.resetMatch();
                    
                    // Transition to waiting state after reset is complete
                    this.setState(GameState.WaitingForEnoughPlayers);
                }, 10000);
                break;
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
		
		//world.emit(GameStateEvent.PLAYER_READY_UPDATE, { playerId, isReady });
		
		//world(GameStateEvent.PLAYER_READY_UPDATE, { playerId, isReady });
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
                return "";
            default:
                return "";
        }
    }

    public resetMatch() {
        this.matchStartTimer = 5;
        this.readyPlayers.clear();
        gameManager.resetMatch();
        //this.currentState = GameState.WaitingForEnoughPlayers;
        this.setState(GameState.WaitingForEnoughPlayers);
		console.log("Resetting match");

    }

    public isPlayerReady(playerId: string): boolean {
        return this.readyPlayers.has(playerId);
    }
} 
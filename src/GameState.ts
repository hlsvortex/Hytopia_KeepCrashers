export enum GameState {
    WaitingForEnoughPlayers = 'WaitingForEnoughPlayers',
    WaitingForPlayersReady = 'WaitingForPlayersReady',
    MatchStartCountdown = 'MatchStartCountdown',
    MatchPlay = 'MatchPlay',
    MatchEnd = 'MatchEnd',
    MatchStats = 'MatchStats'
} 

export interface GameStateUpdate {
    state: GameState;
    message: string;
    isReady?: boolean;
} 
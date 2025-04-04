import { EventRouter, Vector3 } from 'hytopia';
import { Team } from './Team';
import { GameManager } from './GameManager';
import { CapturePoint } from './CapturePoint';
import { GameState } from './GameState';
import { world } from './GlobalContext';
import { KOTHLevelController } from './KOTHLevelController';

export abstract class GameModeController {
    protected _isInOvertime: boolean = false;

    constructor(
        protected gameManager: GameManager,
        protected eventRouter: EventRouter
    ) {}

    abstract update(deltaTime: number): void;
    abstract onPointCaptured(team: Team): void;
    abstract reset(): void;
    abstract getWinCondition(): string;
    abstract getCaptureProgress(): number;
    abstract getCurrentControllingTeam(): Team | null;
    abstract getTeamTime(teamName: string): number;

    get isInOvertime(): boolean {
        return this._isInOvertime;
    }

    abstract getCapturePoint(): CapturePoint;
}

export class KingOfTheHill extends GameModeController {
    private controlPoint: CapturePoint;
    private teamTimes: Map<Team, number> = new Map();
    private currentControllingTeam: Team | null = null;
    private initialLockDuration: number = 10; // Seconds before point unlocks
    private matchDuration: number = 120;//180; // 3 minutes in seconds
    private overtimeThreshold: number = 30; // Seconds remaining for overtime
    public levelController: KOTHLevelController;


    constructor(gameManager: GameManager, eventRouter: EventRouter) {
        super(gameManager, eventRouter);
        
        this.controlPoint = new CapturePoint(new Vector3(0, 2.15, 0), 8, 10, 5);
        this.controlPoint.spawn(world);
        
        this.levelController = new KOTHLevelController();
        this.levelController.setWorld(world);
        this.levelController.setupObjects();


        // Initialize team timers
        const redTeam = gameManager.getTeam('Red')!;
        const blueTeam = gameManager.getTeam('Blue')!;
        this.teamTimes.set(redTeam, this.matchDuration);
        this.teamTimes.set(blueTeam, this.matchDuration);

        // Listen for capture events
        this.controlPoint.onCaptured = (team: Team) => this.onPointCaptured(team);
    }

    private otherTeam(team: Team): Team {
        return this.gameManager.getTeam(team.name === 'Red' ? 'Blue' : 'Red')!;
    }

    update(deltaTime: number): void {
        // Only update if game is in MatchPlay state
        if (this.gameManager.getGameState() !== GameState.MatchPlay) {
            return;
        }

        this.controlPoint.update(deltaTime);
        
        const controllingTeam = this.controlPoint.controllingTeam;
        if (controllingTeam) {
            const remainingTime = this.teamTimes.get(controllingTeam)!;
            
            // Always decrement time regardless of capture progress
            this.teamTimes.set(controllingTeam, Math.max(0, remainingTime - deltaTime));

            // Check for win conditions when time hits zero
            if (remainingTime <= 0) {
                if (this.controlPoint.progress === 100) {
                    this.gameManager.handleGameWin(controllingTeam);
                } else if (!this._isInOvertime) {
                    this._isInOvertime = true;
                    //this.eventRouter.emit('OVERTIME_STARTED', controllingTeam);
                }
            }
        }
    }


    onPointCaptured(team: Team): void {
        const previousController = this.currentControllingTeam;
        this.currentControllingTeam = team;

        if (this._isInOvertime) {
            if (this.teamTimes.get(team)! <= 0 && this.controlPoint.progress === 100) {
                // Win condition met during overtime
                this.gameManager.handleGameWin(team);
            } else if (team !== previousController) {
                // Point changed hands during overtime
                this._isInOvertime = false;
            }
        }
    }

    reset(): void {
        this.teamTimes.forEach((_, team) => this.teamTimes.set(team, this.matchDuration));
        this.currentControllingTeam = null;
        this._isInOvertime = false;
        this.controlPoint.reset();
    }

    getWinCondition(): string {
        return `First team to deplete their timer while controlling the point wins. Overtime triggered if timer reaches ${this.overtimeThreshold} seconds.`;
    }

    getCaptureProgress(): number {
        return this.controlPoint.progress;
    }

    getCurrentControllingTeam(): Team | null {
        return this.controlPoint.controllingTeam;
    }

    getTeamTime(teamName: string): number {
        const team = this.gameManager.getTeam(teamName);
        if (!team) return 0;
        
        // Return stored time if not current controller
        if (team !== this.currentControllingTeam) {
            return this.teamTimes.get(team)!;
        }
        
        // Return current decreasing time for active controller
        return this.teamTimes.get(team)!;
    }

    getCapturePoint(): CapturePoint {
        return this.controlPoint;
    }
} 
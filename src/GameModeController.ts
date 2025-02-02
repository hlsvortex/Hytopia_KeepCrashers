import { EventRouter } from 'hytopia';
import { Team } from './Team';
import { GameManager } from './GameManager';
import { CapturePoint } from './CapturePoint';

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
    private matchDuration: number = 15;//180; // 3 minutes in seconds
    private overtimeThreshold: number = 30; // Seconds remaining for overtime

    constructor(gameManager: GameManager, eventRouter: EventRouter, controlPoint: CapturePoint) {
        super(gameManager, eventRouter);
        this.controlPoint = controlPoint;
        
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
        this.controlPoint.update(deltaTime);

        const controllingTeam = this.controlPoint.controllingTeam;
        if (controllingTeam) {
            const remainingTime = this.teamTimes.get(controllingTeam)!;
            
            // Always decrement time regardless of capture progress
            this.teamTimes.set(controllingTeam, Math.max(0, remainingTime - deltaTime));

            // Check for win conditions when time hits zero
            if (remainingTime <= 0) {
                if (this.controlPoint.progress === 100) {
                    // Full capture with zero time = instant win
                    this.gameManager.handleGameWin(controllingTeam);
                } else if (!this._isInOvertime) {
                    // Enter overtime if not already in it
                    this._isInOvertime = true;
                    this.eventRouter.emit('OVERTIME_STARTED', controllingTeam);
                }
            }
        }
    }

    private checkOvertimeConditions(): boolean {
        return this._isInOvertime && this.controlPoint.progress < 100;
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
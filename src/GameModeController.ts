import { EventRouter } from 'hytopia';
import { Team } from './Team';
import { GameManager } from './GameManager';
import { CapturePoint } from './CapturePoint';

export abstract class GameModeController {
    protected matchTimer: number = 0;
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
}

export class KingOfTheHill extends GameModeController {
    private controlPoint: CapturePoint;
    private teamTimes: Map<Team, number> = new Map();
    private currentControllingTeam: Team | null = null;
    private initialLockDuration: number = 10; // Seconds before point unlocks
    private matchDuration: number = 45;//180; // 3 minutes in seconds
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

        // Only count down time if a team controls the point
        const controllingTeam = this.controlPoint.controllingTeam;
        if (controllingTeam) {
            const remainingTime = this.teamTimes.get(controllingTeam)!;
            // Decrement time for controlling team
            this.teamTimes.set(controllingTeam, Math.max(0, remainingTime - deltaTime));

            // Check for overtime or win conditions
            if (remainingTime <= 0) {
                if (!this.checkOvertimeConditions()) {
                    this.gameManager.handleGameWin(controllingTeam);
                }
            }

            // Check for overtime activation
            if (!this._isInOvertime && remainingTime < this.overtimeThreshold) {
                this._isInOvertime = true;
                this.eventRouter.emit('OVERTIME_STARTED', controllingTeam);
            }
        }
    }

    private checkOvertimeConditions(): boolean {
        if (!this.controlPoint.controllingTeam) return false;
        
        // Get the opposing team's progress
        const otherTeam = this.otherTeam(this.controlPoint.controllingTeam);
        const otherProgress = this.controlPoint.getTeamProgress(otherTeam);

        // Overtime if opposing team has any progress
        if (otherProgress > 0) {
            this._isInOvertime = true;
            return true;
        }
        return false;
    }

    onPointCaptured(team: Team): void {
        const previousController = this.currentControllingTeam;
        this.currentControllingTeam = team;

        if (previousController) {
            // Store the previous controller's remaining time
            this.teamTimes.set(previousController, this.teamTimes.get(previousController)!);
        }

        // Handle overtime win conditions
        if (this._isInOvertime) {
            if (this.teamTimes.get(team)! <= 0) {
                // Only win if they fully captured during overtime
                if (this.controlPoint.progress === 100) {
                    this.gameManager.handleGameWin(team);
                }
            } else {
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
} 
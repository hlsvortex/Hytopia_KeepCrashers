import { Entity, Vector3, World, Collider, ColliderShape, EventRouter, RigidBodyType, BlockType, CollisionGroup } from 'hytopia';
import { Team } from './Team';
import { DamageableEntity } from './DamageableEntity';
import { gameManager, world } from './GlobalContext';
import { GameStateEvent } from './GameStateController';

export class CapturePoint {
    public progress: number = 0;
    public controllingTeam: Team | null = null;
    public partialControlTeam: Team | null = null;
    private playersOnPoint: Set<DamageableEntity> = new Set();
    private collider: Collider;
    //private entityModel: Entity;
    public onCaptured: (team: Team) => void = () => {};

    constructor(
        public position: Vector3,
        public radius: number = 5,
        public captureSpeed: number = 0.8, // % per second per player
        public decaySpeed: number = 0.5, // % per second when contested
        public MAX_CAPTURE_RATE: number = 15.0 // Maximum 15% per second
    ) {
        

        //world.simulation.enableDebugRendering(true);
        //world.simulation.enableDebugRendering(true);
        /*
		this.entityModel = new Entity({
            name: 'Capture Point',
            modelUri: 'models/structures/capture-point.gltf',
            modelScale: 7,
			
            rigidBodyOptions: {
                type: RigidBodyType.FIXED,
				
                colliders: [ // Array of collider options, results in a created collider when spawned
                    {
                        shape: ColliderShape.ROUND_CYLINDER,
                        borderRadius: 0.05,
                        halfHeight: 0.01,
                        radius: 3,
                        mass: 1, // if not provided, automatically calculated based on shape volume.
                        bounciness: -0, // very bouncy!
                        relativePosition: { x: 0, y: -0.05, z: 0 }, // acts like an offset relative to the parent. 
						isSensor: true,
						collisionGroups: {
							belongsTo: [CollisionGroup.GROUP_6],
							collidesWith: [CollisionGroup.GROUP_12],
						},
                    },
					
                ]
            }

        });
		
		
		this.entityModel.setCollisionGroupsForSensorColliders({
			belongsTo: [CollisionGroup.ENTITY_SENSOR],
			collidesWith: [CollisionGroup.GROUP_12],
		});

        this.entityModel.spawn(world, this.position);
*/
        // Create capture zone collider
        this.collider = new Collider({
            shape: ColliderShape.BLOCK,
            halfExtents: { x: 8, y: 3, z: 8 },
            isSensor: true,
            // When not a child of rigid body,
            // relative position is relative to the world, 
            // equivalent to a typical world position.
            relativePosition: this.position,
            onCollision: (other: BlockType | Entity, started: boolean) => {
               
                if(other instanceof DamageableEntity) {
                    this.handleCollision(other, started);
                }

            }
        });

        
    }

    spawn(world: World) {
        this.collider.addToSimulation(world.simulation);
    }

    private handleCollision(other:Entity, started: boolean) {
        
        const player = other as DamageableEntity;

        if (!(player instanceof DamageableEntity)) return;

        if (started) {
            this.playersOnPoint.add(player);
        } else {
            this.playersOnPoint.delete(player);
        }
    }

    private pointCaptureEvent(team: Team | null) {
        world.emit(GameStateEvent.POINT_CAPTURED, team);
    }

    update(deltaTime: number) {
        const teamsPresent = new Set<Team>();
        this.playersOnPoint.forEach(player => {
            const team = gameManager.getPlayerTeam(player.player);
            if (team) teamsPresent.add(team);
        });

        // Pause all progress when contested
        if (teamsPresent.size > 1) {
            console.log(`[CapturePoint] Contested - Progress paused`);
            return;
        }

        // Debug: Log teams and players
        //console.log(`[CapturePoint] Players on point: ${this.playersOnPoint.size}`);
        this.playersOnPoint.forEach(player => {
            const team = gameManager.getPlayerTeam(player.player);
            console.log(`- Player: ${player.player.username}, Team: ${team?.name || 'None'}`);
        });

        // Handle neutral point with partial control
        if (!this.controllingTeam) {
            if (teamsPresent.size === 1) {
                const [currentTeam] = teamsPresent;
                
                // Set partial control if not set
                if (!this.partialControlTeam) {
                    this.partialControlTeam = currentTeam;
                }

                if (this.partialControlTeam === currentTeam) {
                    // Friendly team capturing
                    const prevProgress = this.progress;
                    let speed = this.captureSpeed * this.getTeamPlayerCount(currentTeam);

                    if (speed > this.MAX_CAPTURE_RATE) {
                        this.captureSpeed = this.MAX_CAPTURE_RATE;
                    }
                    

                    this.progress += speed * deltaTime;

                    this.progress = Math.min(100, this.progress);
                    // console.log(`[CapturePoint] ${currentTeam.name} partial capture: ${prevProgress.toFixed(1)}% -> ${this.progress.toFixed(1)}%`);

                    if (this.progress >= 100) {
                        this.controllingTeam = currentTeam;
                        this.partialControlTeam = null;
                        this.onCaptured(currentTeam);
                        this.pointCaptureEvent(currentTeam);

                        //gameManager.handlePointCapture(currentTeam);
                    }
                } else {
                    // Opposing team contesting - fast decay
                    const prevProgress = this.progress;
                    this.progress = Math.max(0, this.progress - (this.decaySpeed * 2 * deltaTime));
                    //console.log(`[CapturePoint] Opposing team contesting: ${prevProgress.toFixed(1)}% -> ${this.progress.toFixed(1)}%`);
                    
                    if (this.progress <= 0) {
                        this.partialControlTeam = currentTeam; // Switch partial control
                        this.progress = 0;
                        //gameManager.handlePointCapture(null);
                        this.pointCaptureEvent(null);
                    }
                }
            } else {
                // Decay logic for partial control
                if (this.partialControlTeam) {
                    // Normal decay when empty or contested
                    const prevProgress = this.progress;
                    this.progress = Math.max(0, this.progress - this.decaySpeed * deltaTime);
                    //console.log(`[CapturePoint] Neutral decay: ${prevProgress.toFixed(1)}% -> ${this.progress.toFixed(1)}%`);

                    if (this.progress <= 0) {
                        this.partialControlTeam = null;
                        //gameManager.handlePointCapture(null);
                        this.pointCaptureEvent(null);
                    }
                }
            }
        } else {
            // Handle controlled point decay
            const currentTeamOnPoint = teamsPresent.size === 1 ? Array.from(teamsPresent)[0] : null;

            // Decay if: 
            // - No one on point, or 
            // - Opposing team alone on point
            if (currentTeamOnPoint && currentTeamOnPoint !== this.controllingTeam) {
                const prevProgress = this.progress;
                this.progress = Math.max(0, this.progress - this.decaySpeed * deltaTime);
                //console.log(`[CapturePoint] Decaying - Progress: ${prevProgress.toFixed(1)}% -> ${this.progress.toFixed(1)}%`);

                if (this.progress <= 0) {
                    //console.log(`[CapturePoint] ${this.controllingTeam.name} lost control`);
                    this.controllingTeam = null;
                    //gameManager.handlePointCapture(null);
                    this.pointCaptureEvent(null);
                }
            } else {
                // Controlling team is present alone - no decay
                //console.log(`[CapturePoint] Controlled by ${this.controllingTeam.name} - No decay`);

                // Rebuild decayed progress if needed
                if (this.progress < 100) {
                    const teamPlayers = this.getTeamPlayerCount(this.controllingTeam);
                    const prevProgress = this.progress;
                    this.progress = Math.min(100, this.progress + (this.captureSpeed * teamPlayers * deltaTime));
                  //  console.log(`[CapturePoint] Rebuilding control: ${prevProgress.toFixed(1)}% -> ${this.progress.toFixed(1)}%`);
                }
            }
        }

        // Debug: Log final state
        //console.log(`[CapturePoint] End Update - Progress: ${this.progress.toFixed(1)}%, Controlling: ${this.controllingTeam?.name || 'None'}`);
        this.updateUI();
    }

    private updateUI() {
        // Trigger GameManager's UI update system
        gameManager.updateStatsUI();
    }

    public reset() {
        this.progress = 0;
        this.controllingTeam = null;
        this.playersOnPoint.clear();
        this.updateUI();
    }

    getTeamProgress(team: Team): number {
        if (this.controllingTeam) {
            return team === this.controllingTeam ? this.progress : 100 - this.progress;
        }
        return team === this.partialControlTeam ? this.progress : 0;
    }

    private getTeamPlayerCount(team: Team): number {
        return Array.from(this.playersOnPoint).filter(p => 
            gameManager.getPlayerTeam(p.player) === team
        ).length;
    }

    private updateProgress(captureRate: number, team: Team) {
        const prevProgress = this.progress;
        this.progress = Math.min(100, Math.max(0, this.progress + captureRate * 100));

        if (this.progress >= 100 && this.controllingTeam !== team) {
            this.controllingTeam = team;
            this.onCaptured?.(team);
            //gameManager.handlePointCapture(team);
            this.pointCaptureEvent(team);
        } else if (this.progress <= 0) {
            this.controllingTeam = null;
            //gameManager.handlePointCapture(null);
            this.pointCaptureEvent(null);
        }

        //if (this.onProgress) {
            //this.onProgress(this.progress, team);
        //}
    }
} 
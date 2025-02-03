import { Player, EventRouter, EntityManager, Light, Vector3, PlayerUI, Entity, PlayerManager, RigidBodyType, World, Quaternion,  } from 'hytopia';
import { Team } from './Team';
import { PlayerEvents, type PlayerDeathEventPayload } from './events';
import { PlayerEntity } from 'hytopia';
import AbilityEntityController from './AbilityEntityController';
import { SceneUI } from 'hytopia';
import { ArcherAbilityController, FighterAbilityController, WizardAbilityController } from './PlayerClass';
import { DamageableEntity } from './DamageableEntity';
import { world } from './GlobalContext';
import { RespawnSystem } from './RespawnSystem';
import { GameState } from './GameState';
import { GameStateController } from './GameStateController';
import { CapturePoint } from './CapturePoint';
import { GameModeController } from './GameModeController';
import { KingOfTheHill } from './GameModeController';

export class GameManager {
    private readonly teams: Team[] = [
        new Team('Red', '#ff4444'), 

        new Team('Blue', '#4444ff')
    ];
    private players: Map<string, DamageableEntity> = new Map();

    private localPlayer: DamageableEntity | undefined;
 
    // Add team spawn areas
    private teamSpawnAreas: Map<string, { min: Vector3, max: Vector3 }> = new Map([
        ['Red', { min: new Vector3(-4, 3, 53), max: new Vector3(-30, 3, 61) }],
        ['Blue', { min: new Vector3(4, 3, -53), max: new Vector3(31, 3, -62) }]
    ]);

    private doors: Entity[] = [];

    private gameStateController: GameStateController;

    // Add to existing properties
    private capturePoints: CapturePoint[] = [];
    private gameModeController!: GameModeController;

    constructor(private readonly worldEventRouter: EventRouter) {
        this.gameStateController = new GameStateController(worldEventRouter);
        this.initGame();
        this.startGameLoop();
        this.setupEventListeners();
        
        // Add debug log
        console.log('Setting up UI_LOADED listener');
        
        
    }

    private initGame() {
        // Initialize game mode
        const controlPoint = new CapturePoint(new Vector3(0, 2.15, 0), 8, 10, 5);
        controlPoint.spawn(world);
        this.gameModeController = new KingOfTheHill(this, this.worldEventRouter, controlPoint);

        // respawn system
        new RespawnSystem(world.eventRouter);

        this.buildStartAreaDoors(world);

        this.capturePoints.push(controlPoint);

    }

    private startGameLoop() {
        setInterval(() => {
            this.gameModeController.update(1); // Update game mode with deltaTime
            this.updateStatsUI();
            this.gameStateController.update(this.players.size);
            this.worldEventRouter.emit('STAT_REGENERATION_TICK', undefined);
        }, 1000);
    }

    private setupEventListeners() {
        

        this.worldEventRouter.on('PLAYER_READY_UPDATE', (data: { playerId: string, isReady: boolean }) => {
            console.log(`PLAYER_READY_UPDATE ${data.playerId} ${data.isReady}!`);
        });
        
        this.worldEventRouter.on('GAME_STATE_CHANGED', (newState: GameState) => {
            console.log(`GAME_STATE_CHANGED ${newState}!`);
            
            this.updatePlayerUI();
        });

       
        this.worldEventRouter.on('MATCH_COUNTDOWN_UPDATE', (timeLeft: number) => {
            this.updatePlayerUI();
        });

        this.worldEventRouter.on('MATCH_TIME_UPDATE', (timeLeft: number) => {
            this.updatePlayerUI();
        });

        world?.eventRouter.on<PlayerDeathEventPayload>(PlayerEvents.Death, (payload) => {
            payload.victim.matchStats.addDeath();

            if (payload.killer) {
                if (payload.killer === payload.victim) {
                    payload.victim.matchStats.addSuicide();
                } else {
                    payload.killer.matchStats.addKill();
                }
            }

            this.updateStatsUI();
        });
       
    }



    public updatePlayerUI() {
        this.players.forEach(entity => {
            entity.player.ui.sendData({
                type: 'gameStateUpdate',
                state: this.gameStateController.getState(),
                message: this.gameStateController.getStateMessage(),
                isReady: this.gameStateController.isPlayerReady(entity.player.id)
            });
        });
    }

    public updateStatsUI() {
        const players = Array.from(this.players.values());
        const captureData = {
            progress: this.gameModeController.getCaptureProgress(),
            teamColor: this.gameModeController.getCapturePoint()?.partialControlTeam?.color 
                || this.gameModeController.getCurrentControllingTeam()?.color 
                || '#666',
            teamName: this.gameModeController.getCurrentControllingTeam()?.name || 'Neutral'
        };

        // Send match stats update
        const teamStats = {
            Red: players.filter(p => this.getPlayerTeam(p.player)?.name === 'Red')
                     .map(p => ({ 
                         username: p.player.username, 
                         kills: p.matchStats.kills,
                         deaths: p.matchStats.deaths 
                     })),
            Blue: players.filter(p => this.getPlayerTeam(p.player)?.name === 'Blue')
                      .map(p => ({
                          username: p.player.username,
                          kills: p.matchStats.kills,
                          deaths: p.matchStats.deaths
                      })),
            capturePoint: captureData
        };

        // Send both stats updates to each player
        this.players.forEach(entity => {
            if (entity instanceof DamageableEntity) {
                // Send player stats
                entity.player.ui.sendData({
                    type: 'statsUpdate',
                    health: entity.health,
                    stamina: entity.stamina,
                    mana: entity.mana
                });

                // Send match stats
                entity.player.ui.sendData({
                    type: 'matchStatsUpdate',
                    teams: teamStats,
                    capturePoint: teamStats.capturePoint,
                    redTime: this.gameModeController.getTeamTime('Red'),
                    blueTime: this.gameModeController.getTeamTime('Blue'),
                    overtime: this.gameModeController.isInOvertime
                });
            }
        });
    }

    public InitPlayerEntity(player: Player) {

        console.log('InitPlayerEntity ' + player.username);
        const team = this.assignPlayerToTeam(player);
        this.worldEventRouter.emit('PLAYER_ASSIGNED', { player, team });
        
        
        // Create entity controller first
        const entityController = new AbilityEntityController();

        // Create player entity with controller
        const playerEntity = new DamageableEntity({
            player,
            name: 'Player',
            modelUri: 'models/players/player.gltf',
            modelLoopedAnimations: ['idle'],
            modelScale: 0.5,
            controller: entityController, // Use the entity controller
        }, 100, 100, 100);

        // Get spawn position based on team
        const spawnPosition = this.getTeamSpawnPosition(team.name);
        playerEntity.spawn(world, spawnPosition);
        
        //this.localPlayer = playerEntity;


        // Set initial class
        entityController.setClass('wizard');


        const light = new Light({
            attachedToEntity: playerEntity, // the entity to follow
            color: { r: 255, g: 255, b: 255 },
            intensity: 5,
            offset: { x: 0, y: 1.1, z: -1 }, // an offset of the pointlight relative to the attached entity
        });

        playerEntity.light = light;

        light.spawn(world);

        this.InitCamera(playerEntity);

        this.InitUI(playerEntity);
       
        // Add to player map
        this.addPlayer(player, playerEntity);

        this.worldEventRouter.emit('PLAYER.CREATED', playerEntity);

        // Updated UI handler
        playerEntity.player.ui.onData = (playerUI: PlayerUI, data: Record<string, any>) => {
            //console.log('Got data from player UI:', data);

            if (data.type === 'PLAYER_READY') {
                this.setPlayerReady(player.id, true);
                playerUI.sendData({
                    type: 'gameStateUpdate',
                    state: this.gameStateController.getState(),
                    message: this.gameStateController.getStateMessage(),
                    isReady: true
                });
            }
            
            // Add proper CLASS_CHANGE handler
            if (data.type === 'CLASS_CHANGE') {
                this.handleClassChange(player, data.className);
            }

            if (data.type === 'TOGGLE_POINTER_LOCK') {
                playerUI.lockPointer(!data.enabled);
            }

            if (data.type === 'MENU_SYSTEM_READY') {
                console.log('InitUI: Initializing client-side menu system');
               //this.menuSystem.initializeOnClient(data.containerId);
            }
        };
    }

    public InitUI(entity: PlayerEntity) {
        entity.player.ui.load('ui/stats.html');
        
        // Initialize UI
        entity.player.ui.sendData({ 
            type: 'INIT_MENU_SYSTEM' 
        });

        const team = this.getPlayerTeam(entity.player);
        const teamColor = team?.color || '#ffffff';

        const nameplateUI = new SceneUI({
            templateId: 'player-nameplate',
            attachedToEntity: entity,
            offset: { x: 0, y: 1.2, z: 0 },
            state: {
                name: entity.player.username.substring(0, 15),
                health: 100,
                teamColor: teamColor
            }
        });

        nameplateUI.load(world);
        (entity as DamageableEntity).nameplateUI = nameplateUI;
    }
    
    public InitCamera(entity: PlayerEntity) {

        entity.player.camera.setFilmOffset(7);
        //entity.player.camera.setForwardOffset(12.5);
        entity.player.camera.setOffset({ x: 0, y: 0.85, z: 0 });
        entity.player.camera.setZoom(1.3);
        entity.player.camera.setFov(75 );
    }

    public assignPlayerToTeam(player: Player): Team {
        let smallestTeam = this.teams[0];
        for (const team of this.teams) {
            if (team.players.length < smallestTeam.players.length) {
                smallestTeam = team;
            }
        }
        
        // Add player to the team
        smallestTeam.players.push(player);
        console.log(`Assigned ${player.username} to ${smallestTeam.name} team`);
        return smallestTeam;
    }


    public removePlayerFromTeam(player: Player) {
        for (const team of this.teams) {
            team.players = team.players.filter(p => p !== player);
        }
    }

    public getPlayerTeam(player: Player): Team | undefined {
        return this.teams.find(team => team.players.includes(player));
    }

    public getPlayerEntity(playerId: string): DamageableEntity | undefined {
        return this.players.get(playerId);
    }

    public getAllPlayers(): IterableIterator<DamageableEntity> {
        return this.players.values();
    }
    public getPlayers(): Map<string, DamageableEntity> {
        return this.players;
    }

    public addPlayer(player: Player, entity: DamageableEntity) {
        this.players.set(player.id, entity);
    }

    public removePlayer(playerId: string) {
        const entity = this.players.get(playerId);
        if (entity) {
            // Cleanup UI elements
            if (entity.nameplateUI) {
                entity.nameplateUI.unload();
            }
            // Destroy entity if needed
            if (entity.isSpawned) {
                entity.despawn();
            }

            this.players.delete(playerId);
        }
    }

    private getTeamSpawnPosition(teamName: string): Vector3 {
        const spawnArea = this.teamSpawnAreas.get(teamName);
        if (!spawnArea) {
            throw new Error(`No spawn area defined for team ${teamName}`);
        }

        // Get random position within the spawn area
        return new Vector3(
            spawnArea.min.x + Math.random() * (spawnArea.max.x - spawnArea.min.x),
            spawnArea.min.y + Math.random() * (spawnArea.max.y - spawnArea.min.y),
            spawnArea.min.z + Math.random() * (spawnArea.max.z - spawnArea.min.z)
        );
    }

    // Add method to set spawn areas
    public setTeamSpawnArea(teamName: string, min: Vector3, max: Vector3) {
        this.teamSpawnAreas.set(teamName, { min, max });
    }

    private buildCapturePoint(world: World, position: Vector3): CapturePoint {
        // Add capture point
        const mainCapturePoint = new CapturePoint(position, 8, 10, 0.5);
        mainCapturePoint.spawn(world);
        this.capturePoints.push(mainCapturePoint);


        return mainCapturePoint;
    }

    private buildDoor(world: World, position: Vector3, rotation: Quaternion): Entity {
        const door = new Entity({
            modelUri: 'models/structures/door_start_area.gltf',
            modelScale: 4,
            rigidBodyOptions: {
                type: RigidBodyType.KINEMATIC_POSITION,
            },
        });

        door.spawn(world, position);
        door.setRotation(rotation);
        
        this.doors.push(door);
        return door;
    }

    public buildStartAreaDoors(world: World) {

        let redDepthZ = 51.5;
        let blueDepthZ = 50.5;

        const heightY = 4;
        
        // Create doors and add them to the list
        this.buildDoor(world, new Vector3(-18, heightY, redDepthZ), new Quaternion(0, 0, 0, 0));
        this.buildDoor(world, new Vector3(-4, heightY, redDepthZ), new Quaternion(0, 0, 0, 0));
        this.buildDoor(world, new Vector3(-30, heightY, redDepthZ), new Quaternion(0, 0, 0, 0));

        this.buildDoor(world, new Vector3(19, heightY, blueDepthZ * -1), new Quaternion(0, 0, 0, 0));
        this.buildDoor(world, new Vector3(5, heightY, blueDepthZ * -1), new Quaternion(0, 0, 0, 0));
        this.buildDoor(world, new Vector3(31, heightY, blueDepthZ * -1), new Quaternion(0, 0, 0, 0));
    }

    public getDoors(): Entity[] {
        return this.doors;
    }

    public openDoors(open: boolean = true) {
        this.doors.forEach(door => {
            door.setPosition(new Vector3(0, open ? 90 : 0, 0));
        });
    }
    

    // Add these methods to your existing GameManager class
    public setPlayerReady(playerId: string, isReady: boolean) {
        this.gameStateController.setPlayerReady(playerId, isReady);
        
    }

    private lockTeamSwitching(locked: boolean) {
        this.worldEventRouter.emit('TEAM_SWITCHING_LOCKED', locked);
    }

    private lockCharacterSelection(locked: boolean) {
        this.worldEventRouter.emit('CHARACTER_SELECTION_LOCKED', locked);
    }

    

    private resetMatch() {
        // Reset player positions and stats
        this.players.forEach(player => {
            player.respawn();
            const spawnPos = this.getTeamSpawnPosition(this.getPlayerTeam(player.player)?.name || 'Red');
            player.setPosition(spawnPos);
        });
        
        // Clear any game mode specific state
        this.gameModeController.reset();
    }

    public getTeam(teamName: string): Team | undefined {
        return this.teams.find(t => t.name === teamName);
    }

    public handleGameWin(winningTeam: Team) {
        console.log(`${winningTeam.name} team wins!`);
        this.gameStateController.setState(GameState.MatchEnd);
        
        // Handle reset after delay
        setTimeout(() => {
            this.gameModeController.reset();
            this.resetMatch();
            this.gameStateController.setState(GameState.WaitingForEnoughPlayers);
        }, 10000);
    }

    public getGameState(): GameState {
        return this.gameStateController.getState();
    }

    public handleClassChange(player: Player, className: string) {
        const entity = this.players.get(player.id);
        if (entity?.controller instanceof AbilityEntityController) {
            entity.controller.setClass(className);
        }
    }

    public toggleClassSelection() {
        // Send toggle message directly
        this.players.forEach(player => {
            player.player.ui.sendData({
                type: 'TOGGLE_MENU',
                menuId: 'class'
            });
        });
    }

    public showStats() {
        this.players.forEach(player => {
            player.player.ui.sendData({
                type: 'TOGGLE_MENU',
                menuId: 'stats'
            });
        });
    }
}
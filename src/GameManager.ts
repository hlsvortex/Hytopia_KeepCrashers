import { Player, EventRouter, Vector3, PlayerUI, PlayerCameraMode, Audio, SceneUI, PlayerUIEvent } from 'hytopia';
import { Team } from './Team';
import { PlayerEvents, type PlayerDeathEventPayload } from './events';
import { PlayerEntity } from 'hytopia';
import AbilityEntityController from './AbilityEntityController';

import { DamageableEntity } from './DamageableEntity';
import { world } from './GlobalContext';
import { RespawnSystem } from './RespawnSystem';
import { GameState } from './GameState';
import { GameStateController, GameStateEvent } from './GameStateController';
import { GameModeController } from './GameModeController';
import { KingOfTheHill } from './GameModeController';
import { GameSFX } from './sfx';
import { MenuType } from '../assets/ui/scripts/MenuType';

export class GameManager {
    private readonly teams: Team[] = [
        new Team('Red', '#f15b5b'), 
        new Team('Blue', '#5f92f1')
    ];
    private players: Map<string, DamageableEntity> = new Map();
    //private keepLight: Light;
    private gameMusic: Audio | undefined;
    private gameMusicBattle: Audio | undefined;
    private readonly SPAWN_DAMAGE_INTERVAL = 1000; // Damage every 500ms
    private readonly SPAWN_DAMAGE_AMOUNT = 100;
    private lastSpawnDamageTime: Map<string, number> = new Map();

    // Add team spawn areas
    private teamSpawnAreas: Map<string, { min: Vector3, max: Vector3 }> = new Map([
        ['Red', { min: new Vector3(-30, 3, 53), max: new Vector3(-4, 3, 61) }],
        //['Blue', { min: new Vector3(-4, 3, 53), max: new Vector3(-30, 3, 61) }],
        ['Blue', { min: new Vector3(4, 3, -62), max: new Vector3(31, 3, -53) }]
    ]);
 
    private gameStateController: GameStateController;
    // Add to existing properties
    private gameModeController!: GameModeController;


    constructor(private readonly worldEventRouter: EventRouter) {
        this.gameStateController = new GameStateController();
        this.initGame();
        this.startGameLoop();
        this.setupEventListeners();
    }


    private initGame() {

        // Initialize game mode
        this.gameModeController = new KingOfTheHill(this, this.worldEventRouter);
		
	

        // respawn system
        new RespawnSystem(world);

        this.playSongMusic();
    }


    private startGameLoop() {
        setInterval(() => {
            this.gameModeController.update(1); // Update game mode with deltaTime
            this.gameStateController.update(this.players.size);
            this.updateStatsUI();

            this.CheckIfPlayerIsInEnemySpawn(0.5);
        }, 1000);
    }

    private setupEventListeners() {
    
        world.on(GameStateEvent.GAME_STATE_CHANGED, (newState: GameState) => {
            console.log(`GAME_STATE_CHANGED ${newState}!`);
            
            this.updatePlayerUI();
            this.handleGameStateChange(newState);
        });

        world.on(GameStateEvent.POINT_CAPTURED, (team: Team | null) => {
            this.handlePointCapture(team);
        });

		world.on(GameStateEvent.MATCH_COUNTDOWN_UPDATE, (timeLeft: number) => {
            this.updatePlayerUI();
        });

        world.on(GameStateEvent.MATCH_TIME_UPDATE, (timeLeft: number) => {
            this.updatePlayerUI();
        });

        world?.on(PlayerEvents.Death, (payload: PlayerDeathEventPayload) => {
            payload.victim.matchStats.addDeath();

            if (payload.killer) {
                if (payload.killer === payload.victim) {
                    payload.victim.matchStats.addSuicide();
                } else {
                    payload.killer.matchStats.addKill();
                }
            }

            setTimeout(() => {
                this.setPlayerToTeamSpawnArea(payload.victim);
            }, 1500);

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

        // Create entity controller first
        const entityController = new AbilityEntityController();

        const playerModel = team.name === 'Red' ? 'models/players/red_player.gltf' : 'models/players/blue_player.gltf';


        // Create player entity with controller
        const playerEntity = new DamageableEntity({
            player,
            name: 'Player',
            modelUri: playerModel,
            modelLoopedAnimations: ['idle'],
            modelScale: 0.56,
            controller: entityController, // Use the entity controller
			hideNameplate: true
        }, 100, 100, 100);


        // Get spawn position based on team
        const spawnPosition = this.getTeamSpawnPosition(team.name);
		playerEntity.spawn(world, spawnPosition);
        
		console.log('playerEntity', playerEntity.position);


        // Set initial class
        entityController.setClass('wizard');
		// Initialize player UI data
		player.ui.sendData({
			type: 'player-id',
			playerId: player.id,
		});

    
        this.InitCamera(playerEntity);

        this.InitUI(playerEntity);
       
        // Add to player map
        this.addPlayer(player, playerEntity);

        //this.worldEventRouter.emit('PLAYER.CREATED', playerEntity);

        // Updated UI handler
        playerEntity.player.ui.on(PlayerUIEvent.DATA, (payload: { playerUI: PlayerUI, data: Record<string, any> }) => {
            //console.log('Got data from player UI:', data);

            if (payload.data.type === 'PLAYER_READY') {
                this.setPlayerReady(player.id, true);
                payload.playerUI.sendData({
                    type: 'gameStateUpdate',
                    state: this.gameStateController.getState(),
                    message: this.gameStateController.getStateMessage(),
                    isReady: true
                });
            }
  
            // Add proper CLASS_CHANGE handler
            if (payload.data.type === 'CLASS_CHANGE') {
                this.handleClassChange(player, payload.data.className);
            }

            if (payload.data.type === 'TOGGLE_POINTER_LOCK') {
                payload.playerUI.lockPointer(!payload.data.enabled);
            }

            if (payload.data.type === 'MENU_SYSTEM_READY') {
                console.log('InitUI: Initializing client-side menu system');
               //this.menuSystem.initializeOnClient(data.containerId);
            }
        });
    }

    public InitUI(entity: PlayerEntity) {
       
        entity.player.ui.load('ui/index.html');
       
        //entity.player.ui.load('ui/stats.html');

        const team = this.getPlayerTeam(entity.player);
        const teamColor = team?.color || '#ffffff';

        // Disable nameplate UI for now
        
        const nameplateUI = new SceneUI({
            templateId: 'player-nameplate',
            attachedToEntity: entity,
			viewDistance: 8,
            offset: { x: 0, y: 1.2, z: 0 },
            state: {
                name: entity.player.username.substring(0, 15),
                health: 100,
                teamColor: teamColor,
                playerId: entity.player.id
            }
        });

        nameplateUI.load(world);
        (entity as DamageableEntity).nameplateUI = nameplateUI;
        
    }

    
    public InitCamera(entity: PlayerEntity) {

        entity.player.camera.setMode(PlayerCameraMode.FIRST_PERSON);
        entity.player.camera.setFilmOffset(10);

        entity.player.camera.setForwardOffset(-2.5)
        entity.player.camera.setOffset({ x: 0, y: 0.8, z: 0 });
        entity.player.camera.setZoom(1.3);
        entity.player.camera.setFov(80 );
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

    public setPlayerToTeamSpawnArea(entity: PlayerEntity) {
        const team = this.getPlayerTeam(entity.player);
        const spawnPosition = this.getTeamSpawnPosition(team?.name || 'Red');
        entity.setPosition(spawnPosition);
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
    
    
    // Add these methods to your existing GameManager class
    public setPlayerReady(playerId: string, isReady: boolean) {
        this.gameStateController.setPlayerReady(playerId, isReady);
    }
   

    public resetMatch() {
        // Reset player positions and stats
        this.players.forEach(player => {
            // Reset health and position
            player.respawn();
            const spawnPos = this.getTeamSpawnPosition(this.getPlayerTeam(player.player)?.name || 'Red');
            player.setPosition(spawnPos);
            
            // Reset kills and deaths to 0
            player.matchStats.resetStats();
            
            // Close scoreboard screen if open
            player.player.ui.sendData({
                type: 'gameOverSequence',
                state: GameState.WaitingForPlayersReady,
                hideScoreboard: true
            });
        });
        
        // Clear any game mode specific state
        this.gameModeController.reset();
        
		
        // Send broadcast message that stats are reset
        world.chatManager.sendBroadcastMessage(
            "Game has been reset! All player stats have been cleared.",
            "00FFFF"
        );
        
        // Update the UI with reset stats
        this.updateStatsUI();
    }

    public getTeam(teamName: string): Team | undefined {
        return this.teams.find(t => t.name === teamName);
    }

    public handleGameWin(winningTeam: Team) {
        console.log(`${winningTeam.name} team wins!`);
        
        // Send team win message to chat with the team's color
        world.chatManager.sendBroadcastMessage(
            `🏆 ${winningTeam.name.toUpperCase()} TEAM WINS! 🏆`,
            winningTeam.color.replace('#', '')
        );
        
        this.players.forEach(player => {
            player.player.ui.sendData({
                type: 'gameOverSequence',
                state: GameState.MatchEnd,
                winningTeam: winningTeam.name,
                teamColor: winningTeam.color
            });

        });
        this.gameStateController.setState(GameState.MatchEnd);
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

    public showStats() {
        this.players.forEach(player => {
            player.player.ui.sendData({
                type: 'TOGGLE_MENU',
                menuId: 'stats'
            });
        });
    }

    private playGameSound(soundEffect: { uri: string, volume: number }) {
        if (world) {
            const sound = new Audio({
                uri: soundEffect.uri,
                volume: soundEffect.volume
            });
            sound.play(world);
        }
    }

    public handleGameStateChange(newState: GameState) {
        switch (newState) {
            case GameState.MatchStartCountdown:
                this.playGameSound(GameSFX.COUNTDOWN);
                break;
            case GameState.MatchStats:
                this.playSongMusic();
                break;
            case GameState.MatchPlay:
                this.playSongBattleMusic();
                this.playGameSound(GameSFX.MATCH_START);
                break;
            case GameState.MatchEnd:
                this.playGameSound(GameSFX.MATCH_END);
                break;
        }
    }

    public handlePointCapture(team: Team | null) {
        this.playGameSound(GameSFX.POINT_CAPTURE);
        
        // Send a message to all players about the point capture
        if (team) {
            world.chatManager.sendBroadcastMessage(
                `${team.name.toUpperCase()} team has captured the control point!`,
                team.color.replace('#', '')
            );
        } else {
            world.chatManager.sendBroadcastMessage(
                "The control point has been neutralized!",
                "FFFFFF"
            );
        }
    }

    
    // Add method to check if player is in their team's spawn area
    public isPlayerInSpawnArea(player?: Player): boolean {
        if (!player) return false;
        
        const entity = this.players.get(player.id);
        if (!entity) return false;
        
        const team = this.getPlayerTeam(player);
        if (!team) return false;
        
        const spawnArea = this.teamSpawnAreas.get(team.name);
        
        if (!spawnArea) return false;
        
        const pos = entity.position;
        const isInSpawn = this.isPointInSpawnArea(new Vector3(pos.x, pos.y, pos.z), team);

        return isInSpawn;

    }

    public isPointInSpawnArea(point: Vector3, team: Team, expandX: number = 0, expandZ: number = 0) {
        const spawnArea = this.teamSpawnAreas.get(team.name);
        if (!spawnArea) return false;
        
        // Expand the boundaries by the specified range
        const expandedMin = new Vector3(
            spawnArea.min.x - expandX,
            spawnArea.min.y,
            spawnArea.min.z - expandZ
        );
        const expandedMax = new Vector3(
            spawnArea.max.x + expandX,
            spawnArea.max.y,
            spawnArea.max.z + expandZ
        );
        
        return (point.x >= expandedMin.x && point.x <= expandedMax.x) &&
            (point.z >= expandedMin.z && point.z <= expandedMax.z);
    }

    // Add method to check if player is in enemy spawn
    private isPlayerInEnemySpawn(player: Player, expandX: number = 0, expandZ: number = 0): boolean {
        const playerTeam = this.getPlayerTeam(player);
        if (!playerTeam) return false;
        
        // Get enemy team
        const enemyTeam = this.teams.find(t => t.name !== playerTeam.name);
        if (!enemyTeam) return false;
        
        return this.isPointInSpawnArea(
            Vector3.fromVector3Like(this.players.get(player.id)?.position!), 
            enemyTeam,
            expandX,
            expandZ
        );
    }

    public CheckIfPlayerIsInEnemySpawn(deltaMs: number) {
        const currentTime = Date.now();
        
        // Check each player for spawn area damage
        this.players.forEach((entity, playerId) => {
            if (!entity.player) return;
            
            const lastDamageTime = this.lastSpawnDamageTime.get(playerId) || 0;
            if (currentTime - lastDamageTime >= this.SPAWN_DAMAGE_INTERVAL) {
                if (this.isPlayerInEnemySpawn(entity.player, 3, 7)) { // Expand X by 3, Z by 5
                    entity.takeDamage(this.SPAWN_DAMAGE_AMOUNT);
                    this.lastSpawnDamageTime.set(playerId, currentTime);
                }
            }
        });

        // ... rest of tick logic
    }


    private playSongBattleMusic() {

        if (this.gameMusic) {
            this.gameMusic.pause();
        }

        if (!this.gameMusicBattle) {
            this.gameMusicBattle = new Audio({
                uri: 'audio/music/Good Day To Die.mp3',
                loop: true, // Loop the music when it ends
                volume: 0.1, // Relative volume 0 to 1
            });
        }

        this.gameMusicBattle.play(world); // Play the music in our world
    }



    private playSongMusic() {

        if (this.gameMusicBattle) {
            this.gameMusicBattle.pause();
        }

        if (!this.gameMusic) {
            this.gameMusic = new Audio({
                uri: 'audio/music/jungle-theme.mp3',
                loop: true, // Loop the music when it ends
                volume: 0.1, // Relative volume 0 to 1
            });
        }

        this.gameMusic.play(world); // Play the music in our world
    }
}
import { Entity, Vector3, World, RigidBodyType, Quaternion } from 'hytopia';
import { LevelObjectsController } from './LevelObjectsController';
import { HealthPickup } from './pickups/HealthPickup';
import { Light } from 'hytopia';
import { Team } from './Team';
import { GameState } from './GameState';
import { world } from './GlobalContext';
import { GameStateEvent } from './GameStateController';
export class KOTHLevelController extends LevelObjectsController {
    private keepLight: Light;
    private doors: Entity[] = [];

    constructor() {
        super(undefined);

        this.keepLight = new Light({
            position: new Vector3(0, 4.1, 0),
            color: { r: 255, g: 255, b: 255 },
            intensity: 16,
            distance: 17,
        });

        world.on(GameStateEvent.GAME_STATE_CHANGED, (newState: GameState) => {

            if (newState === GameState.MatchStats) {
                this.setupDoors(world);
                this.updateKeepLightColor(null);
            }

            if (newState === GameState.MatchPlay) {
                this.openDoors();
            }
            
        });

        world.on(GameStateEvent.POINT_CAPTURED, (team: Team | null) => {
            this.updateKeepLightColor(team);
        });
    }

    public setupObjects(): void {
        if (!this.world) {
            console.error("World not set for HarvestLevelSetup.");
            return;
        }

        this.keepLight.spawn(this.world);
        this.setupDoors(this.world);
        this.setupPickups();
    }


    public updateKeepLightColor(team: Team | null) {
        if (!team) {
            this.keepLight.setColor({ r: 255, g: 255, b: 255 });
            return;
        }

        const hex = team.color.replace('#', '');
        const r = parseInt(hex.substring(0, 2), 16);
        const g = parseInt(hex.substring(2, 4), 16);
        const b = parseInt(hex.substring(4, 6), 16);
        this.keepLight.setColor({ r, g, b });
    }

    public destroyObjects(): void {
        super.destroyObjects();
        this.keepLight.despawn();
    }
    
    public setupDoors(world: World) {

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

    private setupPickups() {
        // Blue Team Small outpost
        new HealthPickup({
            size: 'large',
            position: new Vector3(-20, 4.5, -24),
            respawnTime: 10  // Respawns after 45 seconds
        });

        //Red Team Large outpost
        new HealthPickup({
            size: 'large',
            position: new Vector3(21, 4.5, 24),
            respawnTime: 10  // Respawns after 20 seconds
        });


        // red Team House Top
        new HealthPickup({
            size: 'large',
            position: new Vector3(-30.5, 9.5, 17.5),
            respawnTime: 10  // Respawns after 45 seconds
        });

        //Blue Team House TOp
        new HealthPickup({
            size: 'large',
            position: new Vector3(31.5, 9.5, -17),
            respawnTime: 10  // Respawns after 20 seconds
        });
    }

    public getDoors(): Entity[] {
        return this.doors;
    }

    public openDoors(open: boolean = true) {

        this.doors.forEach(door => {
            //door.setPosition(new Vector3(0, open ? 90 : 0, 0));
            door.despawn();
        });

        this.doors = [];
    }
} 
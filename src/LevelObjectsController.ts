import { Entity, Vector3, World, EventRouter } from 'hytopia';

export abstract class LevelObjectsController {
    protected entities: Entity[] = []; // Track spawned entities
    protected world?: World;

    constructor(protected eventRouter?: EventRouter) {}

    public setWorld(world: World) {
        this.world = world;
    }

    public abstract setupObjects(): void; // Abstract method to setup objects

    public destroyObjects(): void {
        this.entities.forEach(entity => {
            entity.despawn();
        });
        this.entities = []; // Clear tracked entities
    }

    protected spawnEntity(entity: Entity, position: Vector3) {
        if (!this.world) {
            console.error("World not set for WorldObject.");
            return;
        }
        entity.spawn(this.world, position);
        this.entities.push(entity); // Track spawned entity
    }
} 
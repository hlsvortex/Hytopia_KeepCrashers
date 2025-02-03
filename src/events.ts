import type { BlockType, Entity, Player, Vector3Like } from "hytopia";
import type { DamageableEntity } from "./DamageableEntity";

export const PlayerEvents = {
    Death: 'PLAYER.DEATH',
    Respawn: 'PLAYER.RESPAWN'
};

export interface PlayerDeathEventPayload {
    player: Player;
    deathTime: number;
    victim: DamageableEntity, 
    killer?: DamageableEntity
}

export interface PlayerRespawnEventPayload {
    player: Player;
    respawnTime: number;
} 

export const HitEvents = {
    HitEntity: 'HIT.ENTITY'
};
export interface HitEntityEventPayload {
    entity: Entity | BlockType;
    hitPosition: Vector3Like;
    hitFX: HitFX;
}



enum HitFX {
    Blood = 'blood',
    Smoke = 'smoke',
    Fire = 'fire',
    Explosion = 'explosion'
}

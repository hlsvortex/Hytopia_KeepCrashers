import { Light, startServer, PlayerEntity, World, Player, EventRouter, Entity, RigidBodyType, Quaternion, PlayerUI, Vector3, LightType, SceneUI } from 'hytopia';
import { WizardAbilityController, FighterAbilityController, ArcherAbilityController } from './src/PlayerClass';
import { GameManager } from './src/GameManager';
import worldMap from './assets/keep.json';
import { DamageableEntity } from './src/DamageableEntity';
import MyEntityController from './src/MyEntityController';
import { setWorld, initializeGameManager, gameManager } from './src/GlobalContext';
import { RespawnSystem } from './src/RespawnSystem';
import  AbilityEntityController  from './src/AbilityEntityController';



function buildKeeps(world: World)
{
  const towerRed1 = new Entity({
    modelUri: 'models/structures/keep_power.gltf',
    modelScale: 4, // 10x the default scale
    rigidBodyOptions: {
      type: RigidBodyType.KINEMATIC_POSITION,
    },
  });

  // Spawn the spider in the world.
  towerRed1.spawn(world, { x: -18, y: 2.5, z: 24 }); 
  towerRed1.setRotation ({ x: 0, y: 180, z: 0, w: 0 });
}

startServer(world => {
  
    world.loadMap(worldMap);
    setWorld(world);
    initializeGameManager();
    
    //buildKeeps(world);
    world.simulation.enableDebugRaycasting(true);

    world.setDirectionalLightIntensity(6.5);
    world.setAmbientLightIntensity(0.3);
    world.setDirectionalLightColor({ r: 100, g: 150, b: 230 });

    world.onPlayerJoin = (player: Player) => {
      gameManager.InitPlayerEntity(player);
      world.eventRouter.emit('PLAYER.JOIN', player);
    }

    world.onPlayerLeave = (player: Player) => {
      world.entityManager.getPlayerEntitiesByPlayer(player).forEach(entity => entity.despawn());
      gameManager.removePlayer(player.id);
    };

});
import { Light, startServer, PlayerEntity, World, Player, EventRouter, Entity, RigidBodyType, Quaternion, PlayerUI, Vector3, LightType, SceneUI } from 'hytopia';
import worldMap from './assets/keep.json';
import { setWorld, initializeGameManager, gameManager } from './src/GlobalContext';


startServer(world => {
  
    world.loadMap(worldMap);
    setWorld(world);
    initializeGameManager();
    
    //buildKeeps(world);
    //world.simulation.enableDebugRaycasting(true);

    world.setDirectionalLightIntensity(6.5);
    world.setAmbientLightIntensity(0.4);
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
import { Light, startServer, PlayerEntity, World, Player, EventRouter, Entity, RigidBodyType, Quaternion, PlayerUI, Vector3, LightType, SceneUI, PlayerEvent } from 'hytopia';
import worldMap from './assets/keep.json';
import { setWorld, initializeGameManager, gameManager } from './src/GlobalContext';
import { PlayerEvents } from './src/events';


startServer(world => {
  
    world.loadMap(worldMap);
    setWorld(world);
    initializeGameManager();
    
    //buildKeeps(world);
    //world.simulation.enableDebugRaycasting(true);

    world.setDirectionalLightIntensity(6.5);
    world.setAmbientLightIntensity(0.4);
    world.setDirectionalLightColor({ r: 100, g: 150, b: 230 });

	world.on(PlayerEvent.JOINED_WORLD, ({ player }) => {

	  console.log('Player joined world', player.id);
      gameManager.InitPlayerEntity( player);
	  //console.log('Player joined world', payload.player);	
	  //world.on
      //world.eventRouter.emit('PLAYER.JOIN', player);
    });

    world.on(PlayerEvent.LEFT_WORLD, (payload: { player: Player; world: World }) => {
      world.entityManager.getPlayerEntitiesByPlayer(payload.player).forEach(entity => entity.despawn());
      gameManager.removePlayer(payload.player.id);
    });

});
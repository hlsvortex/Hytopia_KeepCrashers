import { World } from 'hytopia';
import { GameManager } from './GameManager';


export let world: World;
export let gameManager: GameManager;

export function setWorld(newWorld: World) {
    world = newWorld;
}

export function initializeGameManager() {
    gameManager = new GameManager(world);
} 
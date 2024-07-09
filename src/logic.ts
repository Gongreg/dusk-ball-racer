import type { DuskClient, PlayerId } from "dusk-games-sdk/multiplayer";
import { physics } from "toglib/logic";

export type Coordinates = physics.Vector2;

export interface GameState {
  world: physics.World;
  ballIds: Record<string, PlayerId>;
  playerBalls: Record<number, PlayerId>;
}

type GameActions = {
  startDrag: () => void;
  release: (force: physics.Vector2) => void;
};

declare global {
  const Dusk: DuskClient<GameState, GameActions>;
}

Dusk.initLogic({
  landscape: true,
  reactive: false,
  inputDelay: 50,
  minPlayers: 2,
  maxPlayers: 4,
  setup: (allPlayerIds) => {
    const ballIds = {};
    const playerBalls = {};
    const world = physics.createWorld(physics.newVec2(0, 0));

    allPlayerIds.forEach((playerId, index) => {
      const ball = physics.createCircle(
        world,
        { x: 30 * index, y: 50 },
        30,
        10000,
        0.9,
        0.5,
      );

      ballIds[ball.id] = playerId;
      playerBalls[playerId] = ball.id;

      physics.addBody(world, ball);
    });

    const walls = [
      physics.createRectangle(world, { x: 0, y: 0 }, 300, 20, 0, 0, 0.8),
      physics.createRectangle(world, { x: 0, y: 300 }, 300, 20, 0, 0, 0.8),
      physics.createRectangle(world, { x: -150, y: 150 }, 20, 300, 0, 0, 0.8),
      physics.createRectangle(world, { x: 150, y: 150 }, 20, 300, 0, 0, 0.8),
    ];

    walls.forEach((wall) => {
      physics.addBody(world, wall);
    });

    return {
      world,
      ballIds,
      playerBalls,
    };
  },
  actions: {
    startDrag: (_, { game }) => {
      // game.world.dynamicBodies[0].velocity.x *= 0.1;
      // game.world.dynamicBodies[0].velocity.y *= 0.1;
    },
    release: (force, { game, playerId }) => {
      game.world.dynamicBodies.find(
        (b) => b.id === game.playerBalls[playerId],
      ).velocity = force;
    },
  },
  updatesPerSecond: 30,
  update: ({ game }) => {
    physics.worldStep(30, game.world);

    console.log(game.world.dynamicBodies);
  },
});

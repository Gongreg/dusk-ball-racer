import "./styles.css";

import * as PIXI from "pixi.js";
import { Viewport } from "pixi-viewport";
import { Container, FederatedPointerEvent } from "pixi.js";
import { Coordinates, GameState } from "./logic.ts";
import { Interpolator, InterpolatorLatency } from "dusk-games-sdk";
import { PlayerId } from "dusk-games-sdk/multiplayer";
// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container
const app = new PIXI.Application();

await app.init({ background: "#1099bb", resizeTo: window });

// The application will create a canvas element for you that you
// can then insert into the DOM
document.body.appendChild(app.canvas);

// create viewport
const viewport = new Viewport({
  screenWidth: window.innerWidth,
  screenHeight: window.innerHeight,
  worldWidth: 3000,
  worldHeight: 3000,

  events: app.renderer.events, // the interaction module is important for wheel to work properly when renderer.view is placed or scaled
});
// Load the tile texture
const texture = await PIXI.Assets.load("https://pixijs.com/assets/p2.jpeg");

const tilingSprite = new PIXI.TilingSprite({
  texture,
  x: -1000,
  y: -1000,
  width: app.screen.width * 100,
  height: app.screen.height * 100,
  scale: 0.2,
});

viewport.addChild(tilingSprite);

// activate plugins
viewport.wheel().decelerate();

// add the viewport to the stage
app.stage.addChild(viewport);

let balls: Record<string, PIXI.Graphics> = {};
let dragLine: PIXI.Graphics;

app.stage.on("pointerdown", onDragStart);
app.stage.on("pointerup", onDragEnd);
app.stage.on("pointerupoutside", onDragEnd);

let dragTarget: Container<any> | null;
let dragStart: Coordinates;

app.stage.eventMode = "static";
app.stage.hitArea = app.screen;

function onDragStart(event: FederatedPointerEvent) {
  dragStart = {
    x: event.x,
    y: event.y,
  };

  dragLine = new PIXI.Graphics();

  app.stage.addChild(dragLine);

  dragTarget = event.target;
  app.stage.on("pointermove", onDragMove);

  Dusk.actions.startDrag();
}

function onDragMove(event: FederatedPointerEvent) {
  if (dragTarget) {
    const vec = {
      x: dragStart.x - event.x,
      y: dragStart.y - event.y,
    };

    const mag = Math.sqrt(vec.x * vec.x + vec.y * vec.y);

    const normalized = {
      x: vec.x / mag,
      y: vec.y / mag,
    };

    const length = 20;

    const front = {
      x: normalized.x * length,
      y: normalized.y * length,
    };

    const rotated = {
      y: normalized.x * -1 * length,
      x: normalized.y * length,
    };

    dragLine = dragLine
      .clear()
      .moveTo(event.x, event.y)
      .lineTo(dragStart.x + rotated.x, dragStart.y + rotated.y)
      .lineTo(dragStart.x + front.x, dragStart.y + front.y)
      .lineTo(dragStart.x - rotated.x, dragStart.y - rotated.y)
      .fill({ color: 0xffffff, alpha: 0.5 });
  }
}

function onDragEnd(event: FederatedPointerEvent) {
  if (dragTarget) {
    app.stage.off("pointermove", onDragMove);
    dragLine.destroy();
    dragTarget.alpha = 1;
    dragTarget = null;

    const vec = {
      x: dragStart.x - event.x,
      y: dragStart.y - event.y,
    };

    Dusk.actions.release(vec);
  }
}

let init = false;
let game: GameState;

const ballInterpolators: Record<
  PlayerId,
  Interpolator<[number, number]> | InterpolatorLatency<[number, number]>
> = {};

PIXI.Ticker.shared.add(() => {
  if (init) {
    Object.keys(ballInterpolators).forEach((playerId) => {
      const ballPosition = ballInterpolators[playerId].getPosition();

      balls[game.playerBalls[playerId]].position.set(
        ballPosition[0],
        ballPosition[1],
      );
    });
  }
});

Dusk.initClient({
  onChange: (params) => {
    game = params.game;
    if (!init) {
      init = true;

      Object.keys(game.ballIds).forEach((ballId) => {
        balls[ballId] = new PIXI.Graphics().circle(0, 0, 30).fill(0xffffff);
        viewport.addChild(balls[ballId]);
      });

      params.game.world.staticBodies.forEach((body) => {
        viewport.addChild(
          new PIXI.Graphics()
            .rect(
              body.center.x - body.width / 2,
              body.center.y - body.height / 2,
              body.width,
              body.height,
            )
            .fill(0x000000),
        );
      });

      const yourBallId = params.yourPlayerId
        ? game.playerBalls[params.yourPlayerId]
        : Object.values(game.playerBalls)[0];

      viewport.follow(balls[yourBallId]);

      Object.keys(game.playerBalls).forEach((playerId) => {
        if (playerId === params.yourPlayerId) {
          ballInterpolators[playerId] = Dusk.interpolator();
        } else {
          ballInterpolators[playerId] = Dusk.interpolatorLatency<
            [number, number]
          >({
            maxSpeed: 100,
            timeToMaxSpeed: 100,
          });
        }
      });
    }

    Object.keys(ballInterpolators).forEach((playerId) => {
      const obj = params.game.world.dynamicBodies.find(
        (b) => b.id === game.playerBalls[playerId],
      )!;

      const ftr = params.futureGame.world.dynamicBodies.find(
        (b) => b.id === game.playerBalls[playerId],
      )!;

      ballInterpolators[playerId].update({
        game: [obj.center.x, obj.center.y],
        futureGame: [ftr.center.x, ftr.center.y],
      });
    });
  },
});

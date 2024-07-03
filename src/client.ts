import './styles.css'

import * as PIXI from 'pixi.js';

// The application will create a renderer using WebGL, if possible,
// with a fallback to a canvas render. It will also setup the ticker
// and the root stage PIXI.Container
const app = new PIXI.Application();

await app.init({ background: '#1099bb', resizeTo: window });

// The application will create a canvas element for you that you
// can then insert into the DOM
document.body.appendChild(app.canvas);

const gr  = new PIXI.Graphics()
  .fill(0xffffff)
  .circle(30, 30, 30);

app.stage.addChild(gr)

app.render()

Dusk.initClient({
  onChange: () => {}
})
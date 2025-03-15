import Canvas from './libCanvas.js';
import appPlatform from '../../../../js/appPlatform.js';

var canvas = new Canvas(appPlatform);

function loop(timestamp) {
    canvas.loop(timestamp);
    canvas.draw();
    requestAnimationFrame(loop);
} // loop

loop();

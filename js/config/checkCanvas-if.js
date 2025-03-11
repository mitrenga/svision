import Canvas from './libCanvas-if.js';
import appPlatform from '../../../../js/appPlatform.js';

var canvas = new Canvas(appPlatform);

function loop() {
    canvas.loop();
    canvas.draw();
    requestAnimationFrame(loop);
} // loop

loop();

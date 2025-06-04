const { Canvas } = await import('./libCanvas.js?ver='+window.srcVersion);
const { appPlatform } = await import('../../../appPlatform.js?ver='+window.srcVersion);

var canvas = new Canvas(appPlatform());

function loop(timestamp) {
    canvas.loop(timestamp);
    canvas.draw();
    requestAnimationFrame(loop);
} // loop

loop();

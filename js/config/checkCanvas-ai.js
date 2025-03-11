const { Canvas } = await import('./libCanvas.js?ver='+window.srcVersion);
const { appPlatform } = await import('../../../appPlatform.js?ver='+window.srcVersion);

var canvas = new Canvas(appPlatform);

function loop() {
    canvas.loop();
    canvas.draw();
    requestAnimationFrame(loop);
} // loop

loop();

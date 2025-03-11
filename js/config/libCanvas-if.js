/*/

/*/

/**/

class Player {

    constructor(side, posX, posY) {
        this.side = side;
        this.posX = posX;
        this.posY = posY;
    } // constuctor

    loopGame(canvasWidth, canvasHeight, ballDirectionX, ballPosY) {
        if ((this.side == 'l' && ballDirectionX < 0) || (this.side == 'r' && ballDirectionX > 0)) {
            if (this.posY > 30 && ballPosY < this.posY) this.posY--;
            if (this.posY < canvasHeight-30 && ballPosY > this.posY) this.posY++;
        }
    } // loopGame

    draw(ctx) {
        ctx.fillRect(this.posX-5, this.posY-20, 10, 40);
    } // draw

} // class Player


class Ball {

    constructor(posX, posY) {
        this.posX = posX;
        this.posY = posY;
        this.directionX = 1;
        this.directionY = 1;
    } // constuctor

    loopGame(canvasWidth, canvasHeight) {
        this.posX += this.directionX;
        this.posY += this.directionY;
        if (this.posX == canvasWidth-20) this.directionX = -1;
        if (this.posY == canvasHeight-15) this.directionY = -1;
        if (this.posX == 20) this.directionX = 1;
        if (this.posY == 15) this.directionY = 1;
    } // loopGame

    draw(ctx) {
        ctx.fillRect(this.posX-5, this.posY-5, 10, 10);
    } // draw

} // class Ball


export class Canvas {

    constructor(platform) {
        this.elementObj = document.getElementById('canvas');
        this.ctx = this.elementObj.getContext('2d');
        this.canvasWidth = 300;
        this.canvasHeight = 200;
        this.elementObj.width = this.canvasWidth;
        this.elementObj.height = this.canvasHeight;
        this.elementObj.style.bkColor = '#CCCCCC';
        this.lastTime = null;
        this.cntFrames = 0;
        this.fps = -1;
        this.ball = new Ball(this.canvasWidth/2, this.canvasHeight/2);
        this.leftPlayer = new Player('l', 10, this.ball.posY);
        this.rightPlayer = new Player('r', this.canvasWidth-10, this.ball.posY);
        document.getElementById('platform').innerText = platform.platformName();
    } // constructor

    draw() {
        this.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.ctx.fillStyle = 'black';
        this.ctx.fillRect(0, 0, this.canvasWidth, 10);
        this.ctx.fillRect(0, this.canvasHeight-10, this.canvasWidth, 10);
        this.ball.draw(this.ctx);
        this.leftPlayer.draw(this.ctx);
        this.rightPlayer.draw(this.ctx);
        this.ctx.font = "16px Times";
        if (this.fps >= 0) this.ctx.fillText(this.fps+" fps", 5, this.canvasHeight-15);
    } // draw

    loop() {
        this.countFrames++;

        this.ball.loopGame(this.canvasWidth, this.canvasHeight);
        this.leftPlayer.loopGame(this.canvasWidth, this.canvasHeight, this.ball.directionX, this.ball.posY);
        this.rightPlayer.loopGame(this.canvasWidth, this.canvasHeight, this.ball.directionX, this.ball.posY);

        var now = Date.now();
        var timeDiff;
        if (this.lastTime != null) timeDiff = now - this.lastTime; else this.lastTime = now;
        if (timeDiff >= 1000) {
            this.fps = this.countFrames;
            this.lastTime = now;
            this.countFrames = 0;
        }
        window.canvasRunning = true;
    } // loop

} // class Canvas

export default Canvas;

class Label {

    constructor(parentElement) {
        this.posX = 0;
        this.posY = 0;
        this.directionX = 1;
        this.directionY = 1;

        this.elementLabel = document.createElement('div');
        this.elementLabel.innerText = 'HELLO';
        this.elementLabel.id = 'labelHello';
        this.elementLabel.classList.add('labelHello');
        parentElement.appendChild(this.elementLabel);
        this.labelWidth = Math.ceil(this.elementLabel.clientWidth);
        this.labelHeight = Math.ceil(this.elementLabel.clientHeight);

        this.elementFPS = document.createElement('div');
        this.elementFPS.id = 'labelFPS';
        this.elementFPS.classList.add('labelFPS');
        parentElement.appendChild(this.elementFPS);
    } // constuctor

    loopAnimate(canvasWidth, canvasHeight) {
        this.posX += this.directionX;
        this.posY += this.directionY;
        if (this.posX == canvasWidth-this.labelWidth) this.directionX = -1;
        if (this.posY == canvasHeight-this.labelHeight) this.directionY = -1;
        if (this.posX == 0) this.directionX = 1;
        if (this.posY == 0) this.directionY = 1;
    } // loopAnimate

    draw(canvasWidth, canvasHeight, fps) {
        this.elementLabel.style.left = this.posX+'px';
        this.elementLabel.style.top = this.posY+'px';
        if (fps > 0) {
            this.elementFPS.style.left = canvasWidth/2-this.elementFPS.clientWidth/2-this.labelWidth+'px';
            this.elementFPS.style.top = canvasHeight-2*this.elementFPS.clientHeight+'px';
            this.elementFPS.innerText = fps+' fps';
        }
    } // draw

} // Label

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

} // Player


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

} // Ball


export class Canvas {

    constructor(platform) {
        document.getElementById('platform').innerText = platform.platformName();
        this.stack = {};
        platform.initCanvasElement(this, 'parentCanvas');
        this.canvasWidth = 300;
        this.canvasHeight = 200;
        this.element.width = this.canvasWidth;
        this.element.height = this.canvasHeight;
        this.element.style.textAlign = 'left';
        this.prevTimestamp = 0;
        this.cntFrames = 0;
        this.fps = -1;
        this.init();
    } // constructor

    init() {
        switch (this.stack.containerType) {
            case 'html':
                this.stack.label = new Label(this.element);
                break;
            case 'canvas2D':
                this.stack.ball = new Ball(this.canvasWidth/2, this.canvasHeight/2);
                this.stack.leftPlayer = new Player('l', 10, this.stack.ball.posY);
                this.stack.rightPlayer = new Player('r', this.canvasWidth-10, this.stack.ball.posY);
                break;
        }
    } // init

    drawHTML() {
        this.stack.label.draw(this.canvasWidth, this.canvasHeight, this.fps);
    } // drawHTML

    drawCanvas2D() {
        this.stack.ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);
        this.stack.ctx.fillStyle = 'black';
        this.stack.ctx.fillRect(0, 0, this.canvasWidth, 10);
        this.stack.ctx.fillRect(0, this.canvasHeight-10, this.canvasWidth, 10);
        this.stack.ctx.fillStyle = 'white';
        this.stack.ball.draw(this.stack.ctx);
        this.stack.ctx.fillStyle = 'aquamarine';
        this.stack.leftPlayer.draw(this.stack.ctx);
        this.stack.ctx.fillStyle = 'gold';
        this.stack.rightPlayer.draw(this.stack.ctx);
        this.stack.ctx.fillStyle = 'white';
        this.stack.ctx.font = '16px Times';
        this.stack.ctx.textAlign = 'center';
        if (this.fps >= 0) {
            this.stack.ctx.fillText(this.fps+' fps', this.canvasWidth/2, this.canvasHeight-15);
        }
    } // drawCanvas2D

    draw() {
        switch (this.stack.containerType) {
            case 'html':
                this.drawHTML();
                break;
            case 'canvas2D':
                this.drawCanvas2D();
                break;
        }
    } // draw

    loopHTML() {
        this.stack.label.loopAnimate(this.canvasWidth, this.canvasHeight);
    } // loopHTML

    loopCanvas2D() {
        this.stack.ball.loopGame(this.canvasWidth, this.canvasHeight);
        this.stack.leftPlayer.loopGame(this.canvasWidth, this.canvasHeight, this.stack.ball.directionX, this.stack.ball.posY);
        this.stack.rightPlayer.loopGame(this.canvasWidth, this.canvasHeight, this.stack.ball.directionX, this.stack.ball.posY);
    } // loopCanvas2D

    loop(timestamp) {
        window.canvasRunning = true;
        this.countFrames++;
        switch (this.stack.containerType) {
            case 'html':
                this.loopHTML();
                break;
            case 'canvas2D':
                this.loopCanvas2D();
                break;
        }
        if (timestamp-this.prevTimestamp >= 1000) {
            this.fps = this.countFrames;
            this.prevTimestamp = timestamp;
            this.countFrames = 0;
        }
    } // loop

} // Canvas

export default Canvas;

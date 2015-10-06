var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue             = require('monologue.js'),
    IMAGE_READY_TOPIC     = 'image-ready',
    MODEL_CHANGE_TOPIC          = 'model-change';

// MagicLensImageBuilder Object ----------------------------------------------

export default class MagicLensImageBuilder {

    constructor(frontImageBuilder, backImageBuilder, lensColor="#ff0000", minZoom = 0.1, maxZoom = 0.5) {
        // Keep track of internal image builders
        this.frontImageBuilder = frontImageBuilder;
        this.backImageBuilder = backImageBuilder;
        this.frontEvent = null;
        this.backEvent = null;

        // Internal render
        this.frontSubscription = this.frontImageBuilder.onImageReady( (data, envelope) => {
            this.frontEvent = data;
            this.draw();
        });

        this.backSubscription = this.backImageBuilder.onImageReady( (data, envelope) => {
            this.backEvent = data;
            this.draw();
        });

        // Lens informations
        this.width = frontImageBuilder.getDimensions()[0],
        this.height = frontImageBuilder.getDimensions()[1];
        this.frontActive = true;
        this.minZoom = this.width * minZoom;
        this.maxZoom = this.width * maxZoom;
        this.lensColor   = lensColor;
        this.lensCenterX = this.width / 2;
        this.lensCenterY = this.height / 2;
        this.lensOriginalCenterX = this.lensCenterX;
        this.lensOriginalCenterY = this.lensCenterY;
        this.lensRadius  = Math.floor( Math.min(this.width, this.height) / 5 );
        this.lensOriginalRadius = this.lensRadius;

        // Rendering buffer
        this.bgCanvas = new CanvasOffscreenBuffer(this.width, this.height);

        // Create custom listener for lens drag + zoom
        this.listener = {
            drag: (event, envelope) => {
                    var eventManaged = false,
                        activeArea = event.activeArea,
                        xRatio = (event.relative.x - activeArea[0]) / activeArea[2],
                        yRatio = (event.relative.y - activeArea[1]) / activeArea[3];

                    // Clamp bounds
                    xRatio = (xRatio < 0) ? 0 : (xRatio > 1) ? 1 : xRatio;
                    yRatio = (yRatio < 0) ? 0 : (yRatio > 1) ? 1 : yRatio;

                    var xPos = Math.floor(xRatio * this.width),
                        yPos = Math.floor(yRatio * this.height),
                        distFromLensCenter = Math.pow(xPos - this.lensCenterX, 2) + Math.pow(yPos - this.lensCenterY, 2);

                    if(event.isFirst) {
                        this.lensOriginalCenterX = this.lensCenterX;
                        this.lensOriginalCenterY = this.lensCenterY;
                    }

                    if(distFromLensCenter < Math.pow(this.lensRadius, 2) && event.modifier === 0) {
                        eventManaged = true;

                        this.lensCenterX = this.lensOriginalCenterX + event.deltaX;
                        this.lensCenterY = this.lensOriginalCenterY + event.deltaY;

                        // Make sure the lens can't go out of image
                        this.lensCenterX = Math.max(this.lensCenterX, this.lensRadius);
                        this.lensCenterY = Math.max(this.lensCenterY, this.lensRadius);
                        this.lensCenterX = Math.min(this.lensCenterX, this.width - this.lensRadius);
                        this.lensCenterY = Math.min(this.lensCenterY, this.height - this.lensRadius);

                        if(event.isFinal) {
                            this.lensOriginalCenterX = this.lensCenterX;
                            this.lensOriginalCenterY = this.lensCenterY;
                        }

                        this.draw();
                    }

                    // Handle mouse listener if any
                    var ibListener = this.frontImageBuilder.getListeners();
                    if(!eventManaged && ibListener && ibListener.drag) {
                        eventManaged = ibListener.drag(event, envelope);
                    }

                    return eventManaged;
                },
            zoom: (event, envelope) => {
                var eventManaged = false,
                    activeArea = event.activeArea,
                    xRatio = (event.relative.x - activeArea[0]) / activeArea[2],
                    yRatio = (event.relative.y - activeArea[1]) / activeArea[3];

                // Clamp bounds
                xRatio = (xRatio < 0) ? 0 : (xRatio > 1) ? 1 : xRatio;
                yRatio = (yRatio < 0) ? 0 : (yRatio > 1) ? 1 : yRatio;

                var xPos = Math.floor(xRatio * this.width),
                    yPos = Math.floor(yRatio * this.height),
                    distFromLensCenter = Math.pow(xPos - this.lensCenterX, 2) + Math.pow(yPos - this.lensCenterY, 2);

                if(distFromLensCenter < Math.pow(this.lensRadius, 2) && event.modifier === 0) {
                    eventManaged = true;

                    if(event.isFirst) {
                        this.lensOriginalRadius = this.lensRadius;
                    }
                    var zoom = this.lensOriginalRadius * event.scale;

                    if(zoom < this.minZoom) {
                        zoom = this.minZoom;
                    }
                    if(zoom > this.maxZoom ) {
                        zoom = this.maxZoom;
                    }

                    if(this.lensRadius !== zoom) {
                        this.lensRadius = zoom;
                        this.draw();
                    }

                    if(event.isFinal) {
                        this.lensOriginalRadius = this.lensRadius;
                    }
                }

                // Handle mouse listener if any
                var ibListener = this.frontImageBuilder.getListeners();
                if(!eventManaged && ibListener && ibListener.zoom) {
                    eventManaged = ibListener.zoom(event, envelope);
                }

                return eventManaged;
            }
        };
    }

    // ------------------------------------------------------------------------

    draw() {
        if(!this.frontEvent || !this.backEvent) {
            return;
        }

        // Draw
        var ctx = this.bgCanvas.get2DContext();
        ctx.clearRect(0, 0, this.width, this.height);

        // Draw the outside
        ctx.drawImage(this.backEvent.canvas,
                      this.backEvent.area[0], this.backEvent.area[1],
                      this.backEvent.area[2], this.backEvent.area[3],
                      0, 0, this.width, this.height);

        // Record state for undo clip
        ctx.save();

        // Create lens mask
        ctx.beginPath();
        ctx.arc(this.lensCenterX, this.lensCenterY, this.lensRadius, 0, 2 * Math.PI);
        ctx.clip();

        // Empty lens content
        ctx.clearRect(0, 0, this.width, this.height);

        // Draw only in the lens
        ctx.drawImage(this.frontEvent.canvas,
                      this.frontEvent.area[0], this.frontEvent.area[1],
                      this.frontEvent.area[2], this.frontEvent.area[3],
                      0, 0, this.width, this.height);

        // Restore clip
        ctx.restore();

        // Draw lens edge
        ctx.beginPath();
        ctx.lineWidth = 4;
        ctx.strokeStyle = this.lensColor;
        ctx.arc(this.lensCenterX, this.lensCenterY, this.lensRadius, 0, 2 * Math.PI);
        ctx.closePath();
        ctx.stroke();

        // Trigger image ready event
        var readyImage = {
            canvas: this.bgCanvas.el,
            area: [0, 0, this.width, this.height],
            outputSize: [this.width, this.height],
            builder: this,
            arguments: this.frontEvent.arguments
        };

        // Let everyone know the image is ready
        this.emit(IMAGE_READY_TOPIC, readyImage);
    }

    // ------------------------------------------------------------------------

    update() {
        this.frontImageBuilder.update();
        this.backImageBuilder.update();
    }

    // ------------------------------------------------------------------------

    render() {
        this.frontImageBuilder.render();
        this.backImageBuilder.render();
    }

    // ------------------------------------------------------------------------

    onImageReady(callback) {
        return this.on(IMAGE_READY_TOPIC, callback);
    }

    // ------------------------------------------------------------------------

    onModelChange(callback) {
        return this.on(MODEL_CHANGE_TOPIC, callback);
    }

    // ------------------------------------------------------------------------

    getListeners() {
        return this.listener;
    }

    // ------------------------------------------------------------------------

    destroy() {
        this.off();
        this.listener = null;

        this.frontSubscription.unsubscribe();
        this.frontSubscription = null;

        this.backSubscription.unsubscribe();
        this.backSubscription = null;

        this.frontImageBuilder.destroy();
        this.backImageBuilder.destroy();
    }

    // ------------------------------------------------------------------------

    getActiveImageBuilder() {
        return this.frontActive ? this.frontImageBuilder : this.backImageBuilder;
    }

    // ------------------------------------------------------------------------

    isFront() {
        return this.frontActive;
    }

    // ------------------------------------------------------------------------

    toggleLens() {
        this.frontActive = !this.frontActive;
        this.emit(MODEL_CHANGE_TOPIC);
    }

    // ------------------------------------------------------------------------

    getQueryDataModel() {
        return this.frontImageBuilder.getQueryDataModel();
    }
}

// Add Observer pattern using Monologue.js
Monologue.mixInto(MagicLensImageBuilder);

var offscreenCanvasCount = 0;

// Create <canvas/> within the DOM
export default function CanvasOffscreenBuffer(width, height) {
    this.id = 'CanvasOffscreenBuffer_' + (++offscreenCanvasCount);
    this.el = document.createElement('canvas');
    this.width = width;
    this.height = height;

    this.el.style.display = 'none';
    this.el.setAttribute('width', this.width);
    this.el.setAttribute('height', this.height);

    document.body.appendChild(this.el);
}

CanvasOffscreenBuffer.prototype.size = function(width, height) {
    if(width) {
        this.el.setAttribute('width', this.width = width);
    }
    if(height) {
        this.el.setAttribute('height', this.height = height);
    }
    return [ Number(this.width), Number(this.height) ];
};

CanvasOffscreenBuffer.prototype.get2DContext = function() {
    return this.el.getContext("2d");
};

// Remove canvas from DOM
CanvasOffscreenBuffer.prototype.delete = function() {
    this.el.parentNode.removeChild(this.el);
    this.el = null;
    this.width = null;
    this.height = null;
};

CanvasOffscreenBuffer.prototype.toDataURL = function() {
    return this.el.toDataURL();
};

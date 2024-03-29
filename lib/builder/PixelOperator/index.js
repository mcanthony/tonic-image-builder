var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    Monologue = require('monologue.js'),
    IMAGE_READY_TOPIC = 'image-ready';

// ----------------------------------------------------------------------------

export default function PixelOperationImageBuilder(operation='a-b', dependency=['a','b']) {
    this.data = {};
    this.listeners = {};
    this.dataSize = [200, 200];
    this.operation = operation;
    this.dependency = dependency;
    this.bgCanvas = new CanvasOffscreenBuffer(this.dataSize[0], this.dataSize[1]);
}

// ----------------------------------------------------------------------------

Monologue.mixInto(PixelOperationImageBuilder);

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.getDimensions = function() {
    return this.dataSize;
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.setOperation = function(expression) {
    this.operation = expression;
    this.processData();
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.getOperation = function() {
    return this.operation;
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.setDependencies = function(dependencyList) {
    this.dependency = dependencyList;
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.updateOperationFunction = function() {
    var functionBody = [],
        isValid = true;
    for(var key in this.data) {
        functionBody.push('var X = data.X[i];'.replace(/X/g, key));
    }
    this.dependency.forEach((dep) => {
        isValid = this.data[dep] && isValid
    });

    functionBody.push('return X;'.replace(/X/g, this.operation));
    this.fnOperation = new Function('data', 'i', functionBody.join(''));

    return isValid;
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.updateData = function(name, imageReadyEvent) {
    // Extract image data
    var area = imageReadyEvent.area,
        srcCanvas = imageReadyEvent.canvas,
        x = area[0],
        y = area[1],
        width = area[2],
        height = area[3],
        ctx = this.bgCanvas.get2DContext(),
        extractedData = new Uint8ClampedArray(width*height*4),
        pixelBuffer = null;

    this.bgCanvas.size(width, height);
    ctx.drawImage(srcCanvas, x, y, width, height, 0, 0, width, height);
    pixelBuffer = ctx.getImageData(0, 0, width, height);
    extractedData.set(pixelBuffer.data);

    // Store the given array
    this.data[name] = extractedData;
    this.dataSize = [width, height];

    // Is dependency meet?
    var canProcess = true;
    this.dependency.forEach((name) => {
        if(!this.data[name]) {
            canProcess = false;
        }
    })

    if(canProcess) {
        this.processData();
    }
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.updateDataFromImage = function(name, image) {
    var registerImage = () => {
        // Remove callback if any
        image.removeEventListener('load', registerImage);

        // Extract image data
        var width = image.width,
            height = image.height,
            ctx = this.bgCanvas.get2DContext(),
            extractedData = new Uint8ClampedArray(width*height*4),
            pixelBuffer = null;

        this.bgCanvas.size(width, height);
        ctx.drawImage(image, 0, 0);
        pixelBuffer = ctx.getImageData(0, 0, width, height);
        extractedData.set(pixelBuffer.data);

        // Store the given array
        this.data[name] = extractedData;
        this.dataSize = [width, height];

        // Is dependency meet?
        var canProcess = true;
        this.dependency.forEach((name) => {
            if(!this.data[name]) {
                canProcess = false;
            }
        })

        if(canProcess) {
            this.processData();
        }
    }

    if(image.complete) {
        registerImage();
    } else {
        image.addEventListener('load', registerImage);
    }
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.updateDataFromClampedArray = function(name, array, size) {
    // Store the given array
    this.data[name] = array;
    this.dataSize = size || this.dataSize;

    // Is dependency meet?
    var canProcess = true;
    this.dependency.forEach((name) => {
        if(!this.data[name]) {
            canProcess = false;
        }
    })

    if(canProcess) {
        this.processData();
    }
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.processData = function() {
    if(!this.updateOperationFunction()) {
        // We are not ready yet
        return;
    }

    // Validate Array sizes
    var size = -1,
        sizeValid = true;
    for(var key in this.data) {
        var array = this.data[key];
        if(size === -1) {
            size = array.length;
        } else {
            sizeValid = sizeValid && (size === array.length);
        }
    }

    if(!sizeValid || size === -1) {
        console.log('The array size are invalid!!!', size);
        return;
    }

    if(this.dataSize[0]*this.dataSize[1]*4 !== size) {
        console.log('The array size are invalid!!!', size, this.dataSize);
        return;
    }

    // Evaluate pixel operation
    var idx = 0,
        resultArray = new Uint8ClampedArray(size);
    while(idx < size) {
        resultArray[idx] = this.fnOperation(this.data, idx);
        resultArray[idx + 1] = this.fnOperation(this.data, idx + 1);
        resultArray[idx + 2] = this.fnOperation(this.data, idx + 2);
        resultArray[idx + 3] = 255;

        idx += 4;
    }

    // Push data in canvas
    this.bgCanvas.size(this.dataSize[0], this.dataSize[1]);
    var ctx = this.bgCanvas.get2DContext(),
        pixelBuffer = ctx.getImageData(0, 0, this.dataSize[0], this.dataSize[1]);

    pixelBuffer.data.set(resultArray);
    ctx.putImageData(pixelBuffer, 0, 0);

    var readyImage = {
        canvas: this.bgCanvas.el,
        area: [0, 0].concat(this.dataSize),
        outputSize: this.dataSize,
        builder: this
    };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.destroy = function() {
    this.bgCanvas.destroy();
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.getListeners = function() {
    return this.listeners;
}

// ----------------------------------------------------------------------------

PixelOperationImageBuilder.prototype.setListeners = function(l) {
    this.listeners = l;
}

// ----------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory

PixelOperationImageBuilder.prototype.getControlWidgets = function() {
    return ['PixelOperatorControl'];
};

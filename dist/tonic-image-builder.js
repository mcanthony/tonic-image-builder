/******/ (function(modules) { // webpackBootstrap
/******/ 	// The module cache
/******/ 	var installedModules = {};

/******/ 	// The require function
/******/ 	function __webpack_require__(moduleId) {

/******/ 		// Check if module is in cache
/******/ 		if(installedModules[moduleId])
/******/ 			return installedModules[moduleId].exports;

/******/ 		// Create a new module (and put it into the cache)
/******/ 		var module = installedModules[moduleId] = {
/******/ 			exports: {},
/******/ 			id: moduleId,
/******/ 			loaded: false
/******/ 		};

/******/ 		// Execute the module function
/******/ 		modules[moduleId].call(module.exports, module, module.exports, __webpack_require__);

/******/ 		// Flag the module as loaded
/******/ 		module.loaded = true;

/******/ 		// Return the exports of the module
/******/ 		return module.exports;
/******/ 	}


/******/ 	// expose the modules object (__webpack_modules__)
/******/ 	__webpack_require__.m = modules;

/******/ 	// expose the module cache
/******/ 	__webpack_require__.c = installedModules;

/******/ 	// __webpack_public_path__
/******/ 	__webpack_require__.p = "";

/******/ 	// Load entry module and return exports
/******/ 	return __webpack_require__(0);
/******/ })
/************************************************************************/
/******/ ([
/* 0 */
/***/ function(module, exports, __webpack_require__) {

	/* WEBPACK VAR INJECTION */(function(global) {module.exports = global["tonicImageBuilder"] = __webpack_require__(1);
	/* WEBPACK VAR INJECTION */}.call(exports, (function() { return this; }())))

/***/ },
/* 1 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	    value: true
	});

	function _interopRequireDefault(obj) {
	    return obj && obj.__esModule ? obj : { 'default': obj };
	}

	var _CanvasOffscreenBufferIndexJs = __webpack_require__(2);

	var _CanvasOffscreenBufferIndexJs2 = _interopRequireDefault(_CanvasOffscreenBufferIndexJs);

	var _DataProberImageBuilderIndexJs = __webpack_require__(3);

	var _DataProberImageBuilderIndexJs2 = _interopRequireDefault(_DataProberImageBuilderIndexJs);

	exports.CanvasOffscreenBuffer = _CanvasOffscreenBufferIndexJs2['default'];
	exports.DataProberImageBuilder = _DataProberImageBuilderIndexJs2['default'];

/***/ },
/* 2 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	    value: true
	});

	// Create <canvas/> within the DOM
	exports['default'] = CanvasOffscreenBuffer;
	var offscreenCanvasCount = 0;
	function CanvasOffscreenBuffer(width, height) {
	    this.id = 'CanvasOffscreenBuffer_' + ++offscreenCanvasCount;
	    this.el = document.createElement('canvas');
	    this.width = width;
	    this.height = height;

	    this.el.style.display = 'none';
	    this.el.setAttribute('width', this.width);
	    this.el.setAttribute('height', this.height);

	    document.body.appendChild(this.el);
	}

	CanvasOffscreenBuffer.prototype.size = function (width, height) {
	    if (width) {
	        this.el.setAttribute('width', this.width = width);
	    }
	    if (height) {
	        this.el.setAttribute('height', this.height = height);
	    }
	    return [Number(this.width), Number(this.height)];
	};

	CanvasOffscreenBuffer.prototype.get2DContext = function () {
	    return this.el.getContext('2d');
	};

	// Remove canvas from DOM
	CanvasOffscreenBuffer.prototype['delete'] = function () {
	    this.el.parentNode.removeChild(this.el);
	    this.el = null;
	    this.width = null;
	    this.height = null;
	};

	CanvasOffscreenBuffer.prototype.toDataURL = function () {
	    return this.el.toDataURL();
	};
	module.exports = exports['default'];

/***/ },
/* 3 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	    value: true
	});

	// DataProberImageBuilder Object ----------------------------------------------

	exports['default'] = DataProberImageBuilder;

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _CanvasOffscreenBuffer = __webpack_require__(2);

	var _CanvasOffscreenBuffer2 = _interopRequireDefault(_CanvasOffscreenBuffer);

	function DataProberImageBuilder(queryDataModel) {
	    this.queryDataModel = queryDataModel;
	    this.metadata = queryDataModel.originalData.InSituDataProber;
	    this.fieldIndex = 0;
	    this.renderMethod = 'renderXY';
	    this.lastImageStack = null;
	    this.workImage = new Image();
	    this.onReadyListeners = [];
	    this.listeners = {};
	    this.listenerCount = 0;
	    this.probeXYZ = [Math.floor(this.metadata.dimensions[0] / 2), Math.floor(this.metadata.dimensions[1] / 2), Math.floor(this.metadata.dimensions[2] / 2)];

	    this.setField(this.metadata.fields[this.fieldIndex]);

	    var maxSize = 0;
	    for (var i = 0; i < 3; ++i) {
	        var currentSize = this.metadata.dimensions[i];
	        maxSize = maxSize < currentSize ? currentSize : maxSize;
	    }
	    this.bgCanvas = new _CanvasOffscreenBuffer2['default'](maxSize, maxSize);
	    this.fgCanvas = new _CanvasOffscreenBuffer2['default'](this.metadata.dimensions[0], this.metadata.dimensions[1]);

	    // Create data handler
	    var self = this;
	    function onDataReady(data) {
	        self.lastImageStack = data;
	        self.render();
	    }
	    this.listenerId = queryDataModel.addDataListener(onDataReady);
	}

	DataProberImageBuilder.prototype.getYOffset = function (slice) {
	    if (slice === undefined) {
	        slice = this.probeXYZ[2];
	    }
	    return this.metadata.sprite_size - slice % this.metadata.sprite_size - 1;
	};

	DataProberImageBuilder.prototype.getImage = function (slice, callback) {
	    if (slice === undefined) {
	        slice = this.probeXYZ[2];
	    }
	    this.workImage.onload = callback;
	    this.workImage.src = this.lastImageStack[this.metadata.slices[Math.floor(slice / this.metadata.sprite_size)]].url;
	};

	DataProberImageBuilder.prototype.update = function () {
	    this.queryDataModel.fetchData();
	};

	DataProberImageBuilder.prototype.setProbe = function (x, y, z) {
	    this.probeXYZ = [x, y, z];
	    this.queryDataModel.fetchData();
	};

	DataProberImageBuilder.prototype.getProbe = function () {
	    return this.probeXYZ;
	};

	DataProberImageBuilder.prototype.render = function () {
	    if (!this.lastImageStack) {
	        return;
	    }

	    this[this.renderMethod]();
	};

	DataProberImageBuilder.prototype.pushToFront = function (width, height, scaleX, scaleY, lineX, lineY) {
	    var destWidth = Math.floor(width * scaleX),
	        destHeight = Math.floor(height * scaleY),
	        readyList = this.onReadyListeners,
	        count = readyList.length,
	        ctx = this.fgCanvas.get2DContext();

	    this.fgCanvas.size(destWidth, destHeight);
	    ctx.drawImage(this.bgCanvas.el, 0, 0, width, height, 0, 0, destWidth, destHeight);

	    // Draw cross hair probe position
	    ctx.beginPath();
	    ctx.moveTo(lineX * scaleX, 0);
	    ctx.lineTo(lineX * scaleX, destHeight);
	    ctx.moveTo(0, lineY * scaleY);
	    ctx.lineTo(destWidth, lineY * scaleY);
	    ctx.strokeStyle = '#ffffff';
	    ctx.lineWidth = 1;
	    ctx.stroke();

	    var readyImage = { url: this.fgCanvas.toDataURL(), type: this.renderMethod };

	    while (count--) {
	        readyList[count](readyImage);
	    }
	};

	DataProberImageBuilder.prototype.renderXY = function () {
	    var self = this,
	        ctx = this.bgCanvas.get2DContext(),
	        offset = this.getYOffset(),
	        xyz = this.probeXYZ,
	        dimensions = this.metadata.dimensions,
	        spacing = this.metadata.spacing;

	    this.getImage(this.probeXYZ[2], function () {
	        var image = this;
	        ctx.drawImage(image, 0, dimensions[1] * offset, dimensions[0], dimensions[1], 0, 0, dimensions[0], dimensions[1]);

	        self.applyLookupTable(dimensions[0], dimensions[1]);
	        self.pushToFront(dimensions[0], dimensions[1], spacing[0], spacing[1], xyz[0], xyz[1]);
	    });
	};

	DataProberImageBuilder.prototype.renderZY = function () {
	    var self = this,
	        ctx = this.bgCanvas.get2DContext(),
	        offset = this.getYOffset(),
	        xyz = this.probeXYZ,
	        dimensions = this.metadata.dimensions,
	        activeColumn = dimensions[2],
	        spacing = this.metadata.spacing;

	    function processLine() {
	        var offset = self.getYOffset(activeColumn),
	            image = this;

	        ctx.drawImage(image, xyz[0], dimensions[1] * offset, 1, dimensions[1], activeColumn, 0, 1, dimensions[1]);

	        if (activeColumn--) {
	            self.getImage(activeColumn, processLine);
	        } else {
	            // Rendering is done
	            self.applyLookupTable(dimensions[2], dimensions[1]);
	            self.pushToFront(dimensions[2], dimensions[1], spacing[2], spacing[1], xyz[2], xyz[1]);
	        }
	    }

	    if (activeColumn--) {
	        self.getImage(activeColumn, processLine);
	    }
	};

	DataProberImageBuilder.prototype.renderXZ = function () {
	    var self = this,
	        ctx = this.bgCanvas.get2DContext(),
	        offset = this.getYOffset(),
	        xyz = this.probeXYZ,
	        dimensions = this.metadata.dimensions,
	        spacing = this.metadata.spacing,
	        activeLine = dimensions[2];

	    function processLine() {
	        var offset = self.getYOffset(activeLine),
	            image = this;

	        ctx.drawImage(image, 0, dimensions[1] * offset + xyz[1], dimensions[0], 1, 0, activeLine, dimensions[0], 1);

	        if (activeLine--) {
	            self.getImage(activeLine, processLine);
	        } else {
	            // Rendering is done
	            self.applyLookupTable(dimensions[0], dimensions[2]);
	            self.pushToFront(dimensions[0], dimensions[2], spacing[0], spacing[2], xyz[0], xyz[2]);
	        }
	    }

	    if (activeLine--) {
	        self.getImage(activeLine, processLine);
	    }
	};

	DataProberImageBuilder.prototype.applyLookupTable = function (width, height) {
	    var ctx = this.bgCanvas.get2DContext(),
	        lut = this.lutManager ? this.lutManager.getLookupTable(this.queryDataModel.getValue('field')) : null,
	        pixels = ctx.getImageData(0, 0, width, height),
	        pixBuffer = pixels.data,
	        size = pixBuffer.length,
	        idx = 0;

	    if (lut) {
	        while (idx < size) {
	            var value = (pixBuffer[idx] + 256 * pixBuffer[idx + 1] + 65536 * pixBuffer[idx + 2]) / 16777216,
	                color = lut(value);

	            pixBuffer[idx] = Math.floor(color[0]);
	            pixBuffer[idx + 1] = Math.floor(color[1]);
	            pixBuffer[idx + 2] = Math.floor(color[2]);

	            // Move to next pixel
	            idx += 4;
	        }
	        ctx.putImageData(pixels, 0, 0);
	    }
	};

	DataProberImageBuilder.prototype.setField = function (fieldName) {
	    this.queryDataModel.setValue('field', fieldName);
	};

	DataProberImageBuilder.prototype.getField = function () {
	    return this.queryDataModel.getValue('field');
	};

	DataProberImageBuilder.prototype.getFields = function () {
	    return this.metadata.fields;
	};

	DataProberImageBuilder.prototype.setLookupTableManager = function (lutManager) {
	    this.lutManager = lutManager;
	};

	DataProberImageBuilder.prototype.addImageReadyListener = function (callback) {
	    var listenerId = 'image-ready-listener-' + ++this.listenerCount;
	    this.listeners[listenerId] = callback;
	    this.onReadyListeners.push(callback);
	    return listenerId;
	};

	DataProberImageBuilder.prototype.removeImageReadyListener = function (listenerId) {
	    delete this.listeners[listenerId];
	    this.onReadyListeners = [];
	    for (var key in this.listeners) {
	        this.onReadyListeners.push(this.listeners[key]);
	    }
	};

	DataProberImageBuilder.prototype['delete'] = function () {
	    this.queryDataModel.removeDataListener(this.listenerId);
	    this.queryDataModel = null;

	    this.bgCanvas['delete']();
	    this.bgCanvas = null;

	    this.workImage = null;
	    this.lutManager = null;
	    this.listenerId = null;
	};
	module.exports = exports['default'];

/***/ }
/******/ ]);
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

	var _LookupTableIndexJs = __webpack_require__(8);

	exports.CanvasOffscreenBuffer = _CanvasOffscreenBufferIndexJs2['default'];
	exports.DataProberImageBuilder = _DataProberImageBuilderIndexJs2['default'];
	exports.LookupTable = _LookupTableIndexJs.LookupTable;
	exports.LookupTableManager = _LookupTableIndexJs.LookupTableManager;
	exports.Presets = _LookupTableIndexJs.Presets;

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

	var _LookupTableLookupTableManager = __webpack_require__(4);

	var _LookupTableLookupTableManager2 = _interopRequireDefault(_LookupTableLookupTableManager);

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

	    // Update LookupTableManager with data range
	    _LookupTableLookupTableManager2['default'].addFields(this.metadata.ranges);

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
	    this.onLookupTableChange = function () {
	        self.update();
	    };
	    _LookupTableLookupTableManager2['default'].addLookupTableListener(this.onLookupTableChange);
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
	        fieldName = this.getField(),
	        lut = _LookupTableLookupTableManager2['default'].getLookupTable(fieldName),
	        pixels = ctx.getImageData(0, 0, width, height),
	        pixBuffer = pixels.data,
	        size = pixBuffer.length,
	        idx = 0,
	        fieldRange = this.metadata.ranges[fieldName],
	        delta = fieldRange[1] - fieldRange[0];

	    if (lut) {
	        while (idx < size) {
	            var value = (pixBuffer[idx] + 256 * pixBuffer[idx + 1] + 65536 * pixBuffer[idx + 2]) / 16777216,
	                color = lut.getColor(value * delta + fieldRange[0]);

	            pixBuffer[idx] = Math.floor(255 * color[0]);
	            pixBuffer[idx + 1] = Math.floor(255 * color[1]);
	            pixBuffer[idx + 2] = Math.floor(255 * color[2]);

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

	DataProberImageBuilder.prototype.getLookupTable = function () {
	    return _LookupTableLookupTableManager2['default'].getLookupTable(this.getField());
	};

	DataProberImageBuilder.prototype.getLookupTableManager = function () {
	    return _LookupTableLookupTableManager2['default'];
	};

	DataProberImageBuilder.prototype.getFields = function () {
	    return this.metadata.fields;
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
	    _LookupTableLookupTableManager2['default'].removeLookupTableListener(this.onLookupTableChange);
	    this.onLookupTableChange = null;

	    this.queryDataModel.removeDataListener(this.listenerId);
	    this.queryDataModel = null;

	    this.bgCanvas['delete']();
	    this.bgCanvas = null;

	    this.workImage = null;
	    this.listenerId = null;
	};
	module.exports = exports['default'];

/***/ },
/* 4 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	    value: true
	});

	function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { 'default': obj }; }

	var _LookupTableJs = __webpack_require__(5);

	var _LookupTableJs2 = _interopRequireDefault(_LookupTableJs);

	var _nodeEventEmitter = __webpack_require__(7);

	var _nodeEventEmitter2 = _interopRequireDefault(_nodeEventEmitter);

	var emitter = new _nodeEventEmitter2['default']();
	var luts = {};

	function onChange(event) {
	    emitter.emit('LookupTable', event);
	}

	function addLookupTable(name, range, preset) {
	    var lut = luts[name];
	    if (lut === undefined) {
	        luts[name] = lut = new _LookupTableJs2['default'](name, onChange);
	    }

	    lut.setPreset(preset || 'spectral');
	    lut.setScalarRange(range[0], range[1]);

	    return lut;
	}

	function removeLookupTable(name) {
	    var lut = luts[name];
	    if (lut) {
	        lut['delete']();
	    }
	    delete luts[name];
	}

	function getLookupTable(name) {
	    return luts[name];
	}

	function addFields(fieldsRange) {
	    for (var field in fieldsRange) {
	        addLookupTable(field, fieldsRange[field]);
	    }
	}

	function addLookupTableListener(listener) {
	    emitter.on('LookupTable', listener);
	}

	function removeLookupTableListener(listener) {
	    emitter.off('LookupTable', listener);
	}

	exports['default'] = {
	    addLookupTable: addLookupTable,
	    removeLookupTable: removeLookupTable,
	    getLookupTable: getLookupTable,
	    addFields: addFields,
	    addLookupTableListener: addLookupTableListener,
	    removeLookupTableListener: removeLookupTableListener
	};
	module.exports = exports['default'];

/***/ },
/* 5 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	    value: true
	});

	// ----------------------------------------------------------------------------

	exports['default'] = LookupTable;

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	var _PresetsJs = __webpack_require__(6);

	var Presets = _interopRequireWildcard(_PresetsJs);

	// Initialize liste
	var presetList = [];
	for (var key in Presets.lookuptables) {
	    presetList.push(key);
	}

	// Global helper methods ------------------------------------------------------

	function applyRatio(a, b, ratio) {
	    return (b - a) * ratio + a;
	}

	function interpolateColor(pointA, pointB, scalar) {
	    var ratio = (scalar - pointA[0]) / (pointB[0] - pointA[0]);
	    return [applyRatio(pointA[1], pointB[1], ratio), applyRatio(pointA[2], pointB[2], ratio), applyRatio(pointA[3], pointB[3], ratio)];
	}

	function extractPoint(controlPoints, idx) {
	    return [controlPoints[idx].x, controlPoints[idx].r, controlPoints[idx].g, controlPoints[idx].b];
	}

	function xrgbCompare(a, b) {
	    return a.x - b.x;
	}
	function LookupTable(name, onChange) {
	    this.name = name;
	    this.scalarRange = [0, 1];
	    this.delta = 1;
	    this.controlPoints = null;
	    this.colorTableSize = 256;
	    this.colorTable = null;
	    this.onChange = onChange || function () {};

	    this.setPreset('spectral');

	    // Auto rebuild
	    this.build();
	}

	LookupTable.prototype.getName = function () {
	    return this.name;
	};

	LookupTable.prototype.getPresets = function () {
	    return presetList;
	};

	LookupTable.prototype.setPreset = function (name) {
	    this.colorTable = null;
	    this.controlPoints = [];

	    var colors = Presets.lookuptables[name].controlpoints,
	        count = colors.length;

	    for (var i = 0; i < count; i++) {
	        this.controlPoints.push({
	            x: colors[i].x,
	            r: colors[i].r,
	            g: colors[i].g,
	            b: colors[i].b
	        });
	    }

	    // Auto rebuild
	    this.build();

	    this.onChange({ change: 'preset', lut: this });
	};

	LookupTable.prototype.getScalarRange = function () {
	    return this.scalarRange;
	};

	LookupTable.prototype.setScalarRange = function (min, max) {
	    this.scalarRange = [min, max];
	    this.delta = max - min;

	    this.onChange({ change: 'scalarRange', lut: this });
	};

	LookupTable.prototype.build = function (trigger) {
	    if (this.colorTable) {
	        return;
	    }

	    this.colorTable = [];

	    var currentControlIdx = 0;
	    for (var idx = 0; idx < this.colorTableSize; idx++) {
	        var value = idx / (this.colorTableSize - 1),
	            pointA = extractPoint(this.controlPoints, currentControlIdx),
	            pointB = extractPoint(this.controlPoints, currentControlIdx + 1);

	        if (value > pointB[0]) {
	            currentControlIdx += 1;
	            pointA = extractPoint(this.controlPoints, currentControlIdx);
	            pointB = extractPoint(this.controlPoints, currentControlIdx + 1);
	        }

	        this.colorTable.push(interpolateColor(pointA, pointB, value));
	    }

	    if (trigger) {
	        this.onChange({ change: 'controlPoints', lut: this });
	    }
	};

	LookupTable.prototype.setNumberOfColors = function (nbColors) {
	    this.colorTableSize = nbColors;
	    this.colorTable = null;

	    // Auto rebuild
	    this.build();

	    this.onChange({ change: 'numberOfColors', lut: this });
	};

	LookupTable.prototype.getNumberOfControlPoints = function () {
	    return this.controlPoints ? this.controlPoints.length : 0;
	};

	LookupTable.prototype.removeControlPoint = function (idx) {
	    if (idx > 0 && idx < this.controlPoints.length - 1) {
	        this.controlPoints.splice(idx, 1);

	        // Auto rebuild and trigger change
	        this.colorTable = null;
	        this.build(true);

	        return true;
	    }
	    return false;
	};

	LookupTable.prototype.getControlPoint = function (idx) {
	    return this.controlPoints[idx];
	};

	LookupTable.prototype.updateControlPoint = function (idx, xrgb) {
	    this.controlPoints[idx] = xrgb;
	    var xValue = xrgb.x;

	    // Ensure order
	    this.controlPoints.sort(xrgbCompare);

	    // Auto rebuild and trigger change
	    this.colorTable = null;
	    this.build(true);

	    // Return the modified index of current control point
	    for (var i = 0; i < this.controlPoints.length; i++) {
	        if (this.controlPoints[i].x === xValue) {
	            return i;
	        }
	    }
	    return 0;
	};

	LookupTable.prototype.addControlPoint = function (xrgb) {
	    this.controlPoints.push(xrgb);
	    var xValue = xrgb.x;

	    // Ensure order
	    this.controlPoints.sort(xrgbCompare);

	    // Auto rebuild and trigger change
	    this.colorTable = null;
	    this.build(true);

	    // Return the modified index of current control point
	    for (var i = 0; i < this.controlPoints.length; i++) {
	        if (this.controlPoints[i].x === xValue) {
	            return i;
	        }
	    }
	    return 0;
	};

	LookupTable.prototype.drawToCanvas = function (canvas) {
	    var colors = this.colorTable,
	        length = colors.length,
	        ctx = canvas.getContext('2d'),
	        canvasData = ctx.getImageData(0, 0, length, 1);

	    for (var i = 0; i < length; i++) {
	        canvasData.data[i * 4 + 0] = Math.floor(255 * colors[i][0]);
	        canvasData.data[i * 4 + 1] = Math.floor(255 * colors[i][1]);
	        canvasData.data[i * 4 + 2] = Math.floor(255 * colors[i][2]);
	        canvasData.data[i * 4 + 3] = 255;
	    }
	    ctx.putImageData(canvasData, 0, 0);
	};

	LookupTable.prototype.getColor = function (scalar) {
	    var idxValue = Math.floor(this.colorTableSize * (scalar - this.scalarRange[0]) / this.delta);
	    if (idxValue < 0) {
	        return this.colorTable[0];
	    }
	    if (idxValue >= this.colorTableSize) {
	        return this.colorTable[this.colorTable.length - 1];
	    }
	    return this.colorTable[idxValue];
	};

	LookupTable.prototype['delete'] = function () {
	    this.onChange = null;
	};
	module.exports = exports['default'];

/***/ },
/* 6 */
/***/ function(module, exports, __webpack_require__) {

	"use strict";

	Object.defineProperty(exports, "__esModule", {
	    value: true
	});
	exports["default"] = {
	    "lookuptables": {
	        "spectral": {
	            "controlpoints": [{ "x": 0, "r": 0.6196078431372549, "g": 0.00392156862745098, "b": 0.2588235294117647 }, { "x": 0.1, "r": 0.8352941176470589, "g": 0.2431372549019608, "b": 0.3098039215686275 }, { "x": 0.2, "r": 0.9568627450980393, "g": 0.4274509803921568, "b": 0.2627450980392157 }, { "x": 0.3, "r": 0.9921568627450981, "g": 0.6823529411764706, "b": 0.3803921568627451 }, { "x": 0.4, "r": 0.996078431372549, "g": 0.8784313725490196, "b": 0.5450980392156862 }, { "x": 0.5, "r": 1, "g": 1, "b": 0.7490196078431373 }, { "x": 0.6, "r": 0.9019607843137255, "g": 0.9607843137254902, "b": 0.596078431372549 }, { "x": 0.7, "r": 0.6705882352941176, "g": 0.8666666666666667, "b": 0.6431372549019608 }, { "x": 0.8, "r": 0.4, "g": 0.7607843137254902, "b": 0.6470588235294118 }, { "x": 0.9, "r": 0.196078431372549, "g": 0.5333333333333333, "b": 0.7411764705882353 }, { "x": 1, "r": 0.3686274509803922, "g": 0.3098039215686275, "b": 0.6352941176470588 }],
	            "range": [0, 1]
	        },
	        "spectralflip": {
	            "controlpoints": [{ "x": 0, "r": 0.3686274509803922, "g": 0.3098039215686275, "b": 0.6352941176470588 }, { "x": 0.1, "r": 0.196078431372549, "g": 0.5333333333333333, "b": 0.7411764705882353 }, { "x": 0.2, "r": 0.4, "g": 0.7607843137254902, "b": 0.6470588235294118 }, { "x": 0.3, "r": 0.6705882352941176, "g": 0.8666666666666667, "b": 0.6431372549019608 }, { "x": 0.4, "r": 0.9019607843137255, "g": 0.9607843137254902, "b": 0.596078431372549 }, { "x": 0.5, "r": 1, "g": 1, "b": 0.7490196078431373 }, { "x": 0.6, "r": 0.996078431372549, "g": 0.8784313725490196, "b": 0.5450980392156862 }, { "x": 0.7, "r": 0.9921568627450981, "g": 0.6823529411764706, "b": 0.3803921568627451 }, { "x": 0.8, "r": 0.9568627450980393, "g": 0.4274509803921568, "b": 0.2627450980392157 }, { "x": 0.9, "r": 0.8352941176470589, "g": 0.2431372549019608, "b": 0.3098039215686275 }, { "x": 1, "r": 0.6196078431372549, "g": 0.00392156862745098, "b": 0.2588235294117647 }],
	            "range": [0, 1]
	        },
	        "ocean": {
	            "controlpoints": [{ "x": 0, "r": 0.039215, "g": 0.090195, "b": 0.25098 }, { "x": 0.125, "r": 0.133333, "g": 0.364706, "b": 0.521569 }, { "x": 0.25, "r": 0.321569, "g": 0.760784, "b": 0.8 }, { "x": 0.375, "r": 0.690196, "g": 0.960784, "b": 0.894118 }, { "x": 0.5, "r": 0.552941, "g": 0.921569, "b": 0.552941 }, { "x": 0.625, "r": 0.329412, "g": 0.6, "b": 0.239216 }, { "x": 0.75, "r": 0.211765, "g": 0.34902, "b": 0.078435 }, { "x": 0.875, "r": 0.011765, "g": 0.207843, "b": 0.023525 }, { "x": 1, "r": 0.286275, "g": 0.294118, "b": 0.301961 }],
	            "range": [0, 1]
	        },
	        "warm": {
	            "controlpoints": [{ "x": 0, "r": 0.4745098039215686, "g": 0.09019607843137255, "b": 0.09019607843137255 }, { "x": 0.2, "r": 0.7098039215686275, "g": 0.00392156862745098, "b": 0.00392156862745098 }, { "x": 0.4, "r": 0.9372549019607843, "g": 0.2784313725490196, "b": 0.09803921568627451 }, { "x": 0.6, "r": 0.9764705882352941, "g": 0.5137254901960784, "b": 0.1411764705882353 }, { "x": 0.8, "r": 1, "g": 0.7058823529411765, "b": 0 }, { "x": 1, "r": 1, "g": 0.8980392156862745, "b": 0.02352941176470588 }],
	            "range": [0, 1]
	        },
	        "cool": {
	            "controlpoints": [{ "x": 0, "r": 0.4588235294117647, "g": 0.6941176470588235, "b": 0.00392156862745098 }, { "x": 0.1666666666666667, "r": 0.3450980392156863, "g": 0.5019607843137255, "b": 0.1607843137254902 }, { "x": 0.3333333333333333, "r": 0.3137254901960784, "g": 0.8431372549019608, "b": 0.7490196078431373 }, { "x": 0.5, "r": 0.1098039215686274, "g": 0.5843137254901961, "b": 0.803921568627451 }, { "x": 0.6666666666666666, "r": 0.2313725490196079, "g": 0.407843137254902, "b": 0.6705882352941176 }, { "x": 0.8333333333333334, "r": 0.6039215686274509, "g": 0.407843137254902, "b": 1 }, { "x": 1, "r": 0.3725490196078431, "g": 0.2, "b": 0.5019607843137255 }],
	            "range": [0, 1]
	        },
	        "blues": {
	            "controlpoints": [{ "x": 0, "r": 0.2313725490196079, "g": 0.407843137254902, "b": 0.6705882352941176 }, { "x": 0.1666666666666667, "r": 0.1098039215686274, "g": 0.5843137254901961, "b": 0.803921568627451 }, { "x": 0.3333333333333333, "r": 0.3058823529411765, "g": 0.8509803921568627, "b": 0.9176470588235294 }, { "x": 0.5, "r": 0.4509803921568628, "g": 0.6039215686274509, "b": 0.8352941176470589 }, { "x": 0.6666666666666666, "r": 0.2588235294117647, "g": 0.2392156862745098, "b": 0.6627450980392157 }, { "x": 0.8333333333333334, "r": 0.3137254901960784, "g": 0.3294117647058823, "b": 0.5294117647058824 }, { "x": 1, "r": 0.06274509803921569, "g": 0.1647058823529412, "b": 0.3215686274509804 }],
	            "range": [0, 1]
	        },
	        "wildflower": {
	            "controlpoints": [{ "x": 0, "r": 0.1098039215686274, "g": 0.5843137254901961, "b": 0.803921568627451 }, { "x": 0.1666666666666667, "r": 0.2313725490196079, "g": 0.407843137254902, "b": 0.6705882352941176 }, { "x": 0.3333333333333333, "r": 0.4, "g": 0.2431372549019608, "b": 0.7176470588235294 }, { "x": 0.5, "r": 0.6352941176470588, "g": 0.3294117647058823, "b": 0.8117647058823529 }, { "x": 0.6666666666666666, "r": 0.8705882352941177, "g": 0.3803921568627451, "b": 0.807843137254902 }, { "x": 0.8333333333333334, "r": 0.8627450980392157, "g": 0.3803921568627451, "b": 0.5843137254901961 }, { "x": 1, "r": 0.2392156862745098, "g": 0.06274509803921569, "b": 0.3215686274509804 }],
	            "range": [0, 1]
	        },
	        "citrus": {
	            "controlpoints": [{ "x": 0, "r": 0.396078431372549, "g": 0.4862745098039216, "b": 0.2156862745098039 }, { "x": 0.2, "r": 0.4588235294117647, "g": 0.6941176470588235, "b": 0.00392156862745098 }, { "x": 0.4, "r": 0.6980392156862745, "g": 0.7294117647058823, "b": 0.1882352941176471 }, { "x": 0.6, "r": 1, "g": 0.8980392156862745, "b": 0.02352941176470588 }, { "x": 0.8, "r": 1, "g": 0.7058823529411765, "b": 0 }, { "x": 1, "r": 0.9764705882352941, "g": 0.5137254901960784, "b": 0.1411764705882353 }],
	            "range": [0, 1]
	        },
	        "organge2purple": {
	            "controlpoints": [{ "x": 0, "r": 0.4980392156862745, "g": 0.2313725490196079, "b": 0.03137254901960784 }, { "x": 0.1, "r": 0.7019607843137254, "g": 0.3450980392156863, "b": 0.02352941176470588 }, { "x": 0.2, "r": 0.8784313725490196, "g": 0.5098039215686274, "b": 0.0784313725490196 }, { "x": 0.3, "r": 0.9921568627450981, "g": 0.7215686274509804, "b": 0.3882352941176471 }, { "x": 0.4, "r": 0.996078431372549, "g": 0.8784313725490196, "b": 0.7137254901960784 }, { "x": 0.5, "r": 0.9686274509803922, "g": 0.9686274509803922, "b": 0.9686274509803922 }, { "x": 0.6, "r": 0.8470588235294118, "g": 0.8549019607843137, "b": 0.9215686274509803 }, { "x": 0.7, "r": 0.6980392156862745, "g": 0.6705882352941176, "b": 0.8235294117647058 }, { "x": 0.8, "r": 0.5019607843137255, "g": 0.4509803921568628, "b": 0.6745098039215687 }, { "x": 0.9, "r": 0.3294117647058823, "g": 0.1529411764705882, "b": 0.5333333333333333 }, { "x": 1, "r": 0.1764705882352941, "g": 0, "b": 0.2941176470588235 }],
	            "range": [0, 1]
	        },
	        "brown2green": {
	            "controlpoints": [{ "x": 0, "r": 0.3294117647058823, "g": 0.1882352941176471, "b": 0.0196078431372549 }, { "x": 0.1, "r": 0.5490196078431373, "g": 0.3176470588235294, "b": 0.0392156862745098 }, { "x": 0.2, "r": 0.7490196078431373, "g": 0.5058823529411764, "b": 0.1764705882352941 }, { "x": 0.3, "r": 0.8745098039215686, "g": 0.7607843137254902, "b": 0.4901960784313725 }, { "x": 0.4, "r": 0.9647058823529412, "g": 0.9098039215686274, "b": 0.7647058823529411 }, { "x": 0.5, "r": 0.9607843137254902, "g": 0.9607843137254902, "b": 0.9607843137254902 }, { "x": 0.6, "r": 0.7803921568627451, "g": 0.9176470588235294, "b": 0.8980392156862745 }, { "x": 0.7, "r": 0.5019607843137255, "g": 0.803921568627451, "b": 0.7568627450980392 }, { "x": 0.8, "r": 0.207843137254902, "g": 0.592156862745098, "b": 0.5607843137254902 }, { "x": 0.9, "r": 0.00392156862745098, "g": 0.4, "b": 0.3686274509803922 }, { "x": 1, "r": 0, "g": 0.2352941176470588, "b": 0.1882352941176471 }],
	            "range": [0, 1]
	        },
	        "blue2green": {
	            "controlpoints": [{ "x": 0, "r": 0.9686274509803922, "g": 0.9882352941176471, "b": 0.9921568627450981 }, { "x": 0.125, "r": 0.8980392156862745, "g": 0.9607843137254902, "b": 0.9764705882352941 }, { "x": 0.25, "r": 0.8, "g": 0.9254901960784314, "b": 0.9019607843137255 }, { "x": 0.375, "r": 0.6, "g": 0.8470588235294118, "b": 0.788235294117647 }, { "x": 0.5, "r": 0.4, "g": 0.7607843137254902, "b": 0.6431372549019608 }, { "x": 0.625, "r": 0.2549019607843137, "g": 0.6823529411764706, "b": 0.4627450980392157 }, { "x": 0.75, "r": 0.1372549019607843, "g": 0.5450980392156862, "b": 0.2705882352941176 }, { "x": 0.875, "r": 0, "g": 0.4274509803921568, "b": 0.1725490196078431 }, { "x": 1, "r": 0, "g": 0.2666666666666667, "b": 0.1058823529411765 }],
	            "range": [0, 1]
	        },
	        "yellow2brown": {
	            "controlpoints": [{ "x": 0, "r": 1, "g": 1, "b": 0.8980392156862745 }, { "x": 0.125, "r": 1, "g": 0.9686274509803922, "b": 0.7372549019607844 }, { "x": 0.25, "r": 0.996078431372549, "g": 0.8901960784313725, "b": 0.5686274509803921 }, { "x": 0.375, "r": 0.996078431372549, "g": 0.7686274509803922, "b": 0.3098039215686275 }, { "x": 0.5, "r": 0.996078431372549, "g": 0.6, "b": 0.1607843137254902 }, { "x": 0.625, "r": 0.9254901960784314, "g": 0.4392156862745098, "b": 0.0784313725490196 }, { "x": 0.75, "r": 0.8, "g": 0.2980392156862745, "b": 0.00784313725490196 }, { "x": 0.875, "r": 0.6, "g": 0.203921568627451, "b": 0.01568627450980392 }, { "x": 1, "r": 0.4, "g": 0.1450980392156863, "b": 0.02352941176470588 }],
	            "range": [0, 1]
	        },
	        "blue2purple": {
	            "controlpoints": [{ "x": 0, "r": 0.9686274509803922, "g": 0.9882352941176471, "b": 0.9921568627450981 }, { "x": 0.125, "r": 0.8784313725490196, "g": 0.9254901960784314, "b": 0.9568627450980393 }, { "x": 0.25, "r": 0.7490196078431373, "g": 0.8274509803921568, "b": 0.9019607843137255 }, { "x": 0.375, "r": 0.6196078431372549, "g": 0.7372549019607844, "b": 0.8549019607843137 }, { "x": 0.5, "r": 0.5490196078431373, "g": 0.5882352941176471, "b": 0.7764705882352941 }, { "x": 0.625, "r": 0.5490196078431373, "g": 0.4196078431372549, "b": 0.6941176470588235 }, { "x": 0.75, "r": 0.5333333333333333, "g": 0.2549019607843137, "b": 0.615686274509804 }, { "x": 0.875, "r": 0.5058823529411764, "g": 0.05882352941176471, "b": 0.4862745098039216 }, { "x": 1, "r": 0.3019607843137255, "g": 0, "b": 0.2941176470588235 }],
	            "range": [0, 1]
	        },
	        "cold2warm": {
	            "controlpoints": [{ "x": 0, "r": 0.23137254902, "g": 0.298039215686, "b": 0.752941176471 }, { "x": 0.5, "r": 0.865, "g": 0.865, "b": 0.865 }, { "x": 1, "r": 0.705882352941, "g": 0.0156862745098, "b": 0.149019607843 }],
	            "range": [0, 1]
	        },
	        "rainbow": {
	            "controlpoints": [{ "x": 0, "r": 0, "g": 0, "b": 1 }, { "x": 0.25, "r": 0, "g": 1, "b": 1 }, { "x": 0.5, "r": 0, "g": 1, "b": 0 }, { "x": 0.75, "r": 1, "g": 1, "b": 0 }, { "x": 1, "r": 1, "g": 0, "b": 0 }],
	            "range": [0, 1]
	        },
	        "earth": {
	            "controlpoints": [{ "x": 0, "r": 0.392157, "g": 0.392157, "b": 0.392157 }, { "x": 0.586175, "r": 0.392157, "g": 0.392157, "b": 0.392157 }, { "x": 0.589041, "r": 0.141176, "g": 0.345098, "b": 0.478431 }, { "x": 0.589042, "r": 0.501961, "g": 0.694118, "b": 0.172549 }, { "x": 0.617699, "r": 0.74902, "g": 0.560784, "b": 0.188235 }, { "x": 0.789648, "r": 0.752941, "g": 0.741176, "b": 0.729412 }, { "x": 0.993079, "r": 0.796078, "g": 0.780392, "b": 0.772549 }, { "x": 1, "r": 0.796078, "g": 0.780392, "b": 0.772549 }],
	            "range": [0, 1]
	        }
	    },
	    "swatches": {
	        "colors": [{ "r": 255, "g": 255, "b": 255 }, { "r": 204, "g": 255, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 204, "g": 204, "b": 255 }, { "r": 255, "g": 204, "b": 255 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 204, "b": 204 }, { "r": 255, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 255, "b": 204 }, { "r": 204, "g": 204, "b": 204 }, { "r": 153, "g": 255, "b": 255 }, { "r": 153, "g": 204, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 153, "g": 153, "b": 255 }, { "r": 204, "g": 153, "b": 255 }, { "r": 255, "g": 153, "b": 255 }, { "r": 255, "g": 153, "b": 204 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 153, "b": 153 }, { "r": 255, "g": 204, "b": 153 }, { "r": 255, "g": 255, "b": 153 }, { "r": 204, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 153 }, { "r": 153, "g": 255, "b": 204 }, { "r": 204, "g": 204, "b": 204 }, { "r": 102, "g": 255, "b": 255 }, { "r": 102, "g": 204, "b": 255 }, { "r": 102, "g": 153, "b": 255 }, { "r": 102, "g": 102, "b": 255 }, { "r": 102, "g": 102, "b": 255 }, { "r": 102, "g": 102, "b": 255 }, { "r": 102, "g": 102, "b": 255 }, { "r": 102, "g": 102, "b": 255 }, { "r": 153, "g": 102, "b": 255 }, { "r": 204, "g": 102, "b": 255 }, { "r": 255, "g": 102, "b": 255 }, { "r": 255, "g": 102, "b": 204 }, { "r": 255, "g": 102, "b": 153 }, { "r": 255, "g": 102, "b": 102 }, { "r": 255, "g": 102, "b": 102 }, { "r": 255, "g": 102, "b": 102 }, { "r": 255, "g": 102, "b": 102 }, { "r": 255, "g": 102, "b": 102 }, { "r": 255, "g": 153, "b": 102 }, { "r": 255, "g": 204, "b": 102 }, { "r": 255, "g": 255, "b": 102 }, { "r": 204, "g": 255, "b": 102 }, { "r": 153, "g": 255, "b": 102 }, { "r": 102, "g": 255, "b": 102 }, { "r": 102, "g": 255, "b": 102 }, { "r": 102, "g": 255, "b": 102 }, { "r": 102, "g": 255, "b": 102 }, { "r": 102, "g": 255, "b": 102 }, { "r": 102, "g": 255, "b": 153 }, { "r": 102, "g": 255, "b": 204 }, { "r": 153, "g": 153, "b": 153 }, { "r": 51, "g": 255, "b": 255 }, { "r": 51, "g": 204, "b": 255 }, { "r": 51, "g": 153, "b": 255 }, { "r": 51, "g": 102, "b": 255 }, { "r": 51, "g": 51, "b": 255 }, { "r": 51, "g": 51, "b": 255 }, { "r": 51, "g": 51, "b": 255 }, { "r": 102, "g": 51, "b": 255 }, { "r": 153, "g": 51, "b": 255 }, { "r": 204, "g": 51, "b": 255 }, { "r": 255, "g": 51, "b": 255 }, { "r": 255, "g": 51, "b": 204 }, { "r": 255, "g": 51, "b": 153 }, { "r": 255, "g": 51, "b": 102 }, { "r": 255, "g": 51, "b": 51 }, { "r": 255, "g": 51, "b": 51 }, { "r": 255, "g": 51, "b": 51 }, { "r": 255, "g": 102, "b": 51 }, { "r": 255, "g": 153, "b": 51 }, { "r": 255, "g": 204, "b": 51 }, { "r": 255, "g": 255, "b": 51 }, { "r": 204, "g": 255, "b": 51 }, { "r": 153, "g": 255, "b": 51 }, { "r": 102, "g": 255, "b": 51 }, { "r": 51, "g": 255, "b": 51 }, { "r": 51, "g": 255, "b": 51 }, { "r": 51, "g": 255, "b": 51 }, { "r": 51, "g": 255, "b": 102 }, { "r": 51, "g": 255, "b": 153 }, { "r": 51, "g": 255, "b": 204 }, { "r": 153, "g": 153, "b": 153 }, { "r": 0, "g": 255, "b": 255 }, { "r": 0, "g": 204, "b": 255 }, { "r": 0, "g": 153, "b": 255 }, { "r": 0, "g": 102, "b": 255 }, { "r": 0, "g": 51, "b": 255 }, { "r": 0, "g": 0, "b": 255 }, { "r": 51, "g": 0, "b": 255 }, { "r": 102, "g": 0, "b": 255 }, { "r": 153, "g": 0, "b": 255 }, { "r": 204, "g": 0, "b": 255 }, { "r": 255, "g": 0, "b": 255 }, { "r": 255, "g": 0, "b": 204 }, { "r": 255, "g": 0, "b": 153 }, { "r": 255, "g": 0, "b": 102 }, { "r": 255, "g": 0, "b": 51 }, { "r": 255, "g": 0, "b": 0 }, { "r": 255, "g": 51, "b": 0 }, { "r": 255, "g": 102, "b": 0 }, { "r": 255, "g": 153, "b": 0 }, { "r": 255, "g": 204, "b": 0 }, { "r": 255, "g": 255, "b": 0 }, { "r": 204, "g": 255, "b": 0 }, { "r": 153, "g": 255, "b": 0 }, { "r": 102, "g": 255, "b": 0 }, { "r": 51, "g": 255, "b": 0 }, { "r": 0, "g": 255, "b": 0 }, { "r": 0, "g": 255, "b": 51 }, { "r": 0, "g": 255, "b": 102 }, { "r": 0, "g": 255, "b": 153 }, { "r": 0, "g": 255, "b": 204 }, { "r": 102, "g": 102, "b": 102 }, { "r": 0, "g": 204, "b": 204 }, { "r": 0, "g": 204, "b": 204 }, { "r": 0, "g": 153, "b": 204 }, { "r": 0, "g": 102, "b": 204 }, { "r": 0, "g": 51, "b": 204 }, { "r": 0, "g": 0, "b": 204 }, { "r": 51, "g": 0, "b": 204 }, { "r": 102, "g": 0, "b": 204 }, { "r": 153, "g": 0, "b": 204 }, { "r": 204, "g": 0, "b": 204 }, { "r": 204, "g": 0, "b": 204 }, { "r": 204, "g": 0, "b": 204 }, { "r": 204, "g": 0, "b": 153 }, { "r": 204, "g": 0, "b": 102 }, { "r": 204, "g": 0, "b": 51 }, { "r": 204, "g": 0, "b": 0 }, { "r": 204, "g": 51, "b": 0 }, { "r": 204, "g": 102, "b": 0 }, { "r": 204, "g": 153, "b": 0 }, { "r": 204, "g": 204, "b": 0 }, { "r": 204, "g": 204, "b": 0 }, { "r": 204, "g": 204, "b": 0 }, { "r": 153, "g": 204, "b": 0 }, { "r": 102, "g": 204, "b": 0 }, { "r": 51, "g": 204, "b": 0 }, { "r": 0, "g": 204, "b": 0 }, { "r": 0, "g": 204, "b": 51 }, { "r": 0, "g": 204, "b": 102 }, { "r": 0, "g": 204, "b": 153 }, { "r": 0, "g": 204, "b": 204 }, { "r": 102, "g": 102, "b": 102 }, { "r": 0, "g": 153, "b": 153 }, { "r": 0, "g": 153, "b": 153 }, { "r": 0, "g": 153, "b": 153 }, { "r": 0, "g": 102, "b": 153 }, { "r": 0, "g": 51, "b": 153 }, { "r": 0, "g": 0, "b": 153 }, { "r": 51, "g": 0, "b": 153 }, { "r": 102, "g": 0, "b": 153 }, { "r": 153, "g": 0, "b": 153 }, { "r": 153, "g": 0, "b": 153 }, { "r": 153, "g": 0, "b": 153 }, { "r": 153, "g": 0, "b": 153 }, { "r": 153, "g": 0, "b": 153 }, { "r": 153, "g": 0, "b": 102 }, { "r": 153, "g": 0, "b": 51 }, { "r": 153, "g": 0, "b": 0 }, { "r": 153, "g": 51, "b": 0 }, { "r": 153, "g": 102, "b": 0 }, { "r": 153, "g": 153, "b": 0 }, { "r": 153, "g": 153, "b": 0 }, { "r": 153, "g": 153, "b": 0 }, { "r": 153, "g": 153, "b": 0 }, { "r": 153, "g": 153, "b": 0 }, { "r": 102, "g": 153, "b": 0 }, { "r": 51, "g": 153, "b": 0 }, { "r": 0, "g": 153, "b": 0 }, { "r": 0, "g": 153, "b": 51 }, { "r": 0, "g": 153, "b": 102 }, { "r": 0, "g": 153, "b": 153 }, { "r": 0, "g": 153, "b": 153 }, { "r": 51, "g": 51, "b": 51 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 51, "b": 102 }, { "r": 0, "g": 0, "b": 102 }, { "r": 51, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 102 }, { "r": 102, "g": 0, "b": 51 }, { "r": 102, "g": 0, "b": 0 }, { "r": 102, "g": 51, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 102, "g": 102, "b": 0 }, { "r": 51, "g": 102, "b": 0 }, { "r": 0, "g": 102, "b": 0 }, { "r": 0, "g": 102, "b": 51 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 102, "b": 102 }, { "r": 0, "g": 0, "b": 0 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 51 }, { "r": 51, "g": 0, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 51, "g": 51, "b": 0 }, { "r": 0, "g": 51, "b": 0 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 0, "g": 51, "b": 51 }, { "r": 51, "g": 51, "b": 51 }],
	        "columns": 31,
	        "rows": 9
	    }
	};
	module.exports = exports["default"];

/***/ },
/* 7 */
/***/ function(module, exports, __webpack_require__) {

	/**
	 * Utility functions
	 */

	'use strict';

	var util = {};

	util.isObject = function isObject(arg) {
	  return typeof arg === 'object' && arg !== null;
	};

	util.isNumber = function isNumber(arg) {
	  return typeof arg === 'number';
	};

	util.isUndefined = function isUndefined(arg) {
	  return arg === void 0;
	};

	util.isFunction = function isFunction(arg) {
	  return typeof arg === 'function';
	};

	/**
	 * EventEmitter class
	 */

	function EventEmitter() {
	  EventEmitter.init.call(this);
	}
	module.exports = EventEmitter;

	// Backwards-compat with node 0.10.x
	EventEmitter.EventEmitter = EventEmitter;

	EventEmitter.prototype._events = undefined;
	EventEmitter.prototype._maxListeners = undefined;

	// By default EventEmitters will print a warning if more than 10 listeners are
	// added to it. This is a useful default which helps finding memory leaks.
	EventEmitter.defaultMaxListeners = 10;

	EventEmitter.init = function () {
	  this._events = this._events || {};
	  this._maxListeners = this._maxListeners || undefined;
	};

	// Obviously not all Emitters should be limited to 10. This function allows
	// that to be increased. Set to zero for unlimited.
	EventEmitter.prototype.setMaxListeners = function (n) {
	  if (!util.isNumber(n) || n < 0 || isNaN(n)) throw TypeError('n must be a positive number');
	  this._maxListeners = n;
	  return this;
	};

	EventEmitter.prototype.emit = function (type) {
	  var er, handler, len, args, i, listeners;

	  if (!this._events) this._events = {};

	  // If there is no 'error' event listener then throw.
	  if (type === 'error' && !this._events.error) {
	    er = arguments[1];
	    if (er instanceof Error) {
	      throw er; // Unhandled 'error' event
	    } else {
	      throw Error('Uncaught, unspecified "error" event.');
	    }
	    return false;
	  }

	  handler = this._events[type];

	  if (util.isUndefined(handler)) return false;

	  if (util.isFunction(handler)) {
	    switch (arguments.length) {
	      // fast cases
	      case 1:
	        handler.call(this);
	        break;
	      case 2:
	        handler.call(this, arguments[1]);
	        break;
	      case 3:
	        handler.call(this, arguments[1], arguments[2]);
	        break;
	      // slower
	      default:
	        len = arguments.length;
	        args = new Array(len - 1);
	        for (i = 1; i < len; i++) args[i - 1] = arguments[i];
	        handler.apply(this, args);
	    }
	  } else if (util.isObject(handler)) {
	    len = arguments.length;
	    args = new Array(len - 1);
	    for (i = 1; i < len; i++) args[i - 1] = arguments[i];

	    listeners = handler.slice();
	    len = listeners.length;
	    for (i = 0; i < len; i++) listeners[i].apply(this, args);
	  }

	  return true;
	};

	EventEmitter.prototype.addListener = function (type, listener) {
	  var m;

	  if (!util.isFunction(listener)) throw TypeError('listener must be a function');

	  if (!this._events) this._events = {};

	  // To avoid recursion in the case that type === "newListener"! Before
	  // adding it to the listeners, first emit "newListener".
	  if (this._events.newListener) this.emit('newListener', type, util.isFunction(listener.listener) ? listener.listener : listener);

	  if (!this._events[type])
	    // Optimize the case of one listener. Don't need the extra array object.
	    this._events[type] = listener;else if (util.isObject(this._events[type]))
	    // If we've already got an array, just append.
	    this._events[type].push(listener);else
	    // Adding the second element, need to change to array.
	    this._events[type] = [this._events[type], listener];

	  // Check for listener leak
	  if (util.isObject(this._events[type]) && !this._events[type].warned) {
	    var m;
	    if (!util.isUndefined(this._maxListeners)) {
	      m = this._maxListeners;
	    } else {
	      m = EventEmitter.defaultMaxListeners;
	    }

	    if (m && m > 0 && this._events[type].length > m) {
	      this._events[type].warned = true;

	      if (util.isFunction(console.error)) {
	        console.error('(node) warning: possible EventEmitter memory ' + 'leak detected. %d listeners added. ' + 'Use emitter.setMaxListeners() to increase limit.', this._events[type].length);
	      }
	      if (util.isFunction(console.trace)) console.trace();
	    }
	  }

	  return this;
	};

	EventEmitter.prototype.on = EventEmitter.prototype.addListener;

	EventEmitter.prototype.once = function (type, listener) {
	  if (!util.isFunction(listener)) throw TypeError('listener must be a function');

	  var fired = false;

	  function g() {
	    this.removeListener(type, g);

	    if (!fired) {
	      fired = true;
	      listener.apply(this, arguments);
	    }
	  }

	  g.listener = listener;
	  this.on(type, g);

	  return this;
	};

	// emits a 'removeListener' event iff the listener was removed
	EventEmitter.prototype.removeListener = function (type, listener) {
	  var list, position, length, i;

	  if (!util.isFunction(listener)) throw TypeError('listener must be a function');

	  if (!this._events || !this._events[type]) return this;

	  list = this._events[type];
	  length = list.length;
	  position = -1;

	  if (list === listener || util.isFunction(list.listener) && list.listener === listener) {
	    delete this._events[type];
	    if (this._events.removeListener) this.emit('removeListener', type, listener);
	  } else if (util.isObject(list)) {
	    for (i = length; i-- > 0;) {
	      if (list[i] === listener || list[i].listener && list[i].listener === listener) {
	        position = i;
	        break;
	      }
	    }

	    if (position < 0) return this;

	    if (list.length === 1) {
	      list.length = 0;
	      delete this._events[type];
	    } else {
	      list.splice(position, 1);
	    }

	    if (this._events.removeListener) this.emit('removeListener', type, listener);
	  }

	  return this;
	};

	EventEmitter.prototype.removeAllListeners = function (type) {
	  var key, listeners;

	  if (!this._events) return this;

	  // not listening for removeListener, no need to emit
	  if (!this._events.removeListener) {
	    if (arguments.length === 0) this._events = {};else if (this._events[type]) delete this._events[type];
	    return this;
	  }

	  // emit removeListener for all listeners on all events
	  if (arguments.length === 0) {
	    for (key in this._events) {
	      if (key === 'removeListener') continue;
	      this.removeAllListeners(key);
	    }
	    this.removeAllListeners('removeListener');
	    this._events = {};
	    return this;
	  }

	  listeners = this._events[type];

	  if (util.isFunction(listeners)) {
	    this.removeListener(type, listeners);
	  } else if (Array.isArray(listeners)) {
	    // LIFO order
	    while (listeners.length) this.removeListener(type, listeners[listeners.length - 1]);
	  }
	  delete this._events[type];

	  return this;
	};

	EventEmitter.prototype.listeners = function (type) {
	  var ret;
	  if (!this._events || !this._events[type]) ret = [];else if (util.isFunction(this._events[type])) ret = [this._events[type]];else ret = this._events[type].slice();
	  return ret;
	};

	EventEmitter.listenerCount = function (emitter, type) {
	  var ret;
	  if (!emitter._events || !emitter._events[type]) ret = 0;else if (util.isFunction(emitter._events[type])) ret = 1;else ret = emitter._events[type].length;
	  return ret;
	};

/***/ },
/* 8 */
/***/ function(module, exports, __webpack_require__) {

	'use strict';

	Object.defineProperty(exports, '__esModule', {
	    value: true
	});

	function _interopRequireWildcard(obj) { if (obj && obj.__esModule) { return obj; } else { var newObj = {}; if (obj != null) { for (var key in obj) { if (Object.prototype.hasOwnProperty.call(obj, key)) newObj[key] = obj[key]; } } newObj['default'] = obj; return newObj; } }

	var _LookupTableJs = __webpack_require__(5);

	var LookupTable = _interopRequireWildcard(_LookupTableJs);

	var _LookupTableManagerJs = __webpack_require__(4);

	var LookupTableManager = _interopRequireWildcard(_LookupTableManagerJs);

	var _PresetsJs = __webpack_require__(6);

	var Presets = _interopRequireWildcard(_PresetsJs);

	exports.LookupTable = LookupTable;
	exports.LookupTableManager = LookupTableManager;
	exports.Presets = Presets;

/***/ }
/******/ ]);
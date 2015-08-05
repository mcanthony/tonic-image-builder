var programReqs = {
        'basicVertex': require('./shaders/vertex/basicVertex.c'),
        'displayFragment': require('./shaders/fragment/displayFragment.c'),
        'compositeFragment': require('./shaders/fragment/compositeFragment.c')
    },
    CanvasOffscreenBuffer = require('../CanvasOffscreenBuffer'),
    max                   = require('mout/object/max'),
    Monologue             = require('monologue.js'),
    WebGlUtil             = require('../WebGlUtils'),
    IMAGE_READY_TOPIC     = 'image-ready';

export default function WebGlCompositor(queryDataModel) {
    this.gl = 0;
    this.displayProgram = null;
    this.compositeProgram = null;
    this.texCoordBuffer = 0;
    this.posCoordBuffer = 0;
    this.texture = 0;
    this.fb1 = 0;
    this.fb2 = 0;
    this.rt1 = 0;
    this.rt2 = 0;
    this.pong = false;
    this.fbo = 0;
    this.renderTexture = 0;
    this.imgw = 500;
    this.imgh = 500;
    this.glCanvas = null;

    this.queryDataModel = queryDataModel;
    this.compositePipeline = queryDataModel.originalData.CompositePipeline;
    this.offsetList = [];
    this.spriteSize = max(this.compositePipeline.offset);
    this.query = this.compositePipeline.default_pipeline;
    if (this.query) {
      this.updateOffsetList(this.query);
    }

    this.rgbdSprite = null;

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.rgbdSprite = data.rgbdSprite.image;
        this.render();
    });

    // Old init method code
    this.imgw = this.compositePipeline.dimensions[0];
    this.imgh = this.compositePipeline.dimensions[1];
    this.glCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.compositeCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.compositeCtx = this.compositeCanvas.get2DContext();

    //Inialize GL context
    this.gl = this.glCanvas.get3DContext();
    if (!this.gl) {
      console.error("Unable to get WebGl context");
      return null;
    }

    // Set clear color to white, fully transparent
    this.gl.clearColor(1.0, 1.0, 1.0, 0.0);

    // Create a texture object
    this.createTexture();

    // Create vertex position and tex coord buffers
    this.initAttribBuffers();

    // Set up the display shader program
    var displayVertexShader = WebGlUtil.initShader(this.gl, programReqs.basicVertex, this.gl.VERTEX_SHADER),
        displayFragmentShader = WebGlUtil.initShader(this.gl, programReqs.displayFragment, this.gl.FRAGMENT_SHADER);
    this.displayProgram = WebGlUtil.createShaderProgram(this.gl, [displayVertexShader, displayFragmentShader]);

    // look up where the vertex position coords need to go when using the display program
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posCoordBuffer);
    this.displayProgram.positionLocation = this.gl.getAttribLocation(this.displayProgram, "a_position");
    this.gl.enableVertexAttribArray(this.displayProgram.positionLocation);
    this.gl.vertexAttribPointer(this.displayProgram.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // ditto for vertex texture coords
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.displayProgram.texCoordLocation = this.gl.getAttribLocation(this.displayProgram, "a_texCoord");
    this.gl.enableVertexAttribArray(this.displayProgram.texCoordLocation);
    this.gl.vertexAttribPointer(this.displayProgram.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Set up the composite shader program
    var compositeVertexShader = WebGlUtil.initShader(this.gl, programReqs.basicVertex, this.gl.VERTEX_SHADER),
        compositeFragmentShader = WebGlUtil.initShader(this.gl, programReqs.compositeFragment, this.gl.FRAGMENT_SHADER);
    this.compositeProgram = WebGlUtil.createShaderProgram(this.gl, [compositeVertexShader, compositeFragmentShader]);

    // look up where the vertex position coords need to go when using the compositing program
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posCoordBuffer);
    this.compositeProgram.positionLocation = this.gl.getAttribLocation(this.compositeProgram, "a_position");
    this.gl.enableVertexAttribArray(this.compositeProgram.positionLocation);
    this.gl.vertexAttribPointer(this.compositeProgram.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // ditto for vertex texture coords
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.compositeProgram.texCoordLocation = this.gl.getAttribLocation(this.compositeProgram, "a_texCoord");
    this.gl.enableVertexAttribArray(this.compositeProgram.texCoordLocation);
    this.gl.vertexAttribPointer(this.compositeProgram.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // Create two framebuffers for repeated rendering to texture
    var pingFbo = this.initFrameBuffer();
    this.fb1 = pingFbo[0];
    this.rt1 = pingFbo[1];

    var pongFbo = this.initFrameBuffer();
    this.fb2 = pongFbo[0];
    this.rt2 = pongFbo[1];

    this.pong = true;
    this.fbo = this.fb1;
    this.renderTexture = this.rt2;
};


// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGlCompositor);

// Method used by widgets to create necessary UI components dynamically based on
// the concrete instance of the image builder.
WebGlCompositor.prototype.needsWidget = function(name) {
  return false;
};


// Update the composite pipeline query
// Sample query: "BACADAGBHBIB" means color layers B, C, and D by field A,
// color layers G, H, and I by field B
WebGlCompositor.prototype.setPipelineQuery = function(query) {
  if(this.query !== query) {
      this.query = query;
      this.updateOffsetList(query);
      this.render();
  }
};


WebGlCompositor.prototype.updateOffsetList = function(query) {
    var layers = this.compositePipeline.layers,
        count = layers.length,
        offsets = this.compositePipeline.offset;

    this.offsetList = [];
    for(var idx = 0; idx < count; idx++) {
        var fieldCode = query[idx*2 + 1];
        if(fieldCode !== '_') {
          this.offsetList.push(this.spriteSize - offsets[layers[idx] + fieldCode]);
        }
    }
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.update = function() {
    this.queryDataModel.fetchData();
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.render = function() {
    if (!this.rgbdSprite || !this.query) {
      console.log("Not enough data to render");
      return;
    }

    this.clearFbo();

    for (var i = 0, size = this.offsetList.length; i < size; ++i) {
      //console.log(i);
      var layerIdx = this.offsetList[i];
      var srcX = 0;
      var srcY = layerIdx * this.imgh;

      // Because the png has transparency, we need to clear the canvas, or else
      // we end up with some blending when we draw the next image
      this.compositeCtx.clearRect(0, 0, this.imgw, this.imgh);
      this.compositeCtx.drawImage(this.rgbdSprite,
                      srcX, srcY, this.imgw, this.imgh,
                      0, 0, this.imgw, this.imgh);

      this.drawCompositePass();
    }

    this.drawDisplayPass();

    var readyImage = {
            canvas: this.glCanvas.el,
            //imageData: this.bgCanvas.el.getContext('2d').getImageData(0, 0, width, height),
            area: [0, 0, this.imgw, this.imgh],
            outputSize: [this.imgw, this.imgh],
            type: 'composite'
        };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.destroy = function() {
  // Clean up the display program and its shaders
  for (var i = 0; i < this.displayProgram.shaders.length; i+=1) {
    this.gl.deleteShader(this.displayProgram.shaders[i]);
  }
  this.gl.deleteProgram(this.displayProgram);

  // Clean up the composite program and its shaders
  for (var j = 0; j < this.compositeProgram.shaders.length; j+=1) {
    this.gl.deleteShader(this.compositeProgram.shaders[j]);
  }
  this.gl.deleteProgram(this.compositeProgram);

  // Now clean up stuff related to fbos
  this.gl.deleteFramebuffer(this.fb1);
  this.gl.deleteTexture(this.rt1);
  this.gl.deleteFramebuffer(this.fb2);
  this.gl.deleteTexture(this.rt2);

  // Also clean up textures and attribute buffers
  this.gl.deleteTexture(this.texture);
  this.gl.deleteBuffer(this.texCoordBuffer);
  this.gl.deleteBuffer(this.posCoordBuffer);

  // And finally, reset flags to indicate shaders not yet loaded
  for (var progReq in programReqs) {
    if (_.has(programReqs, progReq)) {
      programReqs[progReq].loaded = false;
    }
  }
};

WebGlCompositor.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

WebGlCompositor.prototype.TopicImageReady = function() {
    return IMAGE_READY_TOPIC;
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.initAttribBuffers = function() {
  // Create buffer for vertex texture coordinates
  this.texCoordBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
    0.0,  0.0,
    1.0,  0.0,
    0.0,  1.0,
    0.0,  1.0,
    1.0,  0.0,
    1.0,  1.0]), this.gl.STATIC_DRAW);

  // Create a buffer for the vertex positions
  this.posCoordBuffer = this.gl.createBuffer();
  this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posCoordBuffer);
  var x1 = -1;
  var x2 = 1;
  var y1 = -1;
  var y2 = 1;
  this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([
    x1, y1,
    x2, y1,
    x1, y2,
    x1, y2,
    x2, y1,
    x2, y2]), this.gl.STATIC_DRAW);
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.initFrameBuffer = function() {
  // Create and bind a framebuffer
  var fbo = this.gl.createFramebuffer();
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, fbo);
  fbo.width = this.imgw;
  fbo.height = this.imgh;

  // Need a texture we can bind after rendering to the fbo
  var rTex = this.gl.createTexture();

  this.gl.bindTexture(this.gl.TEXTURE_2D, rTex);
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);

  // Calling with null image data means we intend to render to this texture
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, fbo.width, fbo.height,
                0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, null);

  // Attach the color buffer to fbo
  this.gl.framebufferTexture2D(this.gl.FRAMEBUFFER, this.gl.COLOR_ATTACHMENT0,
                          this.gl.TEXTURE_2D, rTex, 0);

  // Check fbo status
  var fbs = this.gl.checkFramebufferStatus(this.gl.FRAMEBUFFER);
  if (fbs !== this.gl.FRAMEBUFFER_COMPLETE) {
    console.log("ERROR: There is a problem with the framebuffer: " + fbs);
  }

  // Clear the bindings we created in this function.
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

  return [fbo, rTex];
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.swapFbos = function() {
  if (this.pong === true) {
    this.fbo = this.fb2;
    this.renderTexture = this.rt1;
    this.pong = false;
  } else {
    this.fbo = this.fb1;
    this.renderTexture = this.rt2;
    this.pong = true;
  }
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.createTexture = function() {
  // Create a texture.
  this.texture = this.gl.createTexture();

  this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

  // Set the parameters so we can render any size image.
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
};


WebGlCompositor.prototype.drawDisplayPass = function() {
  // Draw to the screen framebuffer
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

  // Using the display shader program
  this.gl.useProgram(this.displayProgram);

  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.imgw, this.imgh);

  // Set up the sampler uniform and bind the rendered texture
  var u_image = this.gl.getUniformLocation(this.displayProgram, "u_image");
  this.gl.uniform1i(u_image, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.drawCompositePass = function() {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);

  // Using the compositing shader program
  this.gl.useProgram(this.compositeProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.imgw, this.imgh);

  // Set up the layer texture
  var layer = this.gl.getUniformLocation(this.compositeProgram, "layerSampler");
  this.gl.uniform1i(layer, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.compositeCanvas.el);

  // Set up the sampler uniform and bind the rendered texture
  var composite = this.gl.getUniformLocation(this.compositeProgram, "compositeSampler");
  this.gl.uniform1i(composite, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.swapFbos();
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlCompositor.prototype.clearFbo = function() {
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb2);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.pong = true;
  this.fbo = this.fb1;
  this.renderTexture = this.rt2;
};

// Method meant to be used with the WidgetFactory
WebGlCompositor.prototype.getControlWidgets = function() {
    return [ "QueryDataModelWidget" ];
};

WebGlCompositor.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

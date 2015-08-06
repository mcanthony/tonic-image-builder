var programReqs = {
        'basicVertex': require('./shaders/vertex/basicVertex.c'),
        'displayFragment': require('./shaders/fragment/displayFragment.c'),
        'compositeLightFragment': require('./shaders/fragment/compositeLightFragment.c'),
        'backgroundFragment': require('./shaders/fragment/backgroundFragment.c')
    },
    CanvasOffscreenBuffer = require('../CanvasOffscreenBuffer'),
    max                   = require('mout/object/max'),
    vec3                  = require('gl-matrix/src/gl-matrix/vec3.js'),
    vec4                  = require('gl-matrix/src/gl-matrix/vec4.js'),
    Monologue             = require('monologue.js'),
    WebGlUtil             = require('../WebGlUtils'),
    IMAGE_READY_TOPIC     = 'image-ready';

export default function WebGlLightCompositor(queryDataModel, pipelineModel, lookupTableManager) {
    this.gl = 0;
    this.displayProgram = null;
    this.compositeProgram = null;
    this.compositeLightProgram = null;
    this.backgrounProgram = null;
    this.texCoordBuffer = 0;
    this.posCoordBuffer = 0;
    this.texture = 0;
    this.lutTexture = 0;
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
    this.bgColor = [ 1.0, 1.0, 1.0 ];
    this.lightingTextureNames = [ 'nx', 'ny', 'nz', 'scalars' ];
    this.lightingTextures = {};
    this.worldLight = vec3.create();
    this.xLightDirs = { 'left': -1, 'center': 0, 'right': 1 };
    this.yLightDirs = { 'bottom': -1, 'center': 0, 'top': 1 };
    this.lightTerms = {
      'ka': 0.1,
      'kd': 0.6,
      'ks': 0.3,
      'alpha': 20
    };
    this.lightColor = [ 0.8, 0.8, 0.8 ];
    this.lutData = new Uint8Array([0, 0, 255, 255, 255, 255, 255, 255, 255, 0, 0, 255]);

    this.queryDataModel = queryDataModel;
    this.pipelineModel = pipelineModel;
    this.compositePipeline = queryDataModel.originalData.CompositePipeline;
    this.lutManager = lookupTableManager;
    this.lutManager.addFields(this.compositePipeline.ranges);
    this.offsetList = [];
    this.spriteSize = max(this.compositePipeline.offset);
    this.query = this.compositePipeline.default_pipeline;
    if (this.query) {
      this.updateOffsetList(this.query);
    }

    this.rgbdSprite = null;

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.sxyzSprite = data.sxyzSprite.image;
        this.render();
    });

    // Old init method code
    this.imgw = this.compositePipeline.dimensions[0];
    this.imgh = this.compositePipeline.dimensions[1];
    this.glCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.compositeCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.compositeCtx = this.compositeCanvas.get2DContext();

    this.scalarCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.scalarCtx = this.scalarCanvas.get2DContext();
    this.nxCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.nxCtx = this.nxCanvas.get2DContext();
    this.nyCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.nyCtx = this.nyCanvas.get2DContext();
    this.nzCanvas = new CanvasOffscreenBuffer(this.imgw, this.imgh);
    this.nzCtx = this.nzCanvas.get2DContext();


    //Inialize GL context
    this.gl = this.glCanvas.get3DContext();
    if (!this.gl) {
      console.error("Unable to get WebGl context");
      return null;
    }

    // Set clear color to white, fully transparent
    this.gl.clearColor(1.0, 1.0, 1.0, 0.0);

    // Create needed texture objects
    this.createTextures();

    // Create vertex position and tex coord buffers
    this.initAttribBuffers();

    //
    // Set up the display shader program
    //
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

    //
    // Set up the lighting/compositing shader program
    //
    var compositeLightVertexShader = WebGlUtil.initShader(this.gl, programReqs.basicVertex, this.gl.VERTEX_SHADER),
        compositeLightFragmentShader = WebGlUtil.initShader(this.gl, programReqs.compositeLightFragment, this.gl.FRAGMENT_SHADER);
    this.compositeLightProgram = WebGlUtil.createShaderProgram(this.gl, [compositeLightVertexShader, compositeLightFragmentShader]);

    // look up where the vertex position coords need to go when using the compositing program
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posCoordBuffer);
    this.compositeLightProgram.positionLocation = this.gl.getAttribLocation(this.compositeLightProgram, "a_position");
    this.gl.enableVertexAttribArray(this.compositeLightProgram.positionLocation);
    this.gl.vertexAttribPointer(this.compositeLightProgram.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // ditto for vertex texture coords
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.compositeLightProgram.texCoordLocation = this.gl.getAttribLocation(this.compositeLightProgram, "a_texCoord");
    this.gl.enableVertexAttribArray(this.compositeLightProgram.texCoordLocation);
    this.gl.vertexAttribPointer(this.compositeLightProgram.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    //
    // Set up the background shader program
    //
    var backgroundVertexShader = WebGlUtil.initShader(this.gl, programReqs.basicVertex, this.gl.VERTEX_SHADER),
        backgroundFragmentShader = WebGlUtil.initShader(this.gl, programReqs.backgroundFragment, this.gl.FRAGMENT_SHADER);
    this.backgroundProgram = WebGlUtil.createShaderProgram(this.gl, [backgroundVertexShader, backgroundFragmentShader]);

    // look up where the vertex position coords need to go when using the compositing program
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.posCoordBuffer);
    this.backgroundProgram.positionLocation = this.gl.getAttribLocation(this.backgroundProgram, "a_position");
    this.gl.enableVertexAttribArray(this.backgroundProgram.positionLocation);
    this.gl.vertexAttribPointer(this.backgroundProgram.positionLocation, 2, this.gl.FLOAT, false, 0, 0);

    // ditto for vertex texture coords
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.backgroundProgram.texCoordLocation = this.gl.getAttribLocation(this.backgroundProgram, "a_texCoord");
    this.gl.enableVertexAttribArray(this.backgroundProgram.texCoordLocation);
    this.gl.vertexAttribPointer(this.backgroundProgram.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

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

    this.pipelineSubscription = this.pipelineModel.onChange((data, envelope) => {
        this.setPipelineQuery(data);
    });
    this.setPipelineQuery(this.pipelineModel.getPipelineQuery());
};


// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGlLightCompositor);


// Update Composite pipeline setting
WebGlLightCompositor.prototype.setPipelineQuery = function(query) {
  if(this.query !== query) {
      this.query = query;
      this.updateOffsetList(query);
      this.render();
  }
};

// Internal method to extract meaningful information from the pipeline query
WebGlLightCompositor.prototype.updateOffsetList = function(query) {
    var layers = this.compositePipeline.layers,
        count = layers.length,
        offsets = this.compositePipeline.offset,
        fieldDependencies = this.compositePipeline.color_by_dependencies;

    this.offsetList = [];
    for(var idx = 0; idx < count; idx++) {
        var fieldCode = query[idx*2 + 1];
        if(fieldCode !== '_') {
            if (fieldDependencies[fieldCode]) {
              var depends = fieldDependencies[fieldCode];
              if (depends.normal) {
                var nx = depends.normal[0], ny = depends.normal[1], nz = depends.normal[2];
                this.offsetList.push({
                  'scalar': this.spriteSize - offsets[layers[idx] + fieldCode],
                  'nx': this.spriteSize - offsets[layers[idx] + nx],
                  'ny': this.spriteSize - offsets[layers[idx] + ny],
                  'nz': this.spriteSize - offsets[layers[idx] + nz]
                });
              }
            }
        }
    }
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.update = function() {
    this.queryDataModel.fetchData();
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.spherical2Cartesian = function (phi, theta) {
  var nPhi = parseFloat(phi),
      nTheta = parseFloat(theta),
      phiRad = (180.0 - nPhi) * Math.PI / 180.0,
      thetaRad = (180.0 - nTheta) * Math.PI / 180.0;
  return [
    Math.sin(thetaRad) * Math.cos(phiRad),
    Math.sin(thetaRad) * Math.sin(phiRad),
    Math.cos(thetaRad)
  ];
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.recomputeLight = function (viewDirection) {
  //construct a coordinate system relative to eye point
  var viewDir = vec3.fromValues(viewDirection[0], viewDirection[1], viewDirection[2]);
  var at = vec3.fromValues(0, 0, 0); //assumption always looking at 0
  var north = vec3.fromValues(0, 0, 1);  //assumption, north is always up
  var approxUp = vec3.create();
  vec3.add(approxUp, north, viewDir);
  vec3.normalize(approxUp, approxUp);

  var t0 = vec3.create();
  vec3.subtract(t0, at, viewDir);
  var t1 = vec3.create();
  vec3.subtract(t1, approxUp, viewDir);
  var right = vec3.create();
  vec3.cross(right, t0, t1);
  vec3.normalize(right, right);

  vec3.subtract(t0, right, viewDir);
  vec3.subtract(t1, at, viewDir);
  var up = vec3.create();
  vec3.cross(up, t0, t1);
  vec3.normalize(up, up);

  //scale down so we can alway have room before normalization
  var rm = vec3.create();
  vec3.scale(rm, right, this.xLightDirs.left * 0.3);
  var um = vec3.create();
  vec3.scale(um, up, this.yLightDirs.top * 0.3);

  var scaledView = vec3.create();
  vec3.scale(scaledView, viewDir, 0.3);
  vec3.add(this.worldLight, scaledView, rm);
  vec3.add(this.worldLight, this.worldLight, um);
  vec3.normalize(this.worldLight, this.worldLight);
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.render = function() {
    if (!this.sxyzSprite || !this.query) {
      console.log("Not enough data to render");
      return;
    }

    this.clearFbo();

    var viewDir = this.spherical2Cartesian(this.queryDataModel.getValue('phi'), this.queryDataModel.getValue('theta'));
    this.recomputeLight(viewDir);

    var srcX = 0, srcY = 0, imgw = this.imgw, imgh = this.imgh;

    // Draw a background pass
    this.compositeCtx.clearRect(0, 0, imgw, imgh);
    this.compositeCtx.drawImage(this.sxyzSprite, 0, (this.spriteSize * imgh), imgw, imgh, 0, 0, imgw, imgh);
    this.drawBackgroundPass(this.bgColor);

    for (var i = 0, size = this.offsetList.length; i < size; i+=1) {
      var lOffMap = this.offsetList[i];
      srcX = 0;
      srcY = 0;

      // Copy the nx buffer
      srcY = lOffMap.nx * imgh;
      this.nxCtx.clearRect(0, 0, imgw, imgh);
      this.nxCtx.drawImage(this.sxyzSprite, srcX, srcY, imgw, imgh, 0, 0, imgw, imgh);

      // Copy the ny buffer
      srcY = lOffMap.ny * imgh;
      this.nyCtx.clearRect(0, 0, imgw, imgh);
      this.nyCtx.drawImage(this.sxyzSprite, srcX, srcY, imgw, imgh, 0, 0, imgw, imgh);

      // Copy the nz buffer
      srcY = lOffMap.nz * imgh;
      this.nzCtx.clearRect(0, 0, imgw, imgh);
      this.nzCtx.drawImage(this.sxyzSprite, srcX, srcY, imgw, imgh, 0, 0, imgw, imgh);

      // Copy the scalar buffer
      srcY = lOffMap.scalar * imgh;
      this.scalarCtx.clearRect(0, 0, imgw, imgh);
      this.scalarCtx.drawImage(this.sxyzSprite, srcX, srcY, imgw, imgh, 0, 0, imgw, imgh);

      this.drawLitCompositePass(viewDir, this.worldLight, this.lightTerms, this.lightColor,
                                                this.nxCanvas, this.nyCanvas, this.nzCanvas, this.scalarCanvas,
                                                this.lutData);
                                                //this.lutArrayViews[lOffMap.colorBy]);
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
WebGlLightCompositor.prototype.destroy = function() {
  this.pipelineSubscription.unsubscribe();
  this.pipelineSubscription = null;

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

  // Clean up the composite light program and its shaders
  for (var k = 0; k < this.compositeLightProgram.shaders.length; k+=1) {
    this.gl.deleteShader(this.compositeLightProgram.shaders[k]);
  }
  this.gl.deleteProgram(this.compositeLightProgram);

  // Clean up the background program and its shaders
  for (var l = 0; l < this.backgroundProgram.shaders.length; l+=1) {
    this.gl.deleteShader(this.backgroundProgram.shaders[l]);
  }
  this.gl.deleteProgram(this.backgroundProgram);

  // Now clean up fbo, textures, and buffers
  this.gl.deleteFramebuffer(this.fb1);
  this.gl.deleteTexture(this.rt1);
  this.gl.deleteFramebuffer(this.fb2);
  this.gl.deleteTexture(this.rt2);
  this.gl.deleteTexture(this.texture);
  this.gl.deleteTexture(this.lutTexture);
  this.gl.deleteBuffer(this.texCoordBuffer);
  this.gl.deleteBuffer(this.posCoordBuffer);

  for (var m = 0; m < this.lightingTextureNames.length; m+=1) {
    this.gl.deleteTexture(this.lightingTextures[lightingTextureNames[m]]);
  }
};

WebGlLightCompositor.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

WebGlLightCompositor.prototype.TopicImageReady = function() {
    return IMAGE_READY_TOPIC;
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.initAttribBuffers = function() {
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
WebGlLightCompositor.prototype.initFrameBuffer = function() {
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
WebGlLightCompositor.prototype.swapFbos = function() {
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
WebGlLightCompositor.prototype.createTextures = function() {
  // Create a texture.
  this.texture = this.gl.createTexture();

  this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

  // Set the parameters so we can render any size image.
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

  // Also create some texture for passing in lighting values
  for (var i = 0; i < this.lightingTextureNames.length; i+=1) {
    this.lightingTextures[this.lightingTextureNames[i]] = this.gl.createTexture();

    this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightingTextures[this.lightingTextureNames[i]]);
    this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

    // Set the parameters so we can render any size image.
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);
  }

  // Create one more texture for the lookup table
  this.lutTexture = this.gl.createTexture();

  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lutTexture);
  this.gl.pixelStorei(this.gl.UNPACK_FLIP_Y_WEBGL, true);

  // Set the parameters so we can render any size image.
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.NEAREST);
  this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.NEAREST);

  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
};


WebGlLightCompositor.prototype.drawDisplayPass = function() {
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

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
};


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.drawBackgroundPass = function(backgroundColor) {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);

  // Using the background shader program
  this.gl.useProgram(this.backgroundProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.imgw, this.imgh);

  var bgColor = vec4.fromValues(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1.0);
  var bgc = this.gl.getUniformLocation(this.backgroundProgram, "backgroundColor");
  this.gl.uniform4fv(bgc, bgColor);

  // Set up the layer texture
  var layer = this.gl.getUniformLocation(this.backgroundProgram, "backgroundSampler");
  this.gl.uniform1i(layer, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.texture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.compositeCanvas.el);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.swapFbos();

  // Now unbind the textures we used
  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.drawLitCompositePass = function (viewDir, lightDir, lightTerms, lightColor, nxCanvas, nyCanvas, nzCanvas, scalarCanvas, lutData) {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbo);

  // Using the lighting compositing shader program
  this.gl.useProgram(this.compositeLightProgram);

  this.gl.viewport(0, 0, this.imgw, this.imgh);

  var viewDirection = vec4.fromValues(viewDir[0], viewDir[1], viewDir[2], 0.0);
  var vdir = this.gl.getUniformLocation(this.compositeLightProgram, "viewDir");
  this.gl.uniform4fv(vdir, viewDirection);

  var lightDirection = vec4.fromValues(lightDir[0], lightDir[1], lightDir[2], 0.0);
  var ldir = this.gl.getUniformLocation(this.compositeLightProgram, "lightDir");
  this.gl.uniform4fv(ldir, lightDirection);

  var lightingConstants = vec4.fromValues(lightTerms.ka, lightTerms.kd, lightTerms.ks, lightTerms.alpha);
  var lterms = this.gl.getUniformLocation(this.compositeLightProgram, "lightTerms");
  this.gl.uniform4fv(lterms, lightingConstants);

  var lightCol = vec4.fromValues(lightColor[0], lightColor[1], lightColor[2], 1.0);
  var lcolor = this.gl.getUniformLocation(this.compositeLightProgram, "lightColor");
  this.gl.uniform4fv(lcolor, lightCol);

  // Set up the scalar texture
  var scalar = this.gl.getUniformLocation(this.compositeLightProgram, "scalarSampler");
  this.gl.uniform1i(scalar, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightingTextures.scalars);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.scalarCanvas.el);

  // Set up the normals (x component) texture
  var nx = this.gl.getUniformLocation(this.compositeLightProgram, "nxSampler");
  this.gl.uniform1i(nx, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightingTextures.nx);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.nxCanvas.el);

  // Set up the normals (y component) texture
  var ny = this.gl.getUniformLocation(this.compositeLightProgram, "nySampler");
  this.gl.uniform1i(ny, 2);
  this.gl.activeTexture(this.gl.TEXTURE0 + 2);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightingTextures.ny);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.nyCanvas.el);

  // Set up the normals (z component) texture
  var nz = this.gl.getUniformLocation(this.compositeLightProgram, "nzSampler");
  this.gl.uniform1i(nz, 3);
  this.gl.activeTexture(this.gl.TEXTURE0 + 3);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lightingTextures.nz);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.nzCanvas.el);

  // Set up the sampler uniform and bind the rendered texture
  var composite = this.gl.getUniformLocation(this.compositeLightProgram, "compositeSampler");
  this.gl.uniform1i(composite, 4);
  this.gl.activeTexture(this.gl.TEXTURE0 + 4);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.renderTexture);

  // Set up the lookup table texture
  var lut = this.gl.getUniformLocation(this.compositeLightProgram, "lutSampler");
  this.gl.uniform1i(lut, 5);
  this.gl.activeTexture(this.gl.TEXTURE0 + 5);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.lutTexture);
  this.gl.texImage2D (this.gl.TEXTURE_2D, 0, this.gl.RGBA, 3, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.lutData);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.swapFbos();

  // Now unbind the textures we used
  for (var i = 0; i < 6; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}


// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
WebGlLightCompositor.prototype.clearFbo = function() {
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb1);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fb2);
  this.gl.clear(this.gl.COLOR_BUFFER_BIT);

  this.pong = true;
  this.fbo = this.fb1;
  this.renderTexture = this.rt2;
};

WebGlLightCompositor.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

// Method meant to be used with the WidgetFactory
WebGlLightCompositor.prototype.getControlWidgets = function() {
    return [ "CompositePipelineWidget", "LookupTableManagerWidget", "QueryDataModelWidget" ];
};

WebGlLightCompositor.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

WebGlLightCompositor.prototype.getLookupTableManager = function() {
    return this.lutManager;
};

WebGlLightCompositor.prototype.getPipelineModel = function() {
    return this.pipelineModel;
};

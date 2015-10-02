var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    WebGlUtil = require('../../util/WebGl'),
    vec4 = require('gl-matrix/src/gl-matrix/vec4.js'),
    vec2 = require('gl-matrix/src/gl-matrix/vec2.js'),
    merge = require('mout/src/object/merge'),
    texParameter = [
        ['TEXTURE_MAG_FILTER', 'NEAREST'], ['TEXTURE_MIN_FILTER', 'NEAREST'],
        ['TEXTURE_WRAP_S', 'CLAMP_TO_EDGE'], ['TEXTURE_WRAP_T', 'CLAMP_TO_EDGE']
    ],
    pixelStore = [ [ 'UNPACK_FLIP_Y_WEBGL', true ] ],
    align1PixelStore = [ [ 'UNPACK_FLIP_Y_WEBGL', true ], [ 'UNPACK_ALIGNMENT', 1 ] ],
    EMPTY_LAYER_BUFFER = new Float32Array([ 0.0 ]);

export default function GPUCompositor(queryDataModel, imageBuilder, colorHelper) {
    this.queryDataModel = queryDataModel;
    this.imageBuilder = imageBuilder;
    this.metadata = this.queryDataModel.originalData.SortedComposite;
    this.colorHelper = colorHelper;
    this.orderData = null;
    this.intensityData = null;
    this.numLayers = this.metadata.layers;


    this.lutData = []
    for (var i = 0; i < this.numLayers; ++i) {
        this.lutData.push(new Uint8Array(256 * 4));
    }

    this.defaultIntensityData = new Uint8Array([255]);
    this.intensitySize = [ 1, 1 ];
    this.hasIntensity = false;

    this.hasNormal = false;

    this.defaultLayerBufferView = new Float32Array([0.0]);
    this.layerBufferViewSize = [ 1, 1 ];

    this.width = this.metadata.dimensions[0];
    this.height = this.metadata.dimensions[1];

    this.lightProperties = {
        'lightTerms': {
            ka: 0.1,
            kd: 0.6,
            ks: 0.3,
            alpha: 20
        },
        'lightPosition': {
            x: -1,
            y: 1
        },
        'lightColor': [ 0.8, 0.8, 0.8 ]
    };

    this.glCanvas = new CanvasOffscreenBuffer(this.width, this.height);

    //Inialize GL context
    this.gl = this.glCanvas.get3DContext();
    if (!this.gl) {
      console.error("Unable to get WebGl context");
      return null;
    }

    // Set clear color to white, fully transparent
    this.gl.clearColor(1.0, 1.0, 1.0, 0.0);

    // Set up GL resources
    this.glConfig = {
            programs: {
                displayProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('../WebGlSortedComposite/shaders/fragment/display.c'),
                    mapping: 'default'
                },
                colorProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/addLayerColor.c'),
                    mapping: 'default'
                },
                lightColorProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/addLitLayerColor.c'),
                    mapping: 'default'
                },
                blendProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('../WebGlSortedComposite/shaders/fragment/alphaBlend.c'),
                    mapping: 'default'
                }
            },
            resources: {
                buffers: [
                    {
                        id: 'texCoord',
                        data: new Float32Array([
                          0.0,  0.0,
                          1.0,  0.0,
                          0.0,  1.0,
                          0.0,  1.0,
                          1.0,  0.0,
                          1.0,  1.0
                        ])
                    },{
                        id: 'posCoord',
                        data: new Float32Array([
                          -1, -1,
                           1, -1,
                          -1,  1,
                          -1,  1,
                           1, -1,
                           1,  1
                        ])
                    }
                ],
                textures: [
                    { id: 'orderTexture',       pixelStore: align1PixelStore, texParameter },
                    { id: 'intensityTexture',   pixelStore: align1PixelStore, texParameter },
                    { id: 'ping',               pixelStore, texParameter },
                    { id: 'pong',               pixelStore, texParameter },
                    { id: 'colorRenderTexture', pixelStore, texParameter }
                ],
                framebuffers: [
                    {
                        id: 'ping',
                        width: this.width,
                        height: this.height
                    },{
                        id: 'pong',
                        width: this.width,
                        height: this.height
                    },{
                        id: 'colorFbo',
                        width: this.width,
                        height: this.height
                    }
                ]
            },
            mappings: {
                default: [
                    { id: 'posCoord', name: 'positionLocation', attribute: 'a_position', format: [ 2, this.gl.FLOAT, false, 0, 0 ] },
                    { id: 'texCoord', name: 'texCoordLocation', attribute: 'a_texCoord', format: [ 2, this.gl.FLOAT, false, 0, 0 ] }
                ]
            }
        };

    console.log("On this machine we have " + this.gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS) + " texture units available.");

    for (var i = 0; i < this.numLayers; ++i) {
        this.glConfig.resources.textures.push({ id: 'layerColorSampler_' + i,   pixelStore: align1PixelStore, texParameter });
        this.glConfig.resources.textures.push({ id: 'lutSampler_' + i,   pixelStore: align1PixelStore, texParameter });
    }

    this.glResources = WebGlUtil.createGLResources(this.gl, this.glConfig);

    this.gl.disable(this.gl.DEPTH_TEST);
    this.gl.disable(this.gl.BLEND);

    var singleFloat = this.gl.getExtension('OES_texture_float');
    if (singleFloat === null) {
        console.err("Your browser does not support the WebGL Extension 'OES_texture_float', this compositor will not work!");
    }

    WebGlUtil.bindTextureToFramebuffer(this.gl, this.glResources.framebuffers.colorFbo, this.glResources.textures.colorRenderTexture);

    this.pingPong = new WebGlUtil.PingPong( this.gl,
        [ this.glResources.framebuffers.ping, this.glResources.framebuffers.pong ],
        [ this.glResources.textures.ping,     this.glResources.textures.pong ]
    );
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.updateData = function(data) {
    this.orderData = data.order.data;

    if (data.intensity) {
        this.intensitySize = [ this.width, this.height ];
        this.intensityData = data.intensity.data;
        this.hasIntensity = true;
    } else {
        this.intensitySize = [ 1, 1 ];
        this.intensityData = this.defaultIntensityData;
        this.hasIntensity = false;
    }

    if (data.normal) {
        this.normalData = data.normal.data;
        this.hasNormal = true;
    } else {
        this.normalData = null;
        this.hasNormal = false;
    }
};

// --------------------------------------------------------------------------

GPUCompositor.prototype.extractLayerData = function(buffer, layerIndex, pixelSize) {
  var offset = layerIndex * this.width * this.height * pixelSize,
      length = this.width * this.height * pixelSize;

      return new Uint8Array(buffer, offset, length);
};

// --------------------------------------------------------------------------

GPUCompositor.prototype.render = function() {
    if (!this.orderData) {
        return null;
    }

    var imageSize = this.width * this.height,
        height = this.height,
        width = this.width;

    // Clear the ping pong fbo
    this.pingPong.clearFbo();

    // Just iterate through all the layers in the data for now
    var layerIdx = this.numLayers;
    while (layerIdx--) {

        var orderLayerArray = this.extractLayerData(this.orderData, layerIdx, 1),
            lightingLayerArray = this.extractLayerData(this.intensityData, layerIdx, 1);

        if (this.hasNormal) {
            lightingLayerArray = this.extractLayerData(this.normalData, layerIdx, 3);
        }

        this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glResources.framebuffers.colorFbo);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT);

        var layerVisibleList = [],
            layerBufferViewSizeList = [],
            layerBufferViewList = [];

        for (var activeLayerIdx = 0; activeLayerIdx < this.numLayers; ++activeLayerIdx) {
            if (this.colorHelper.getLayerVisible(activeLayerIdx)) {
                layerVisibleList.push(1);
                var layerBufferView = this.colorHelper.getLayerFloatData(activeLayerIdx);
                if (layerBufferView) {
                    layerBufferViewList.push(layerBufferView);
                    layerBufferViewSizeList.push([ this.width, this.height ]);
                } else {
                    layerBufferViewList.push(new Float32Array([ this.findLayerConstantValue(activeLayerIdx) ]));
                    layerBufferViewSizeList.push([ 1, 1 ]);
                }
            } else {
                // We only need these as placeholders so that the indices match up in the shader
                layerVisibleList.push(0);
                layerBufferViewList.push(EMPTY_LAYER_BUFFER);
                layerBufferViewSizeList.push([ 1, 1 ]);
            }
        }

        this.drawColorPass(activeLayerIdx, orderLayerArray, lightingLayerArray, layerVisibleList, layerBufferViewSizeList, layerBufferViewList);
        this.drawBlendPass();
    }

    // Draw the result to the gl canvas
    this.drawDisplayPass();

    var readyImage = {
        canvas: this.glCanvas.el,
        area: [0, 0, this.width, this.height],
        outputSize: [this.width, this.height],
        builder: this.imageBuilder
    };

    this.imageBuilder.emit(this.imageBuilder.IMAGE_READY_TOPIC, readyImage);
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.findLayerConstantValue = function(layerIdx) {
    var colorByName = this.colorHelper.getLayerColorByName(layerIdx),
        colorBys = this.metadata.pipeline[layerIdx].colorBy;
        for (var i = 0; i < colorBys.length; ++i) {
            if (colorBys[i].name === colorByName) {
                return colorBys[i].value;
            }
        }
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.sampleLookupTable = function(lut, colorBy, range, index) {

    function affine(value, inMin, inMax, outMin, outMax) {
        return (((value - inMin) / (inMax - inMin)) * (outMax - outMin)) + outMin;
    }

    for (var i = 0; i < 256; ++i) {
        var scalarValue = affine(i, 0, 255, range[0], range[1]);
        var color = lut.getColor(scalarValue);
        this.lutData[index][(i*4)] = color[0] * 255;
        this.lutData[index][(i*4)+1] = color[1] * 255;
        this.lutData[index][(i*4)+2] = color[2] * 255;
        this.lutData[index][(i*4)+3] = color[3] * 255;
    }
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.drawBlendPass = function() {
  // Draw to the ping pong fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pingPong.getFramebuffer());

  // Use the alpha blending program for this pass
  this.gl.useProgram(this.glResources.programs.blendProgram);

  this.gl.viewport(0, 0, this.width, this.height);

  // Set up the ping pong render texture as the "under" layer
  var under = this.gl.getUniformLocation(this.glResources.programs.blendProgram, "underLayerSampler");
  this.gl.uniform1i(under, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());

  // Set up the color fbo render texture as the "over" layer
  var over = this.gl.getUniformLocation(this.glResources.programs.blendProgram, "overLayerSampler");
  this.gl.uniform1i(over, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.colorRenderTexture);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.pingPong.swap();

  // Now unbind the textures we used
  for (var i = 0; i < 2; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.drawDisplayPass = function() {
  // Draw to the screen framebuffer
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

  // Using the display shader program
  this.gl.useProgram(this.glResources.programs.displayProgram);

  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.width, this.height);

  // Set up the sampler uniform and bind the rendered texture
  var u_image = this.gl.getUniformLocation(this.glResources.programs.displayProgram, "u_image");
  this.gl.uniform1i(u_image, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Unbind the single texture we used
  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.drawColorPass = function(activeLayerIdx, layerOrderData, layerLightingData, visibleList, bufferViewSizeList, bufferViewList) {
  // Draw to the color fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glResources.framebuffers.colorFbo);

  var currentProgram = this.glResources.programs.colorProgram;

  // Using the coloring shader program
  if (this.hasNormal) {
      currentProgram = this.glResources.programs.lightColorProgram;
  }

  this.gl.useProgram(currentProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.width, this.height);

  var texCount = 0;

  // Set up the order layer texture
  var orderLayer = this.gl.getUniformLocation(currentProgram, "orderSampler");
  this.gl.uniform1i(orderLayer, texCount);
  this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
  texCount += 1;
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.orderTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.width, this.height, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, layerOrderData);

  if (this.hasNormal) {
      // Set up the intensity texture
      var intensitySpriteLoc = this.gl.getUniformLocation(currentProgram, "normalSampler");
      this.gl.uniform1i(intensitySpriteLoc, texCount);
      this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
      texCount += 1;
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.intensityTexture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGB, this.width, this.height, 0, this.gl.RGB, this.gl.UNSIGNED_BYTE, layerLightingData);

      var {lightTerms, lightPosition, lightColor} = this.lightProperties;

      var lightDirection = vec4.fromValues(lightPosition.x, lightPosition.y, 1.0, 0.0);
      var ldir = this.gl.getUniformLocation(currentProgram, "lightDir");
      this.gl.uniform4fv(ldir, lightDirection);

      var lightingConstants = vec4.fromValues(lightTerms.ka, lightTerms.kd, lightTerms.ks, lightTerms.alpha);
      var lterms = this.gl.getUniformLocation(currentProgram, "lightTerms");
      this.gl.uniform4fv(lterms, lightingConstants);

      var lightCol = vec4.fromValues(lightColor[0], lightColor[1], lightColor[2], 1.0);
      var lcolor = this.gl.getUniformLocation(currentProgram, "lightColor");
      this.gl.uniform4fv(lcolor, lightCol);
  } else {
      // Set up the normal texture
      var intensitySpriteLoc = this.gl.getUniformLocation(currentProgram, "intensitySampler");
      this.gl.uniform1i(intensitySpriteLoc, texCount);
      this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
      texCount += 1;
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.intensityTexture);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.intensitySize[0], this.intensitySize[1], 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, layerLightingData);
  }

  var ranges = [],
      alphas = [],
      layerColorUnits = [],
      lutUnits = [];

  // visibleList, bufferViewSizeList, bufferViewList
  for (var i = 0; i < visibleList.length; ++i) {

      var colorByName = this.colorHelper.getLayerColorByName(i);
      var range = this.metadata.ranges[colorByName];
      // ranges.push(vec2.fromValues(range[0], range[1]));
      ranges.push(range[0]);
      ranges.push(range[1]);
      alphas.push(this.colorHelper.getLayerAlpha(i));

      var lut = this.colorHelper.getLayerLut(i);
      this.sampleLookupTable(lut, colorByName, range, i);

      // Set up array of texture units to use for layer color textures
      layerColorUnits.push(texCount);
      lutUnits.push(texCount + visibleList.length);
      texCount += 1;
  }

  var rangeLoc = this.gl.getUniformLocation(currentProgram, "layerRange");
  this.gl.uniform2fv(rangeLoc, ranges);

  var alphaLoc = this.gl.getUniformLocation(currentProgram, "layerAlpha");
  this.gl.uniform1fv(alphaLoc, alphas);

  // Set up the color by texture
  var colorByLoc = this.gl.getUniformLocation(currentProgram, "layerColorSampler");
  this.gl.uniform1iv(colorByLoc, layerColorUnits);

  for (var i = 0; i < layerColorUnits.length; ++i) {
      this.gl.activeTexture(this.gl.TEXTURE0 + layerColorUnits[i]);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures["layerColorSampler_" + i]);
      var lbvw = bufferViewSizeList[i][0];
      var lbvh = bufferViewSizeList[i][1];
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, lbvw, lbvh, 0, this.gl.LUMINANCE, this.gl.FLOAT, bufferViewList[i]);
  }

  var lutLoc = this.gl.getUniformLocation(currentProgram, "lutSampler");
  this.gl.uniform1iv(lutLoc, lutUnits);

  for (var i = 0; i < lutUnits.length; ++i) {
      this.gl.activeTexture(this.gl.TEXTURE0 + lutUnits[i]);
      this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures["lutSampler_" + i]);
      this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, 256, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.lutData[i]);
  }

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Now unbind the textures we used
  for (var i = 0; i < texCount; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.destroy = function() {
    this.queryDataModel = null;
    this.imageBuilder = null;

    this.glResources.destroy();
    this.glResources = null;

    this.pingPong = null;

    this.glCanvas.destroy();
    this.glCanvas = null;
}

// --------------------------------------------------------------------------
// Lighting Widget called methods
// --------------------------------------------------------------------------

GPUCompositor.prototype.getLightProperties = function() {
    return this.lightProperties;
}

// --------------------------------------------------------------------------

GPUCompositor.prototype.setLightProperties = function(lightProps) {
    this.lightProperties = merge(this.lightProperties, lightProps);
}
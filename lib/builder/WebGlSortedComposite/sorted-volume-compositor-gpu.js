var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    WebGlUtil = require('../../util/WebGl'),
    texParameter = [
        ['TEXTURE_MAG_FILTER', 'NEAREST'], ['TEXTURE_MIN_FILTER', 'NEAREST'],
        ['TEXTURE_WRAP_S', 'CLAMP_TO_EDGE'], ['TEXTURE_WRAP_T', 'CLAMP_TO_EDGE']
    ],
    pixelStore = [ [ 'UNPACK_FLIP_Y_WEBGL', true ] ],
    align1PixelStore = [ [ 'UNPACK_FLIP_Y_WEBGL', true ], [ 'UNPACK_ALIGNMENT', 1 ] ];


export default function WebGLSortedVolumeCompositor(queryDataModel, imageBuilder, colorTable) {
    this.queryDataModel = queryDataModel;
    this.imageBuilder = imageBuilder;
    this.infoJson = this.queryDataModel.originalData;
    this.orderData = null;
    this.alphaData = null;
    this.intensityData = null;
    this.intensitySize = 1;
    this.defaultIntensityData = new Uint8Array([255]);
    this.numLayers = this.infoJson.SortedComposite.layers;

    this.lutView = colorTable;

    this.width = this.infoJson.SortedComposite.dimensions[0];
    this.height = this.infoJson.SortedComposite.dimensions[1];
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
                    fragmentShader: require('./shaders/fragment/display.c'),
                    mapping: 'default'
                },
                colorProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/rgbaColor.c'),
                    mapping: 'default'
                },
                blendProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/alphaBlend.c'),
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
                    { id: 'orderTexture',       pixelStore, texParameter },
                    { id: 'alphaTexture',       pixelStore, texParameter },
                    { id: 'intensityTexture',   pixelStore, texParameter },
                    { id: 'lutTexture',         pixelStore, texParameter },
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

    this.glResources = WebGlUtil.createGLResources(this.gl, this.glConfig);

    WebGlUtil.bindTextureToFramebuffer(this.gl, this.glResources.framebuffers.colorFbo, this.glResources.textures.colorRenderTexture);

    this.pingPong = new WebGlUtil.PingPong( this.gl,
        [ this.glResources.framebuffers.ping, this.glResources.framebuffers.pong ],
        [ this.glResources.textures.ping,     this.glResources.textures.pong ]
    );
}

// --------------------------------------------------------------------------

WebGLSortedVolumeCompositor.prototype.updateData = function(data) {
  this.orderData = data.order.data;
  this.alphaData = data.alpha.data;
  if (data.intensity) {
    this.intensityData = data.intensity.data;
    this.intensitySize = [ this.width, this.height ];
  } else {
    this.intensityData = this.defaultIntensityData;
    this.intensitySize = [ 1, 1 ];
  }
};

// --------------------------------------------------------------------------

WebGLSortedVolumeCompositor.prototype.extractLayerData = function(buffer, layerIndex) {
  var offset = layerIndex * this.width * this.height,
      length = this.width * this.height;

      return new Uint8Array(buffer, offset, length);
};

// --------------------------------------------------------------------------

WebGLSortedVolumeCompositor.prototype.render = function() {
    if (!this.alphaData || !this.orderData || !this.lutView) {
        return null;
    }

    // Clear the ping pong fbo
    this.pingPong.clearFbo();

    // Just iterate through all the layers in the data for now
    var layerIdx = this.numLayers;
    while (layerIdx--) {
      this.drawColorPass(this.extractLayerData(this.orderData, layerIdx),
                         this.extractLayerData(this.alphaData, layerIdx),
                         this.extractLayerData(this.intensityData, layerIdx));
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

WebGLSortedVolumeCompositor.prototype.destroy = function() {
    this.glResources.destroy();
    this.glResources = null;

    this.pingPong = null;
}

// --------------------------------------------------------------------------

WebGLSortedVolumeCompositor.prototype.drawDisplayPass = function() {
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

WebGLSortedVolumeCompositor.prototype.drawBlendPass = function() {
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

WebGLSortedVolumeCompositor.prototype.drawColorPass = function(layerOrderData, layerAlphaData, layerIntensityData) {
  // Draw to the color fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glResources.framebuffers.colorFbo);

  // Using the coloring shader program
  this.gl.useProgram(this.glResources.programs.colorProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.width, this.height);

  // Send uniform specifying the number of total layers
  var numLayersLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "numberOfLayers");
  this.gl.uniform1f(numLayersLoc, this.numLayers);

  var texCount = 0;

  // Set up the order layer texture
  var orderLayer = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "orderSampler");
  this.gl.uniform1i(orderLayer, texCount);
  this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
  texCount += 1;
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.orderTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.width, this.height, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, layerOrderData);

  // Set up the alpha sprite texture
  var alphaSpriteLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "alphaSampler");
  this.gl.uniform1i(alphaSpriteLoc, texCount);
  this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
  texCount += 1;
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.alphaTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.width, this.height, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, layerAlphaData);

  // Set up the intensity sprite texture
  var intensitySpriteLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "intensitySampler");
  this.gl.uniform1i(intensitySpriteLoc, texCount);
  this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
  texCount += 1;
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.intensityTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.intensitySize[0], this.intensitySize[1], 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, layerIntensityData);

  // Set up the lookup  texture (contains alphas to multiply each layer color)
  var lutLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "lutSampler");
  this.gl.uniform1i(lutLoc, texCount);
  this.gl.activeTexture(this.gl.TEXTURE0 + texCount);
  texCount += 1;
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.lutTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.numLayers, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.lutView);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Now unbind the textures we used
  for (var i = 0; i < texCount; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

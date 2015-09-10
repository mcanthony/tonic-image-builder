var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    WebGlUtil = require('../../util/WebGl'),
    max = require('mout/object/max'),
    texParameter = [
        ['TEXTURE_MAG_FILTER', 'NEAREST'], ['TEXTURE_MIN_FILTER', 'NEAREST'],
        ['TEXTURE_WRAP_S', 'CLAMP_TO_EDGE'], ['TEXTURE_WRAP_T', 'CLAMP_TO_EDGE']
    ],
    pixelStore = [ [ 'UNPACK_FLIP_Y_WEBGL', true ] ];


export default function WebGLSortedVolumeCompositor(queryDataModel, imageBuilder) {
    this.queryDataModel = queryDataModel;
    this.imageBuilder = imageBuilder;
    this.infoJson = this.queryDataModel.originalData;
    this.rgbdData = null;
    this.orderData = null;
    this.offsetList = [];
    this.spriteSize = this.infoJson.SortedComposite.textures.rgba.size;
    this.numLayers = this.infoJson.SortedComposite.layers;

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.orderData = data.order.data;
        this.rgbaData = new Uint8Array(data.rgba.data, 0, data.rgba.data.byteLength);
        this.render();
    });

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
                    vertexShader:   require('./shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/display.c'),
                    mapping: 'default'
                },
                colorProgram: {
                    vertexShader:   require('./shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/rgbaColor.c'),
                    mapping: 'default'
                },
                blendProgram: {
                    vertexShader:   require('./shaders/vertex/basic.c'),
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
                    { id: 'orderTexture', pixelStore, texParameter },
                    { id: 'rgbaTexture', pixelStore, texParameter },
                    { id: 'ping',  pixelStore, texParameter },
                    { id: 'pong', pixelStore, texParameter },
                    { id: 'colorRenderTexture',  pixelStore, texParameter }
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

WebGLSortedVolumeCompositor.prototype.extractLayerData = function(buffer, layerIndex) {
  var offset = layerIndex * this.width * this.height,
      length = this.width * this.height;

      return new Uint8Array(buffer, offset, length);
};

// --------------------------------------------------------------------------

WebGLSortedVolumeCompositor.prototype.render = function() {
    if (!this.rgbaData || !this.orderData) {
        return null;
    }

    // Clear the ping pong fbo
    this.pingPong.clearFbo();

    // Just iterate through all the layers in the data for now
    var layerIdx = this.numLayers;
    while (layerIdx--) {
      this.drawColorPass(this.extractLayerData(this.orderData, layerIdx));
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
    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

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

WebGLSortedVolumeCompositor.prototype.drawColorPass = function(layerOrderData) {
  // Draw to the color fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.glResources.framebuffers.colorFbo);

  // Using the coloring shader program
  this.gl.useProgram(this.glResources.programs.colorProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.width, this.height);

  // Send uniforms specifying sprite and image dimensions: "spriteDim", "imageDim"
  var spriteDimLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "spriteDim");
  this.gl.uniform2fv(spriteDimLoc, [this.spriteSize, this.spriteSize]);
  var imgDimLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "imageDim");
  this.gl.uniform2fv(imgDimLoc, [this.width, this.height]);

  // Set up the order layer texture
  var orderLayer = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "orderSampler");
  this.gl.uniform1i(orderLayer, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.orderTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.LUMINANCE, this.width, this.height, 0, this.gl.LUMINANCE, this.gl.UNSIGNED_BYTE, layerOrderData);

  // Set up the rgba sprite texture
  var rgbaSpriteLoc = this.gl.getUniformLocation(this.glResources.programs.colorProgram, "rgbaSampler");
  this.gl.uniform1i(rgbaSpriteLoc, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.rgbaTexture);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.spriteSize, this.spriteSize, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.rgbaData);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Now unbind the textures we used
  for (var i = 0; i < 2; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

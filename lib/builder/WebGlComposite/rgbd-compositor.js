var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    WebGlUtil = require('../../util/WebGl'),
    max = require('mout/object/max');


export default function WebGlCompositor(options) {
    var {queryDataModel, imageBuilder} = options;

    this.queryDataModel = queryDataModel;
    this.imageBuilder = imageBuilder;
    this.rgbdSprite = null;
    this.offsetList = [];
    this.spriteSize = max(this.queryDataModel.originalData.CompositePipeline.offset);
    this.removeLoadCallback = false;
    this.closureRenderMethod = () => { this.render(); };

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.rgbdSprite = data.rgbdSprite.image;

        if(this.rgbdSprite.complete) {
            this.render();
        } else {
            this.removeLoadCallback = true;
            this.rgbdSprite.addEventListener('load', this.closureRenderMethod);
        }
    });

    this.width = this.queryDataModel.originalData.CompositePipeline.dimensions[0];
    this.height = this.queryDataModel.originalData.CompositePipeline.dimensions[1];
    this.glCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.compositeCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.compositeCtx = this.compositeCanvas.get2DContext();

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
                compositeProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/composite.c'),
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
                    {
                        id: 'texture2D',
                        pixelStore: [
                            [ 'UNPACK_FLIP_Y_WEBGL', true ]
                        ],
                        texParameter: [
                            [ 'TEXTURE_MAG_FILTER', 'NEAREST' ],
                            [ 'TEXTURE_MIN_FILTER', 'NEAREST' ],
                            [ 'TEXTURE_WRAP_S', 'CLAMP_TO_EDGE' ],
                            [ 'TEXTURE_WRAP_T', 'CLAMP_TO_EDGE' ],
                        ]
                    },{
                        id: 'ping',
                        pixelStore: [
                            [ 'UNPACK_FLIP_Y_WEBGL', true ]
                        ],
                        texParameter: [
                            [ 'TEXTURE_MAG_FILTER', 'NEAREST' ],
                            [ 'TEXTURE_MIN_FILTER', 'NEAREST' ],
                            [ 'TEXTURE_WRAP_S', 'CLAMP_TO_EDGE' ],
                            [ 'TEXTURE_WRAP_T', 'CLAMP_TO_EDGE' ],
                        ]
                    },{
                        id: 'pong',
                        pixelStore: [
                            [ 'UNPACK_FLIP_Y_WEBGL', true ]
                        ],
                        texParameter: [
                            [ 'TEXTURE_MAG_FILTER', 'NEAREST' ],
                            [ 'TEXTURE_MIN_FILTER', 'NEAREST' ],
                            [ 'TEXTURE_WRAP_S', 'CLAMP_TO_EDGE' ],
                            [ 'TEXTURE_WRAP_T', 'CLAMP_TO_EDGE' ],
                        ]
                    }
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

    this.pingPong = new WebGlUtil.PingPong( this.gl,
        [ this.glResources.framebuffers.ping, this.glResources.framebuffers.pong ],
        [ this.glResources.textures.ping,     this.glResources.textures.pong ]
    );
}

// --------------------------------------------------------------------------

WebGlCompositor.prototype.updateQuery = function(query) {
    var layers = this.queryDataModel.originalData.CompositePipeline.layers,
        count = layers.length,
        offsets = this.queryDataModel.originalData.CompositePipeline.offset;

    this.offsetList = [];
    for(var idx = 0; idx < count; idx++) {
        var fieldCode = query[idx*2 + 1];
        if(fieldCode !== '_') {
          this.offsetList.push(this.spriteSize - offsets[layers[idx] + fieldCode]);
        }
    }
}

// --------------------------------------------------------------------------

WebGlCompositor.prototype.render = function() {
    if (!this.rgbdSprite || !this.rgbdSprite.complete) {
        return null;
    }

    // Handle image decoding
    if(this.removeLoadCallback) {
        this.rgbdSprite.removeEventListener('load', this.closureRenderMethod);
        this.removeLoadCallback = false;
    }

    // Compute composite
    this.pingPong.clearFbo();
    this.offsetList.forEach((layerIdx) => {
      var srcY = layerIdx * this.height;

      // Because the png has transparency, we need to clear the canvas, or else
      // we end up with some blending when we draw the next image
      this.compositeCtx.clearRect(0, 0, this.width, this.height);
      this.compositeCtx.drawImage(this.rgbdSprite,
                      0, srcY, this.width, this.height,
                      0, 0, this.width, this.height);

      this.drawCompositePass();
    });

    // Draw to display
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

WebGlCompositor.prototype.destroy = function() {
    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.glResources.destroy();
    this.glResources = null;

    this.pingPong = null;
}

// --------------------------------------------------------------------------

WebGlCompositor.prototype.drawDisplayPass = function() {
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
}

// --------------------------------------------------------------------------

WebGlCompositor.prototype.drawCompositePass = function() {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pingPong.getFramebuffer());

  // Using the compositing shader program
  this.gl.useProgram(this.glResources.programs.compositeProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.width, this.height);

  // Set up the layer texture
  var layer = this.gl.getUniformLocation(this.glResources.programs.compositeProgram, "layerSampler");
  this.gl.uniform1i(layer, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.texture2D);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.compositeCanvas.el);

  // Set up the sampler uniform and bind the rendered texture
  var composite = this.gl.getUniformLocation(this.glResources.programs.compositeProgram, "compositeSampler");
  this.gl.uniform1i(composite, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.pingPong.swap();
}

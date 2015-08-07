var CanvasOffscreenBuffer = require('../CanvasOffscreenBuffer'),
    max                   = require('mout/object/max'),
    Monologue             = require('monologue.js'),
    WebGlUtil             = require('../WebGlUtils'),
    IMAGE_READY_TOPIC     = 'image-ready';

export default function WebGlCompositor(queryDataModel, pipelineModel) {
    this.queryDataModel = queryDataModel;
    this.pipelineModel = pipelineModel;
    this.compositePipeline = queryDataModel.originalData.CompositePipeline;
    this.rgbdSprite = null;
    this.offsetList = [];
    this.spriteSize = max(this.compositePipeline.offset);
    this.query = this.compositePipeline.default_pipeline;
    if (this.query) {
      this.updateOffsetList(this.query);
    }

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.rgbdSprite = data.rgbdSprite.image;
        this.render();
    });

    this.pipelineSubscription = this.pipelineModel.onChange((data, envelope) => {
        this.setPipelineQuery(data);
    });
    this.setPipelineQuery(this.pipelineModel.getPipelineQuery());

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

    // Set up the display shader program
    this.glConfig = {
            programs: {
                displayProgram: {
                    vertexShader:   require('./shaders/vertex/basicVertex.c'),
                    fragmentShader: require('./shaders/fragment/displayFragment.c'),
                    mapping: 'default'
                },
                compositeProgram: {
                    vertexShader:   require('./shaders/vertex/basicVertex.c'),
                    fragmentShader: require('./shaders/fragment/compositeFragment.c'),
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
                        width: this.imgw,
                        height: this.imgh
                    },{
                        id: 'pong',
                        width: this.imgw,
                        height: this.imgh
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

    this.glResources = WebGlUtil.buildGLResources(this.gl, this.glConfig);

    this.pingPong = new WebGlUtil.PingPong( this.gl,
        [ this.glResources.framebuffers.ping, this.glResources.framebuffers.pong ],
        [ this.glResources.textures.ping,     this.glResources.textures.pong ]
    );
};

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(WebGlCompositor);

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

// --------------------------------------------------------------------------

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

WebGlCompositor.prototype.update = function() {
    this.queryDataModel.fetchData();
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.render = function() {
    if (!this.rgbdSprite || !this.query) {
      console.log("Not enough data to render");
      return;
    }

    this.pingPong.clearFbo();

    for (var i = 0, size = this.offsetList.length; i < size; ++i) {
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
            area: [0, 0, this.imgw, this.imgh],
            outputSize: [this.imgw, this.imgh],
            type: 'composite'
        };

    // Let everyone know the image is ready
    this.emit(IMAGE_READY_TOPIC, readyImage);
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.destroy = function() {
  this.pipelineSubscription.unsubscribe();
  this.pipelineSubscription = null;

  WebGlUtil.freeGLResources(this.gl, this.glResources);
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.TopicImageReady = function() {
    return IMAGE_READY_TOPIC;
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.drawDisplayPass = function() {
  // Draw to the screen framebuffer
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, null);

  // Using the display shader program
  this.gl.useProgram(this.glResources.programs.displayProgram);

  this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.imgw, this.imgh);

  // Set up the sampler uniform and bind the rendered texture
  var u_image = this.gl.getUniformLocation(this.glResources.programs.displayProgram, "u_image");
  this.gl.uniform1i(u_image, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.drawCompositePass = function() {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pingPong.getFramebuffer());

  // Using the compositing shader program
  this.gl.useProgram(this.glResources.programs.compositeProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.imgw, this.imgh);

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
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

// --------------------------------------------------------------------------
// Method meant to be used with the WidgetFactory
WebGlCompositor.prototype.getControlWidgets = function() {
    return [ "CompositePipelineWidget", "QueryDataModelWidget" ];
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

// --------------------------------------------------------------------------

WebGlCompositor.prototype.getPipelineModel = function() {
    return this.pipelineModel;
};

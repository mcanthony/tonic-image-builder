var CanvasOffscreenBuffer = require('../../util/CanvasOffscreenBuffer'),
    max = require('mout/object/max'),
    vec3 = require('gl-matrix/src/gl-matrix/vec3.js'),
    vec4 = require('gl-matrix/src/gl-matrix/vec4.js'),
    WebGlUtil = require('../../util/WebGl'),
    merge = require('mout/src/object/merge'),
    texParameter = [
        ['TEXTURE_MAG_FILTER', 'NEAREST'], ['TEXTURE_MIN_FILTER', 'NEAREST'],
        ['TEXTURE_WRAP_S', 'CLAMP_TO_EDGE'], ['TEXTURE_WRAP_T', 'CLAMP_TO_EDGE']
    ],
    pixelStore = [ [ 'UNPACK_FLIP_Y_WEBGL', true ] ];

// --------------------------------------------------------------------------

function spherical2Cartesian(phi, theta) {
  var nPhi = parseFloat(phi),
      nTheta = parseFloat(theta),
      phiRad = (180.0 - nPhi) * Math.PI / 180.0,
      thetaRad = (180.0 - nTheta) * Math.PI / 180.0;
  return [
    Math.sin(thetaRad) * Math.cos(phiRad),
    Math.sin(thetaRad) * Math.sin(phiRad),
    Math.cos(thetaRad)
  ];
}

// --------------------------------------------------------------------------

function recomputeDirections(queryModel, relativeLightPosition) {
  //construct a coordinate system relative to eye point
  var v = spherical2Cartesian(queryModel.getValue('phi'), queryModel.getValue('theta')),
      viewDir = vec3.fromValues(v[0], v[1], v[2]),
      at = vec3.fromValues(0, 0, 0), //assumption always looking at 0
      north = vec3.fromValues(0, 0, 1),  //assumption, north is always up
      approxUp = vec3.create();

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
  vec3.scale(rm, right, relativeLightPosition.x);
  var um = vec3.create();
  vec3.scale(um, up, relativeLightPosition.y);

  var scaledView = vec3.create();
  vec3.scale(scaledView, viewDir, 0.3);

  var lightDirection = vec3.create();
  vec3.add(lightDirection, scaledView, rm);
  vec3.add(lightDirection, lightDirection, um);
  vec3.normalize(lightDirection, lightDirection);

  return {
    lightDir: lightDirection,
    viewDir: viewDir
  }
}

// --------------------------------------------------------------------------

export default function WebGlLightCompositor(options) {
    var {queryDataModel, imageBuilder, lookupTableManager} = options;

    this.queryDataModel = queryDataModel;
    this.compositePipeline = this.queryDataModel.originalData.CompositePipeline;
    this.width = this.compositePipeline.dimensions[0];
    this.height = this.compositePipeline.dimensions[1];
    this.spriteSize = max(this.compositePipeline.offset);
    this.offsetList = [];
    this.sxyzSprite = null;
    this.removeLoadCallback = false;
    this.closureRenderMethod = () => { this.render(); };

    this.doLighting = true;

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        this.sxyzSprite = data.sxyzSprite.image;

        if(this.sxyzSprite.complete) {
            this.render();
        } else {
            this.removeLoadCallback = true;
            this.sxyzSprite.addEventListener('load', this.closureRenderMethod);
        }
    });

    this.imageBuilder = imageBuilder;

    this.lookupTableManager = lookupTableManager;
    this.lookupTableManager.addFields(this.compositePipeline.ranges, this.queryDataModel.originalData.LookupTables);

    this.numLutSamples = 1024;
    this.lutMap = {};
    for (var key in this.compositePipeline.ranges) {
        this.lutMap[key] = new Uint8Array(this.numLutSamples * 4);
        this.resampleLookupTable(key);
    }

    this.lookupTableManager.onChange( (data, envelope) => {
        if (data.lut.name !== '__internal') {
            this.resampleLookupTable(data.lut.name);
        }
    });


    this.bgColor = [ 1.0, 1.0, 1.0 ];
    this.lightingTextureNames = [ 'nx', 'ny', 'nz', 'scalars' ];
    this.lightingTextures = {};

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

    // Canvas
    this.glCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.compositeCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.compositeCtx = this.compositeCanvas.get2DContext();
    this.scalarCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.scalarCtx = this.scalarCanvas.get2DContext();
    this.nxCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.nxCtx = this.nxCanvas.get2DContext();
    this.nyCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.nyCtx = this.nyCanvas.get2DContext();
    this.nzCanvas = new CanvasOffscreenBuffer(this.width, this.height);
    this.nzCtx = this.nzCanvas.get2DContext();

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
                compositeLightProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/compositeLight.c'),
                    mapping: 'default'
                },
                compositeLutProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/compositeLut.c'),
                    mapping: 'default'
                },
                backgroundProgram: {
                    vertexShader:   require('../../util/WebGl/shaders/vertex/basic.c'),
                    fragmentShader: require('./shaders/fragment/background.c'),
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
                    { id: 'scalars',    pixelStore, texParameter },
                    { id: 'nx',         pixelStore, texParameter },
                    { id: 'ny',         pixelStore, texParameter },
                    { id: 'nz',         pixelStore, texParameter },
                    { id: 'lutTexture', pixelStore, texParameter },
                    { id: 'ping',       pixelStore, texParameter },
                    { id: 'pong',       pixelStore, texParameter }
                ],
                framebuffers: [
                    { id: 'ping', width: this.width, height: this.height },
                    { id: 'pong', width: this.width, height: this.height }
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

WebGlLightCompositor.prototype.WIDGETS = [ "LookupTableManagerWidget", "LightPropertiesWidget", "CompositeControl", "QueryDataModelWidget" ];

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.getLightingEnabled = function() {
    return this.doLighting;
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.setLightingEnabled = function(lightingEnabled) {
    this.doLighting = lightingEnabled;
    this.render();
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.getLightProperties = function() {
    return this.lightProperties;
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.setLightProperties = function(lightProps) {
    this.lightProperties = merge(this.lightProperties, lightProps);
    this.render();
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.resampleLookupTable = function(fieldName) {
    var lookupTable = this.lookupTableManager.getLookupTable(fieldName),
        fieldRange = this.compositePipeline.ranges[fieldName],
        delta = (fieldRange[1] - fieldRange[0]) / this.numLutSamples,
        //lutRange = lookupTable.getScalarRange(),
        samples = this.lutMap[fieldName];

    for (var i = 0; i < this.numLutSamples; ++i) {
        var scalarValue = fieldRange[0] + (i * delta),
            colorArrayIdx = i * 4,
            scalarColor = lookupTable.getColor(scalarValue);

        samples[colorArrayIdx] = Math.round(scalarColor[0] * 255);
        samples[colorArrayIdx+1] = Math.round(scalarColor[1] * 255);
        samples[colorArrayIdx+2] = Math.round(scalarColor[2] * 255);
        samples[colorArrayIdx+3] = 1.0;
    }

    this.render();
};

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.updateQuery = function(query) {
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
                  'fieldName' : this.compositePipeline.fields[fieldCode],
                  'scalar': this.spriteSize - offsets[layers[idx] + fieldCode],
                  'nx': this.spriteSize - offsets[layers[idx] + nx],
                  'ny': this.spriteSize - offsets[layers[idx] + ny],
                  'nz': this.spriteSize - offsets[layers[idx] + nz]
                });
              }
            }
        }
    }
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.render = function() {
    if (!this.sxyzSprite || !this.sxyzSprite.complete) {
      console.log("Not enough data to render");
      return;
    }

    // Handle image decoding
    if(this.removeLoadCallback) {
        this.sxyzSprite.removeEventListener('load', this.closureRenderMethod);
        this.removeLoadCallback = false;
    }

    this.pingPong.clearFbo();

    var {lightDir, viewDir} = recomputeDirections(this.queryDataModel, this.lightProperties.lightPosition),
        srcX = 0, srcY = 0, imgw = this.width, imgh = this.height;

    // Draw a background pass
    this.compositeCtx.clearRect(0, 0, imgw, imgh);
    this.compositeCtx.drawImage(this.sxyzSprite, 0, (this.spriteSize * imgh), imgw, imgh, 0, 0, imgw, imgh);
    this.drawBackgroundPass(this.bgColor);

    for (var i = 0, size = this.offsetList.length; i < size; i+=1) {
      var lOffMap = this.offsetList[i],
          field = lOffMap.fieldName;
      srcY = 0;

      if (this.doLighting) {
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

        this.drawLitCompositePass(viewDir, lightDir, this.lightProperties, this.lutMap[field]);
      } else {
        // Copy the scalar buffer
        srcY = lOffMap.scalar * imgh;
        this.scalarCtx.clearRect(0, 0, imgw, imgh);
        this.scalarCtx.drawImage(this.sxyzSprite, srcX, srcY, imgw, imgh, 0, 0, imgw, imgh);

        this.drawLutCompositePass(this.lutMap[field]);
      }
    }

    this.drawDisplayPass();

    var readyImage = {
            canvas: this.glCanvas.el,
            area: [ 0, 0, this.width, this.height ],
            outputSize: [ this.width, this.height ],
            builder: this.imageBuilder
        };

    // Let everyone know the image is ready
    this.imageBuilder.emit(this.imageBuilder.IMAGE_READY_TOPIC, readyImage);
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.destroy = function() {
  this.dataSubscription.unsubscribe();
  this.dataSubscription = null;

  this.glResources.destroy();
  this.glResources = null;

  this.pingPong = null;
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.drawDisplayPass = function() {
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

  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.drawBackgroundPass = function(backgroundColor) {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pingPong.getFramebuffer());

  // Using the background shader program
  this.gl.useProgram(this.glResources.programs.backgroundProgram);

  //this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  this.gl.viewport(0, 0, this.width, this.height);

  var bgColor = vec4.fromValues(backgroundColor[0], backgroundColor[1], backgroundColor[2], 1.0);
  var bgc = this.gl.getUniformLocation(this.glResources.programs.backgroundProgram, "backgroundColor");
  this.gl.uniform4fv(bgc, bgColor);

  // Set up the layer texture
  var layer = this.gl.getUniformLocation(this.glResources.programs.backgroundProgram, "backgroundSampler");
  this.gl.uniform1i(layer, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.compositeCanvas.el);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.pingPong.swap();

  // Now unbind the textures we used
  this.gl.activeTexture(this.gl.TEXTURE0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, null);
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.drawLitCompositePass = function (viewDir, lightDir, lightProperties, lutData) {
  var {lightTerms, lightColor} = lightProperties;

  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pingPong.getFramebuffer());

  // Using the lighting compositing shader program
  this.gl.useProgram(this.glResources.programs.compositeLightProgram);

  this.gl.viewport(0, 0, this.width, this.height);

  var viewDirection = vec4.fromValues(viewDir[0], viewDir[1], viewDir[2], 0.0);
  var vdir = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "viewDir");
  this.gl.uniform4fv(vdir, viewDirection);

  var lightDirection = vec4.fromValues(lightDir[0], lightDir[1], lightDir[2], 0.0);
  var ldir = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "lightDir");
  this.gl.uniform4fv(ldir, lightDirection);

  var lightingConstants = vec4.fromValues(lightTerms.ka, lightTerms.kd, lightTerms.ks, lightTerms.alpha);
  var lterms = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "lightTerms");
  this.gl.uniform4fv(lterms, lightingConstants);

  var lightCol = vec4.fromValues(lightColor[0], lightColor[1], lightColor[2], 1.0);
  var lcolor = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "lightColor");
  this.gl.uniform4fv(lcolor, lightCol);

  // Set up the scalar texture
  var scalar = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "scalarSampler");
  this.gl.uniform1i(scalar, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.scalars);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.scalarCanvas.el);

  // Set up the normals (x component) texture
  var nx = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "nxSampler");
  this.gl.uniform1i(nx, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.nx);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.nxCanvas.el);

  // Set up the normals (y component) texture
  var ny = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "nySampler");
  this.gl.uniform1i(ny, 2);
  this.gl.activeTexture(this.gl.TEXTURE0 + 2);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.ny);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.nyCanvas.el);

  // Set up the normals (z component) texture
  var nz = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "nzSampler");
  this.gl.uniform1i(nz, 3);
  this.gl.activeTexture(this.gl.TEXTURE0 + 3);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.nz);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.nzCanvas.el);

  // Set up the sampler uniform and bind the rendered texture
  var composite = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "compositeSampler");
  this.gl.uniform1i(composite, 4);
  this.gl.activeTexture(this.gl.TEXTURE0 + 4);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());

  // Set up the lookup table texture
  var lut = this.gl.getUniformLocation(this.glResources.programs.compositeLightProgram, "lutSampler");
  this.gl.uniform1i(lut, 5);
  this.gl.activeTexture(this.gl.TEXTURE0 + 5);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.lutTexture);
  this.gl.texImage2D (this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.numLutSamples, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, lutData);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.pingPong.swap();

  // Now unbind the textures we used
  for (var i = 0; i < 6; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

// --------------------------------------------------------------------------

WebGlLightCompositor.prototype.drawLutCompositePass = function (lutData) {
  // Draw to the fbo on this pass
  this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.pingPong.getFramebuffer());

  // Using the lighting compositing shader program
  this.gl.useProgram(this.glResources.programs.compositeLutProgram);

  this.gl.viewport(0, 0, this.width, this.height);

  // Set up the scalar texture
  var scalar = this.gl.getUniformLocation(this.glResources.programs.compositeLutProgram, "scalarSampler");
  this.gl.uniform1i(scalar, 0);
  this.gl.activeTexture(this.gl.TEXTURE0 + 0);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.scalars);
  this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA,  this.gl.RGBA, this.gl.UNSIGNED_BYTE, this.scalarCanvas.el);

  // Set up the sampler uniform and bind the rendered texture
  var composite = this.gl.getUniformLocation(this.glResources.programs.compositeLutProgram, "compositeSampler");
  this.gl.uniform1i(composite, 1);
  this.gl.activeTexture(this.gl.TEXTURE0 + 1);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.pingPong.getRenderingTexture());

  // Set up the lookup table texture
  var lut = this.gl.getUniformLocation(this.glResources.programs.compositeLutProgram, "lutSampler");
  this.gl.uniform1i(lut, 2);
  this.gl.activeTexture(this.gl.TEXTURE0 + 2);
  this.gl.bindTexture(this.gl.TEXTURE_2D, this.glResources.textures.lutTexture);
  this.gl.texImage2D (this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.numLutSamples, 1, 0, this.gl.RGBA, this.gl.UNSIGNED_BYTE, lutData);

  // Draw the rectangle.
  this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);

  this.gl.finish();

  // Ping-pong
  this.pingPong.swap();

  // Now unbind the textures we used
  for (var i = 0; i < 3; i+=1) {
    this.gl.activeTexture(this.gl.TEXTURE0 + i);
    this.gl.bindTexture(this.gl.TEXTURE_2D, null);
  }
}

// --------------------------------------------------------------------------
//
// --------------------------------------------------------------------------
function showGlInfo(gl) {
    var vertexUnits = gl.getParameter(this.gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS);
    var fragmentUnits = gl.getParameter(this.gl.MAX_TEXTURE_IMAGE_UNITS);
    var combinedUnits = gl.getParameter(this.gl.MAX_COMBINED_TEXTURE_IMAGE_UNITS);
    console.log("vertex texture image units: " + vertexUnits);
    console.log("fragment texture image units: " + fragmentUnits);
    console.log("combined texture image units: " + combinedUnits);
}

// --------------------------------------------------------------------------
// Compile the shader
export function initShader(gl, src, type) {
    var shader = gl.createShader( type );

    gl.shaderSource( shader, src );

    // Compile and check status
    gl.compileShader( shader );
    var compiled = gl.getShaderParameter(shader, gl.COMPILE_STATUS);
    if (!compiled)
    {
        // Something went wrong during compilation; get the error
        var lastError = gl.getShaderInfoLog(shader);
        console.error( "Error compiling shader '" + shader + "':" + lastError );
        gl.deleteShader( shader );

        return null;
    }

    return shader;
}

// --------------------------------------------------------------------------
// Create a shader program
export function createShaderProgram(gl, shaders) {
  var program = gl.createProgram();

  for(var i = 0; i < shaders.length; i+=1) {
    gl.attachShader( program, shaders[ i ] );
  }

  gl.linkProgram( program );

  // Check the link status
  var linked = gl.getProgramParameter(program, gl.LINK_STATUS);
  if (!linked) {
    // something went wrong with the link
    var lastError = gl.getProgramInfoLog (program);
    console.error("Error in program linking:" + lastError);
    gl.deleteProgram(program);

    return null;
  }

  program.shaders = shaders;
  gl.useProgram(program);

  return program;
}

// --------------------------------------------------------------------------
// Create a shader program
export function buildProgram(gl, name, config, resources) {
    var progConfig = config.programs[name],
        compiledVertexShader = initShader(gl, progConfig.vertexShader, gl.VERTEX_SHADER),
        compiledFragmentShader = initShader(gl, progConfig.fragmentShader, gl.FRAGMENT_SHADER),
        program = createShaderProgram(gl, [compiledVertexShader, compiledFragmentShader]);

    // Store the created program in the resources
    resources.programs[name] = program;

    // Handle mapping if any
    if(progConfig.mapping) {
        applyProgramDataMapping(gl, name, progConfig.mapping, config, resources);
    }

    // Return program
    return program;
}

// --------------------------------------------------------------------------
// Create GL resources
export function createGLResources(gl, resourcesToCreate) {
    var resources = { buffers: {}, textures: {}, framebuffers: {}, "programs": {} },
        buffers = resourcesToCreate.buffers || [],
        textures = resourcesToCreate.textures || [],
        framebuffers = resourcesToCreate.framebuffers || [];

    // Create Buffer
    buffers.forEach(function(buffer) {
        var glBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, buffer.data, gl.STATIC_DRAW);
        resources.buffers[buffer.id] = glBuffer;
    });

    // Create Texture
    textures.forEach(function(texture) {
        var glTexture = gl.createTexture(),
            pixelStore = texture.pixelStore || [],
            texParameter = texture.texParameter || [];

        gl.bindTexture(gl.TEXTURE_2D, glTexture);

        pixelStore.forEach(function(option) {
            gl.pixelStorei(gl[option[0]], option[1]);
        });

        texParameter.forEach(function(option) {
            gl.texParameteri(gl.TEXTURE_2D, gl[option[0]], gl[option[1]]);
        });

        resources.textures[texture.id] = glTexture;
    });

    // Create Framebuffer
    framebuffers.forEach(function(framebuffer) {
        var glFramebuffer = gl.createFramebuffer();
        glFramebuffer.width = framebuffer.width;
        glFramebuffer.height = framebuffer.height;

        resources.framebuffers[framebuffer.id] = glFramebuffer;
    });

    return resources;
}

// --------------------------------------------------------------------------
// Create GL resources + programs
export function buildGLResources(gl, config) {
    var resources = createGLResources(gl, config.resources);

    // Create programs
    for(var programName in config.programs) {
        buildProgram(gl, programName, config, resources);
    }

    return resources;
}

// --------------------------------------------------------------------------
// Apply new mapping to a program
export function applyProgramDataMapping(gl, programName, mappingName, glConfig, glResources) {
    var program = glResources.programs[programName],
        mapping = glConfig.mappings[mappingName];

    mapping.forEach(function(bufferMapping) {
        var glBuffer = glResources.buffers[bufferMapping.id];

        gl.bindBuffer(gl.ARRAY_BUFFER, glBuffer);
        program[bufferMapping.name] = gl.getAttribLocation(program, bufferMapping.attribute);
        gl.enableVertexAttribArray(program[bufferMapping.name]);
        gl.vertexAttribPointer.apply(gl, [ program[bufferMapping.name] ].concat(bufferMapping.format));
        gl.bindBuffer(gl.ARRAY_BUFFER, null);
    });
}

// --------------------------------------------------------------------------
// Bind texture to Framebuffer
export function bindTextureToFramebuffer(gl, fbo, texture) {
    gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
    gl.bindTexture(gl.TEXTURE_2D, texture);

    gl.texImage2D(gl.TEXTURE_2D,
                  0, gl.RGBA, fbo.width, fbo.height,
                  0, gl.RGBA, gl.UNSIGNED_BYTE, null);

    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                            gl.TEXTURE_2D, texture, 0);

  // Check fbo status
  var fbs = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (fbs !== gl.FRAMEBUFFER_COMPLETE) {
        console.log("ERROR: There is a problem with the framebuffer: " + fbs);
  }

  // Clear the bindings we created in this function.
  gl.bindTexture(gl.TEXTURE_2D, null);
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// --------------------------------------------------------------------------
// Free GL resources
export function freeGLResources(gl, resources) {
    // Delete each program
    for(var programName in resources.programs) {
        var program = resources.programs[programName],
            shaders = program.shaders,
            count = shaders.length;

        // Delete shaders
        while(count--) {
            gl.deleteShader(shaders[count]);
        }

        // Delete program
        gl.deleteProgram(program);
    }

    // Delete framebuffers
    for(var fbName in resources.framebuffers) {
        gl.deleteFramebuffer(resources.framebuffers[fbName]);
    }

    // Delete textures
    for(var textureName in resources.textures) {
        gl.deleteTexture(resources.textures[textureName]);
    }

    // Delete buffers
    for(var bufferName in resources.buffers) {
        gl.deleteBuffer(resources.buffers[bufferName]);
    }
}

// --------------------------------------------------------------------------

export function PingPong(gl, fbos, textures) {
    this.gl = gl;
    this.idx = 0;
    this.fbos = fbos;
    this.textures = textures;

    bindTextureToFramebuffer(this.gl, this.fbos[0], this.textures[1]);
    bindTextureToFramebuffer(this.gl, this.fbos[1], this.textures[0]);
}

PingPong.prototype.swap = function() {
    this.idx++;
    this.idx %= 2;
}

PingPong.prototype.clearFbo = function() {
    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[0]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.gl.bindFramebuffer(this.gl.FRAMEBUFFER, this.fbos[1]);
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);

    this.idx = 0;
}

PingPong.prototype.getFramebuffer = function() {
    return this.fbos[this.idx];
}

PingPong.prototype.getRenderingTexture = function() {
    return this.textures[this.idx];
}

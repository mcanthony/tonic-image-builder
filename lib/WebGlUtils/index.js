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
};



// --------------------------------------------------------------------------
//
//
// --------------------------------------------------------------------------
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
};


// --------------------------------------------------------------------------
//
//
// --------------------------------------------------------------------------
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
};

precision mediump float;

uniform sampler2D rgbaSampler;
uniform sampler2D orderSampler;

uniform vec2 spriteDim;
uniform vec2 imageDim;

varying vec2 v_texCoord;


//
// Convenience function to map numbers in one range numbers into some
// other range
//
float affine(float inMin, float val, float inMax, float outMin, float outMax) {
    return (((val - inMin) / (inMax - inMin)) * (outMax - outMin)) + outMin;
}


//
// The 'mod' glsl function may not be present if the glsl version is not
// high enough, and the % operator requires an extension (gpu_shader4),
// so we provide this to be safe.
//
vec2 divideWithRemainder(float x, float y) {
    float quo = floor(x / y);
    float rem = x - (y * quo);
    return vec2(rem, quo);
}

//
// Convenience function to calculate the final texcoords in the sprite
// for some local image pixel.
//
vec2 getSpriteTexCoords(vec2 imgTc,       // textures coordinates within the image
                        vec2 sDim,        // sprite dimensions
                        vec2 iDim,        // image dimensions
                        int layerOffset)  // index of layer within sprite
{
    float baseOffset = iDim[0] * iDim[1] * float(layerOffset);
    float sIdx = floor(affine(0.0, imgTc.s, 1.0, 0.0, iDim[0] - 1.0));
    float tIdx = floor(affine(0.0, 1.0 - imgTc.t, 1.0, 0.0, iDim[1] - 1.0));
    float finalOffset = ((tIdx * iDim[0]) + sIdx) + baseOffset;
    vec2 sOff = divideWithRemainder(finalOffset, sDim[0]);

    return vec2(affine(0.0, sOff.s, sDim[0] - 1.0, 0.0, 1.0),
                affine(0.0, sOff.t, sDim[1] - 1.0, 1.0, 0.0));
}


//
// Main shader execution function
//
void main() {
    // Look up the layer number to which this pixel corresponds
    vec4 orderVec = texture2D(orderSampler, v_texCoord);
    int layer = int(affine(0.0, orderVec.x, 1.0, 0.0, 255.0));

    // Use the layer number and the provided tex coords to find address
    // of the corresponding color in the sprite.
    vec2 colorTc = getSpriteTexCoords(v_texCoord, spriteDim, imageDim, layer);
    gl_FragColor = texture2D(rgbaSampler, colorTc);

    // float c = affine(0.0, float(layer), 4.0, 0.0, 1.0);
    // gl_FragColor = vec4(c, c, c, 0.2);
}
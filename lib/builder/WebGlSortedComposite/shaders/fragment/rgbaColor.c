
precision mediump float;

uniform sampler2D alphaSampler;
uniform sampler2D intensitySampler;
uniform sampler2D orderSampler;
uniform sampler2D alphaMultiplierSampler;
uniform sampler2D lutSampler;

uniform int numberOfLayers;

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

    float layerCoord = affine(0.0, float(layer), float(numberOfLayers) - 1.0, 0.0, 1.0);
    float alphaMult = texture2D(alphaMultiplierSampler, vec2(layerCoord, 0.5)).r;

    // Use the layer number and the provided tex coords to find address
    // of the corresponding pixel in the sprites.
    vec2 colorTc = getSpriteTexCoords(v_texCoord, spriteDim, imageDim, layer);

    float alpha = texture2D(alphaSampler, colorTc).r;
    float intensity = texture2D(intensitySampler, colorTc).r;

    vec4 lutColor = texture2D(lutSampler, vec2(layerCoord, 0.5));

    gl_FragColor = vec4(lutColor.rgb * intensity, alpha * alphaMult);
}

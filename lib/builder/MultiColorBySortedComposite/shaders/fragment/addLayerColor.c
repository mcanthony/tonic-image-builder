
precision mediump float;

uniform sampler2D orderSampler;
uniform sampler2D intensitySampler;
uniform sampler2D layerColorSampler[6];
uniform sampler2D lutSampler[6];

uniform float layerAlpha[6];
uniform vec2 layerRange[6];

varying vec2 v_texCoord;

float affine(float inMin, float val, float inMax, float outMin, float outMax) {
    return (((val - inMin) / (inMax - inMin)) * (outMax - outMin)) + outMin;
}

//
// Main shader execution function
//
void main() {
    // Look up the layer number to which this pixel corresponds
    float orderSample = texture2D(orderSampler, v_texCoord).r;
    int order = int(orderSample * 255.0);

    float intensity = texture2D(intensitySampler, v_texCoord).r;
    bool foundOne = false;

    for (int i = 0; i < 6; ++i) {
        if (i == order) {
            foundOne = true;
            float f = texture2D(layerColorSampler[i], v_texCoord).r;
            if (f >= layerRange[i][0] && f <= layerRange[i][1]) {
                vec2 lutTCoord = vec2(affine(layerRange[i][0], f, layerRange[i][1], 0.0, 1.0), 0.5);
                vec4 color = texture2D(lutSampler[i], lutTCoord);
                gl_FragColor = vec4(color.xyz * intensity, layerAlpha[i]);
            } else {
                // Debug: Any cyan indicates we don't truly know the range of our scalars
                gl_FragColor = vec4(1.0, 0.0, 1.0, 0.2);
                //discard;
            }
        }
    }

    if (foundOne == false) {
        discard;
    }
}

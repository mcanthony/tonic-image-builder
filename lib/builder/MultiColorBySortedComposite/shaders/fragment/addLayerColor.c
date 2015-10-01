
precision mediump float;

uniform sampler2D orderSampler;
uniform sampler2D intensitySampler;
uniform sampler2D layerColorSampler;
uniform sampler2D lutSampler;

uniform int activeLayer;
uniform float activeLayerAlpha;
//uniform float numberOfLayers;
uniform vec2 activeLayerRange;

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

    // float oc = affine(0.0, float(order), numberOfLayers, 0.0, 1.0);
    // gl_FragColor = vec4(oc, oc, oc, 1.0);

    float intensity = texture2D(intensitySampler, v_texCoord).r;

    if (order == activeLayer) {
        float f = texture2D(layerColorSampler, v_texCoord).r;
        if (f >= activeLayerRange[0] && f <= activeLayerRange[1]) {
            vec2 lutTCoord = vec2(affine(activeLayerRange[0], f, activeLayerRange[1], 0.0, 1.0), 0.5);
            vec4 color = texture2D(lutSampler, lutTCoord);
            gl_FragColor = vec4(color.xyz * intensity, activeLayerAlpha);
            // gl_FragColor = vec4(color.xyz, activeLayerAlpha);
        } else {
            gl_FragColor = vec4(1.0, 0.0, 0.0, 0.2);
            //discard;
        }
    } else {
        //gl_FragColor = vec4(0.0, 1.0, 0.0, 0.2);
        discard;
    }
}

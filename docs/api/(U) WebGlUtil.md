# WebGLUtil

This is a utility class used to manipulate GL resources.

```js
var WebGlUtil = require('tonic-image-builder/lib/util/WebGl');
```

## showGlInfo(gl)

Print GL information regarding the WebGL context provided.

## createGLResources(gl, glConfig) : glResources

Create and configure all Gl resources described in the configuration using the
provided GL context.

```js
var sampleConfig = {
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
```

The returned glResource object will have a __destroy()__ method that let you
free the created resources.

## applyProgramDataMapping(gl, programName, mappingName, glConfig, glResources)

The mapping between buffers and programs is done at creation time but if other
mapping need to be done after the resource creation, this can be performed using
that function.

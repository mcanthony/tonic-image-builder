var contains = require('mout/src/array/contains'),
    CompositorMap = {
        'rgbd': require('./rgbd-compositor'),
        'sxyz-light': require('./sxyz-light-compositor'),
        'raw-rgbd': require('./raw-rgbd-compositor')
    };

export function createCompositor(dataType, options) {
    for(var type in CompositorMap) {
        if(contains(dataType, type)) {
            return new CompositorMap[type](options);
        }
    }
    console.error("No compositor found for type", dataType);
    return null;
}

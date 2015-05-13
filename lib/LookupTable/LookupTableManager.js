import LookupTable  from './LookupTable.js';
import EventEmitter from 'node-event-emitter';

var emitter = new EventEmitter();
var luts = {};

function onChange(event) {
    emitter.emit('LookupTable', event);
}

function addLookupTable(name, range, preset) {
    var lut = luts[name];
    if(lut === undefined) {
        luts[name] = lut = new LookupTable(name, onChange);
    }

    lut.setPreset(preset || 'spectral');
    lut.setScalarRange(range[0], range[1]);

    return lut;
}

function removeLookupTable(name) {
    var lut = luts[name];
    if(lut) {
        lut.delete();
    }
    delete luts[name];
}

function getLookupTable(name) {
    return luts[name];
}

function addFields(fieldsRange) {
    for(var field in fieldsRange) {
        addLookupTable(field, fieldsRange[field]);
    }
}

function addLookupTableListener(listener) {
    emitter.on('LookupTable', listener);
}

function removeLookupTableListener(listener) {
    emitter.off('LookupTable', listener);
}

export default {
    addLookupTable: addLookupTable,
    removeLookupTable: removeLookupTable,
    getLookupTable: getLookupTable,
    addFields: addFields,
    addLookupTableListener: addLookupTableListener,
    removeLookupTableListener: removeLookupTableListener
};

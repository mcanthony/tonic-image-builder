var LookupTable = require('./LookupTable.js'),
    hasOwn = require('mout/object/hasOwn'),
    Monologue = require('monologue.js'),
    CHANGE_TOPIC = 'LookupTable.change';

export default function LookupTableManager() {
    this.luts = {};
    this.lutSubscriptions = {};

    this.onChangeCallback = ((data, envelope) => {
        this.emit(CHANGE_TOPIC, data);
    });
}

// Add Observer pattern using Monologue.js
Monologue.mixInto(LookupTableManager);

LookupTableManager.prototype.addLookupTable = function(name, range, preset) {
    var lut = this.luts[name];
    if(lut === undefined) {
        lut = new LookupTable(name);

        this.luts[name] = lut;
        this.lutSubscriptions[name] = lut.onChange(this.onChangeCallback);
    }

    lut.setPreset(preset || 'spectral');
    lut.setScalarRange(range[0], range[1]);

    return lut;
}

LookupTableManager.prototype.removeLookupTable = function(name) {
    if(this.luts.hasOwn(name)) {
        this.lutSubscriptions[name].unsubscribe();
        this.luts[name].delete();

        delete this.luts[name];
        delete this.lutSubscriptions[name];
    }
}

LookupTableManager.prototype.getLookupTable = function(name) {
    return this.luts[name];
}

LookupTableManager.prototype.addFields = function(fieldsRange) {
    for(var field in fieldsRange) {
        this.addLookupTable(field, fieldsRange[field]);
    }
}

LookupTableManager.prototype.onChange = function(callback) {
    return this.on(CHANGE_TOPIC, callback);
}

LookupTableManager.prototype.TopicChange = function() {
    return CHANGE_TOPIC;
}

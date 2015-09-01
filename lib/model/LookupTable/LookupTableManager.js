var LookupTable = require('./LookupTable.js'),
    hasOwn = require('mout/object/hasOwn'),
    Monologue = require('monologue.js'),
    CHANGE_TOPIC = 'LookupTable.change',
    ACTIVE_LOOKUP_TABLE_CHANGE_TOPIC = 'LookupTable.active.change',
    LOOKUP_TABLE_LIST_CHANGE_TOPIC = 'LookupTable.list.change';

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

    lut.setPreset(preset || 'spectralflip');
    lut.setScalarRange(range[0], range[1]);

    this.emit(LOOKUP_TABLE_LIST_CHANGE_TOPIC, this);

    return lut;
}

LookupTableManager.prototype.removeLookupTable = function(name) {
    if(this.luts.hasOwn(name)) {
        this.lutSubscriptions[name].unsubscribe();
        this.luts[name].destroy();

        delete this.luts[name];
        delete this.lutSubscriptions[name];


        this.emit(LOOKUP_TABLE_LIST_CHANGE_TOPIC, this);
    }
}

LookupTableManager.prototype.getLookupTable = function(name) {
    setImmediate(()=>{
        this.emit(ACTIVE_LOOKUP_TABLE_CHANGE_TOPIC, name);
    });
    this.activeField = name;
    return this.luts[name];
}

LookupTableManager.prototype.addFields = function(fieldsRange) {
    for(var field in fieldsRange) {
        this.addLookupTable(field, fieldsRange[field]);
    }
}

LookupTableManager.prototype.getActiveField = function() {
    return this.activeField;
}

LookupTableManager.prototype.onChange = function(callback) {
    return this.on(CHANGE_TOPIC, callback);
}

LookupTableManager.prototype.onFieldsChange = function(callback) {
    return this.on(LOOKUP_TABLE_LIST_CHANGE_TOPIC, callback);
}

LookupTableManager.prototype.onActiveLookupTableChange = function(callback) {
    return this.on(ACTIVE_LOOKUP_TABLE_CHANGE_TOPIC, callback);
}

var Monologue             = require('monologue.js'),
    IMAGE_READY_TOPIC     = 'image-ready';

// CompositeImageBuilder Object ----------------------------------------------

export default function QueryDataModelImageBuilder(queryDataModel) {
    this.queryDataModel = queryDataModel;
    this.lastQueryImage = null;
    this.onLoadCallback = (() => {
        this.lastQueryImage.removeEventListener('load', this.onLoadCallback);
        this.render();
    });

    this.dataSubscription = queryDataModel.onDataChange( (data, envelope) => {
        if(this.lastQueryImage) {
            this.lastQueryImage.removeEventListener('load', this.onLoadCallback);
        }

        this.lastQueryImage = data.image.image;
        this.render();
    });
}

// Add Observer pattern to TonicDataManager using Monologue.js
Monologue.mixInto(QueryDataModelImageBuilder);

// ----------------------------------------------------------------------------

QueryDataModelImageBuilder.prototype.getDimensions = function() {
    return [ this.lastQueryImage.width, this.lastQueryImage.height ];
}

QueryDataModelImageBuilder.prototype.update = function() {
    this.queryDataModel.fetchData();
};

QueryDataModelImageBuilder.prototype.render = function() {
    if(!this.lastQueryImage) {
        this.queryDataModel.fetchData();
        return;
    }

    if(this.lastQueryImage.complete) {
        var width = this.lastQueryImage.width,
            height = this.lastQueryImage.height;

        this.emit(IMAGE_READY_TOPIC, {
            canvas: this.lastQueryImage,
            area: [0, 0, width, height],
            outputSize: [width, height],
            builder: this
        });
    } else {
        this.lastQueryImage.addEventListener('load', this.onLoadCallback);
    }
};

QueryDataModelImageBuilder.prototype.onImageReady = function(callback) {
    return this.on(IMAGE_READY_TOPIC, callback);
};

QueryDataModelImageBuilder.prototype.getListeners = function() {
    return this.queryDataModel.getTonicMouseListener();
};

QueryDataModelImageBuilder.prototype.destroy = function() {
    this.off();

    this.dataSubscription.unsubscribe();
    this.dataSubscription = null;

    this.queryDataModel = null;
};

// Method meant to be used with the WidgetFactory
QueryDataModelImageBuilder.prototype.getControlWidgets = function() {
    return [ "QueryDataModelWidget" ];
};

QueryDataModelImageBuilder.prototype.getQueryDataModel = function() {
    return this.queryDataModel;
};

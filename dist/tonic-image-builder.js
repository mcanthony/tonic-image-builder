!function(t){function e(n){if(r[n])return r[n].exports;var o=r[n]={exports:{},id:n,loaded:!1};return t[n].call(o.exports,o,o.exports,e),o.loaded=!0,o.exports}var r={};return e.m=t,e.c=r,e.p="",e(0)}([function(t,e,r){(function(e){t.exports=e.tonicImageBuilder=r(5)}).call(e,function(){return this}())},function(t,e,r){"use strict";function n(t,e){this.id="CanvasOffscreenBuffer_"+ ++o,this.el=document.createElement("canvas"),this.width=t,this.height=e,this.el.style.display="none",this.el.setAttribute("width",this.width),this.el.setAttribute("height",this.height),document.body.appendChild(this.el)}Object.defineProperty(e,"__esModule",{value:!0}),e["default"]=n;var o=0;n.prototype.size=function(t,e){return t&&this.el.setAttribute("width",this.width=t),e&&this.el.setAttribute("height",this.height=e),[Number(this.width),Number(this.height)]},n.prototype.get2DContext=function(){return this.el.getContext("2d")},n.prototype["delete"]=function(){this.el.parentNode.removeChild(this.el),this.el=null,this.width=null,this.height=null},n.prototype.toDataURL=function(){return this.el.toDataURL()},t.exports=e["default"]},function(t,e,r){"use strict";function n(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e["default"]=t,e}function o(t,e,r){return(e-t)*r+t}function s(t,e,r){var n=(r-t[0])/(e[0]-t[0]);return[o(t[1],e[1],n),o(t[2],e[2],n),o(t[3],e[3],n)]}function i(t,e){return[t[e].x,t[e].r,t[e].g,t[e].b]}function g(t,e){return t.x-e.x}function a(t,e){this.name=t,this.scalarRange=[0,1],this.delta=1,this.controlPoints=null,this.colorTableSize=256,this.colorTable=null,this.onChange=e||function(){},this.setPreset("spectral"),this.build()}Object.defineProperty(e,"__esModule",{value:!0}),e["default"]=a;var b=r(4),l=n(b),h=[];for(var u in l.lookuptables)h.push(u);a.prototype.getName=function(){return this.name},a.prototype.getPresets=function(){return h},a.prototype.setPreset=function(t){this.colorTable=null,this.controlPoints=[];for(var e=l.lookuptables[t].controlpoints,r=e.length,n=0;r>n;n++)this.controlPoints.push({x:e[n].x,r:e[n].r,g:e[n].g,b:e[n].b});this.build(),this.onChange({change:"preset",lut:this})},a.prototype.getScalarRange=function(){return this.scalarRange},a.prototype.setScalarRange=function(t,e){this.scalarRange=[t,e],this.delta=e-t,this.onChange({change:"scalarRange",lut:this})},a.prototype.build=function(t){if(!this.colorTable){this.colorTable=[];for(var e=0,r=0;r<this.colorTableSize;r++){var n=r/(this.colorTableSize-1),o=i(this.controlPoints,e),g=i(this.controlPoints,e+1);n>g[0]&&(e+=1,o=i(this.controlPoints,e),g=i(this.controlPoints,e+1)),this.colorTable.push(s(o,g,n))}t&&this.onChange({change:"controlPoints",lut:this})}},a.prototype.setNumberOfColors=function(t){this.colorTableSize=t,this.colorTable=null,this.build(),this.onChange({change:"numberOfColors",lut:this})},a.prototype.getNumberOfControlPoints=function(){return this.controlPoints?this.controlPoints.length:0},a.prototype.removeControlPoint=function(t){return t>0&&t<this.controlPoints.length-1?(this.controlPoints.splice(t,1),this.colorTable=null,this.build(!0),!0):!1},a.prototype.getControlPoint=function(t){return this.controlPoints[t]},a.prototype.updateControlPoint=function(t,e){this.controlPoints[t]=e;var r=e.x;this.controlPoints.sort(g),this.colorTable=null,this.build(!0);for(var n=0;n<this.controlPoints.length;n++)if(this.controlPoints[n].x===r)return n;return 0},a.prototype.addControlPoint=function(t){this.controlPoints.push(t);var e=t.x;this.controlPoints.sort(g),this.colorTable=null,this.build(!0);for(var r=0;r<this.controlPoints.length;r++)if(this.controlPoints[r].x===e)return r;return 0},a.prototype.drawToCanvas=function(t){for(var e=this.colorTable,r=e.length,n=t.getContext("2d"),o=n.getImageData(0,0,r,1),s=0;r>s;s++)o.data[4*s+0]=Math.floor(255*e[s][0]),o.data[4*s+1]=Math.floor(255*e[s][1]),o.data[4*s+2]=Math.floor(255*e[s][2]),o.data[4*s+3]=255;n.putImageData(o,0,0)},a.prototype.getColor=function(t){var e=Math.floor(this.colorTableSize*(t-this.scalarRange[0])/this.delta);return 0>e?this.colorTable[0]:e>=this.colorTableSize?this.colorTable[this.colorTable.length-1]:this.colorTable[e]},a.prototype["delete"]=function(){this.onChange=null},t.exports=e["default"]},function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{"default":t}}function o(t){f.emit("LookupTable",t)}function s(t,e,r){var n=d[t];return void 0===n&&(d[t]=n=new u["default"](t,o)),n.setPreset(r||"spectral"),n.setScalarRange(e[0],e[1]),n}function i(t){var e=d[t];e&&e["delete"](),delete d[t]}function g(t){return d[t]}function a(t){for(var e in t)s(e,t[e])}function b(t){f.on("LookupTable",t)}function l(t){f.off("LookupTable",t)}Object.defineProperty(e,"__esModule",{value:!0});var h=r(2),u=n(h),c=r(8),p=n(c),f=new p["default"],d={};e["default"]={addLookupTable:s,removeLookupTable:i,getLookupTable:g,addFields:a,addLookupTableListener:b,removeLookupTableListener:l},t.exports=e["default"]},function(t,e,r){"use strict";Object.defineProperty(e,"__esModule",{value:!0}),e["default"]={lookuptables:{spectral:{controlpoints:[{x:0,r:.6196078431372549,g:.00392156862745098,b:.2588235294117647},{x:.1,r:.8352941176470589,g:.2431372549019608,b:.3098039215686275},{x:.2,r:.9568627450980393,g:.4274509803921568,b:.2627450980392157},{x:.3,r:.9921568627450981,g:.6823529411764706,b:.3803921568627451},{x:.4,r:.996078431372549,g:.8784313725490196,b:.5450980392156862},{x:.5,r:1,g:1,b:.7490196078431373},{x:.6,r:.9019607843137255,g:.9607843137254902,b:.596078431372549},{x:.7,r:.6705882352941176,g:.8666666666666667,b:.6431372549019608},{x:.8,r:.4,g:.7607843137254902,b:.6470588235294118},{x:.9,r:.196078431372549,g:.5333333333333333,b:.7411764705882353},{x:1,r:.3686274509803922,g:.3098039215686275,b:.6352941176470588}],range:[0,1]},spectralflip:{controlpoints:[{x:0,r:.3686274509803922,g:.3098039215686275,b:.6352941176470588},{x:.1,r:.196078431372549,g:.5333333333333333,b:.7411764705882353},{x:.2,r:.4,g:.7607843137254902,b:.6470588235294118},{x:.3,r:.6705882352941176,g:.8666666666666667,b:.6431372549019608},{x:.4,r:.9019607843137255,g:.9607843137254902,b:.596078431372549},{x:.5,r:1,g:1,b:.7490196078431373},{x:.6,r:.996078431372549,g:.8784313725490196,b:.5450980392156862},{x:.7,r:.9921568627450981,g:.6823529411764706,b:.3803921568627451},{x:.8,r:.9568627450980393,g:.4274509803921568,b:.2627450980392157},{x:.9,r:.8352941176470589,g:.2431372549019608,b:.3098039215686275},{x:1,r:.6196078431372549,g:.00392156862745098,b:.2588235294117647}],range:[0,1]},ocean:{controlpoints:[{x:0,r:.039215,g:.090195,b:.25098},{x:.125,r:.133333,g:.364706,b:.521569},{x:.25,r:.321569,g:.760784,b:.8},{x:.375,r:.690196,g:.960784,b:.894118},{x:.5,r:.552941,g:.921569,b:.552941},{x:.625,r:.329412,g:.6,b:.239216},{x:.75,r:.211765,g:.34902,b:.078435},{x:.875,r:.011765,g:.207843,b:.023525},{x:1,r:.286275,g:.294118,b:.301961}],range:[0,1]},warm:{controlpoints:[{x:0,r:.4745098039215686,g:.09019607843137255,b:.09019607843137255},{x:.2,r:.7098039215686275,g:.00392156862745098,b:.00392156862745098},{x:.4,r:.9372549019607843,g:.2784313725490196,b:.09803921568627451},{x:.6,r:.9764705882352941,g:.5137254901960784,b:.1411764705882353},{x:.8,r:1,g:.7058823529411765,b:0},{x:1,r:1,g:.8980392156862745,b:.02352941176470588}],range:[0,1]},cool:{controlpoints:[{x:0,r:.4588235294117647,g:.6941176470588235,b:.00392156862745098},{x:.1666666666666667,r:.3450980392156863,g:.5019607843137255,b:.1607843137254902},{x:.3333333333333333,r:.3137254901960784,g:.8431372549019608,b:.7490196078431373},{x:.5,r:.1098039215686274,g:.5843137254901961,b:.803921568627451},{x:.6666666666666666,r:.2313725490196079,g:.407843137254902,b:.6705882352941176},{x:.8333333333333334,r:.6039215686274509,g:.407843137254902,b:1},{x:1,r:.3725490196078431,g:.2,b:.5019607843137255}],range:[0,1]},blues:{controlpoints:[{x:0,r:.2313725490196079,g:.407843137254902,b:.6705882352941176},{x:.1666666666666667,r:.1098039215686274,g:.5843137254901961,b:.803921568627451},{x:.3333333333333333,r:.3058823529411765,g:.8509803921568627,b:.9176470588235294},{x:.5,r:.4509803921568628,g:.6039215686274509,b:.8352941176470589},{x:.6666666666666666,r:.2588235294117647,g:.2392156862745098,b:.6627450980392157},{x:.8333333333333334,r:.3137254901960784,g:.3294117647058823,b:.5294117647058824},{x:1,r:.06274509803921569,g:.1647058823529412,b:.3215686274509804}],range:[0,1]},wildflower:{controlpoints:[{x:0,r:.1098039215686274,g:.5843137254901961,b:.803921568627451},{x:.1666666666666667,r:.2313725490196079,g:.407843137254902,b:.6705882352941176},{x:.3333333333333333,r:.4,g:.2431372549019608,b:.7176470588235294},{x:.5,r:.6352941176470588,g:.3294117647058823,b:.8117647058823529},{x:.6666666666666666,r:.8705882352941177,g:.3803921568627451,b:.807843137254902},{x:.8333333333333334,r:.8627450980392157,g:.3803921568627451,b:.5843137254901961},{x:1,r:.2392156862745098,g:.06274509803921569,b:.3215686274509804}],range:[0,1]},citrus:{controlpoints:[{x:0,r:.396078431372549,g:.4862745098039216,b:.2156862745098039},{x:.2,r:.4588235294117647,g:.6941176470588235,b:.00392156862745098},{x:.4,r:.6980392156862745,g:.7294117647058823,b:.1882352941176471},{x:.6,r:1,g:.8980392156862745,b:.02352941176470588},{x:.8,r:1,g:.7058823529411765,b:0},{x:1,r:.9764705882352941,g:.5137254901960784,b:.1411764705882353}],range:[0,1]},organge2purple:{controlpoints:[{x:0,r:.4980392156862745,g:.2313725490196079,b:.03137254901960784},{x:.1,r:.7019607843137254,g:.3450980392156863,b:.02352941176470588},{x:.2,r:.8784313725490196,g:.5098039215686274,b:.0784313725490196},{x:.3,r:.9921568627450981,g:.7215686274509804,b:.3882352941176471},{x:.4,r:.996078431372549,g:.8784313725490196,b:.7137254901960784},{x:.5,r:.9686274509803922,g:.9686274509803922,b:.9686274509803922},{x:.6,r:.8470588235294118,g:.8549019607843137,b:.9215686274509803},{x:.7,r:.6980392156862745,g:.6705882352941176,b:.8235294117647058},{x:.8,r:.5019607843137255,g:.4509803921568628,b:.6745098039215687},{x:.9,r:.3294117647058823,g:.1529411764705882,b:.5333333333333333},{x:1,r:.1764705882352941,g:0,b:.2941176470588235}],range:[0,1]},brown2green:{controlpoints:[{x:0,r:.3294117647058823,g:.1882352941176471,b:.0196078431372549},{x:.1,r:.5490196078431373,g:.3176470588235294,b:.0392156862745098},{x:.2,r:.7490196078431373,g:.5058823529411764,b:.1764705882352941},{x:.3,r:.8745098039215686,g:.7607843137254902,b:.4901960784313725},{x:.4,r:.9647058823529412,g:.9098039215686274,b:.7647058823529411},{x:.5,r:.9607843137254902,g:.9607843137254902,b:.9607843137254902},{x:.6,r:.7803921568627451,g:.9176470588235294,b:.8980392156862745},{x:.7,r:.5019607843137255,g:.803921568627451,b:.7568627450980392},{x:.8,r:.207843137254902,g:.592156862745098,b:.5607843137254902},{x:.9,r:.00392156862745098,g:.4,b:.3686274509803922},{x:1,r:0,g:.2352941176470588,b:.1882352941176471}],range:[0,1]},blue2green:{controlpoints:[{x:0,r:.9686274509803922,g:.9882352941176471,b:.9921568627450981},{x:.125,r:.8980392156862745,g:.9607843137254902,b:.9764705882352941},{x:.25,r:.8,g:.9254901960784314,b:.9019607843137255},{x:.375,r:.6,g:.8470588235294118,b:.788235294117647},{x:.5,r:.4,g:.7607843137254902,b:.6431372549019608},{x:.625,r:.2549019607843137,g:.6823529411764706,b:.4627450980392157},{x:.75,r:.1372549019607843,g:.5450980392156862,b:.2705882352941176},{x:.875,r:0,g:.4274509803921568,b:.1725490196078431},{x:1,r:0,g:.2666666666666667,b:.1058823529411765}],range:[0,1]},yellow2brown:{controlpoints:[{x:0,r:1,g:1,b:.8980392156862745},{x:.125,r:1,g:.9686274509803922,b:.7372549019607844},{x:.25,r:.996078431372549,g:.8901960784313725,b:.5686274509803921},{x:.375,r:.996078431372549,g:.7686274509803922,b:.3098039215686275},{x:.5,r:.996078431372549,g:.6,b:.1607843137254902},{x:.625,r:.9254901960784314,g:.4392156862745098,b:.0784313725490196},{x:.75,r:.8,g:.2980392156862745,b:.00784313725490196},{x:.875,r:.6,g:.203921568627451,b:.01568627450980392},{x:1,r:.4,g:.1450980392156863,b:.02352941176470588}],range:[0,1]},blue2purple:{controlpoints:[{x:0,r:.9686274509803922,g:.9882352941176471,b:.9921568627450981},{x:.125,r:.8784313725490196,g:.9254901960784314,b:.9568627450980393},{x:.25,r:.7490196078431373,g:.8274509803921568,b:.9019607843137255},{x:.375,r:.6196078431372549,g:.7372549019607844,b:.8549019607843137},{x:.5,r:.5490196078431373,g:.5882352941176471,b:.7764705882352941},{x:.625,r:.5490196078431373,g:.4196078431372549,b:.6941176470588235},{x:.75,r:.5333333333333333,g:.2549019607843137,b:.615686274509804},{x:.875,r:.5058823529411764,g:.05882352941176471,b:.4862745098039216},{x:1,r:.3019607843137255,g:0,b:.2941176470588235}],range:[0,1]},cold2warm:{controlpoints:[{x:0,r:.23137254902,g:.298039215686,b:.752941176471},{x:.5,r:.865,g:.865,b:.865},{x:1,r:.705882352941,g:.0156862745098,b:.149019607843}],range:[0,1]},rainbow:{controlpoints:[{x:0,r:0,g:0,b:1},{x:.25,r:0,g:1,b:1},{x:.5,r:0,g:1,b:0},{x:.75,r:1,g:1,b:0},{x:1,r:1,g:0,b:0}],range:[0,1]},earth:{controlpoints:[{x:0,r:.392157,g:.392157,b:.392157},{x:.586175,r:.392157,g:.392157,b:.392157},{x:.589041,r:.141176,g:.345098,b:.478431},{x:.589042,r:.501961,g:.694118,b:.172549},{x:.617699,r:.74902,g:.560784,b:.188235},{x:.789648,r:.752941,g:.741176,b:.729412},{x:.993079,r:.796078,g:.780392,b:.772549},{x:1,r:.796078,g:.780392,b:.772549}],range:[0,1]}},swatches:{colors:[{r:255,g:255,b:255},{r:204,g:255,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:204,g:204,b:255},{r:255,g:204,b:255},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:204,b:204},{r:255,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:255,b:204},{r:204,g:204,b:204},{r:153,g:255,b:255},{r:153,g:204,b:255},{r:153,g:153,b:255},{r:153,g:153,b:255},{r:153,g:153,b:255},{r:153,g:153,b:255},{r:153,g:153,b:255},{r:153,g:153,b:255},{r:153,g:153,b:255},{r:204,g:153,b:255},{r:255,g:153,b:255},{r:255,g:153,b:204},{r:255,g:153,b:153},{r:255,g:153,b:153},{r:255,g:153,b:153},{r:255,g:153,b:153},{r:255,g:153,b:153},{r:255,g:153,b:153},{r:255,g:153,b:153},{r:255,g:204,b:153},{r:255,g:255,b:153},{r:204,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:153},{r:153,g:255,b:204},{r:204,g:204,b:204},{r:102,g:255,b:255},{r:102,g:204,b:255},{r:102,g:153,b:255},{r:102,g:102,b:255},{r:102,g:102,b:255},{r:102,g:102,b:255},{r:102,g:102,b:255},{r:102,g:102,b:255},{r:153,g:102,b:255},{r:204,g:102,b:255},{r:255,g:102,b:255},{r:255,g:102,b:204},{r:255,g:102,b:153},{r:255,g:102,b:102},{r:255,g:102,b:102},{r:255,g:102,b:102},{r:255,g:102,b:102},{r:255,g:102,b:102},{r:255,g:153,b:102},{r:255,g:204,b:102},{r:255,g:255,b:102},{r:204,g:255,b:102},{r:153,g:255,b:102},{r:102,g:255,b:102},{r:102,g:255,b:102},{r:102,g:255,b:102},{r:102,g:255,b:102},{r:102,g:255,b:102},{r:102,g:255,b:153},{r:102,g:255,b:204},{r:153,g:153,b:153},{r:51,g:255,b:255},{r:51,g:204,b:255},{r:51,g:153,b:255},{r:51,g:102,b:255},{r:51,g:51,b:255},{r:51,g:51,b:255},{r:51,g:51,b:255},{r:102,g:51,b:255},{r:153,g:51,b:255},{r:204,g:51,b:255},{r:255,g:51,b:255},{r:255,g:51,b:204},{r:255,g:51,b:153},{r:255,g:51,b:102},{r:255,g:51,b:51},{r:255,g:51,b:51},{r:255,g:51,b:51},{r:255,g:102,b:51},{r:255,g:153,b:51},{r:255,g:204,b:51},{r:255,g:255,b:51},{r:204,g:255,b:51},{r:153,g:255,b:51},{r:102,g:255,b:51},{r:51,g:255,b:51},{r:51,g:255,b:51},{r:51,g:255,b:51},{r:51,g:255,b:102},{r:51,g:255,b:153},{r:51,g:255,b:204},{r:153,g:153,b:153},{r:0,g:255,b:255},{r:0,g:204,b:255},{r:0,g:153,b:255},{r:0,g:102,b:255},{r:0,g:51,b:255},{r:0,g:0,b:255},{r:51,g:0,b:255},{r:102,g:0,b:255},{r:153,g:0,b:255},{r:204,g:0,b:255},{r:255,g:0,b:255},{r:255,g:0,b:204},{r:255,g:0,b:153},{r:255,g:0,b:102},{r:255,g:0,b:51},{r:255,g:0,b:0},{r:255,g:51,b:0},{r:255,g:102,b:0},{r:255,g:153,b:0},{r:255,g:204,b:0},{r:255,g:255,b:0},{r:204,g:255,b:0},{r:153,g:255,b:0},{r:102,g:255,b:0},{r:51,g:255,b:0},{r:0,g:255,b:0},{r:0,g:255,b:51},{r:0,g:255,b:102},{r:0,g:255,b:153},{r:0,g:255,b:204},{r:102,g:102,b:102},{r:0,g:204,b:204},{r:0,g:204,b:204},{r:0,g:153,b:204},{r:0,g:102,b:204},{r:0,g:51,b:204},{r:0,g:0,b:204},{r:51,g:0,b:204},{r:102,g:0,b:204},{r:153,g:0,b:204},{r:204,g:0,b:204},{r:204,g:0,b:204},{r:204,g:0,b:204},{r:204,g:0,b:153},{r:204,g:0,b:102},{r:204,g:0,b:51},{r:204,g:0,b:0},{r:204,g:51,b:0},{r:204,g:102,b:0},{r:204,g:153,b:0},{r:204,g:204,b:0},{r:204,g:204,b:0},{r:204,g:204,b:0},{r:153,g:204,b:0},{r:102,g:204,b:0},{r:51,g:204,b:0},{r:0,g:204,b:0},{r:0,g:204,b:51},{r:0,g:204,b:102},{r:0,g:204,b:153},{r:0,g:204,b:204},{r:102,g:102,b:102},{r:0,g:153,b:153},{r:0,g:153,b:153},{r:0,g:153,b:153},{r:0,g:102,b:153},{r:0,g:51,b:153},{r:0,g:0,b:153},{r:51,g:0,b:153},{r:102,g:0,b:153},{r:153,g:0,b:153},{r:153,g:0,b:153},{r:153,g:0,b:153},{r:153,g:0,b:153},{r:153,g:0,b:153},{r:153,g:0,b:102},{r:153,g:0,b:51},{r:153,g:0,b:0},{r:153,g:51,b:0},{r:153,g:102,b:0},{r:153,g:153,b:0},{r:153,g:153,b:0},{r:153,g:153,b:0},{r:153,g:153,b:0},{r:153,g:153,b:0},{r:102,g:153,b:0},{r:51,g:153,b:0},{r:0,g:153,b:0},{r:0,g:153,b:51},{r:0,g:153,b:102},{r:0,g:153,b:153},{r:0,g:153,b:153},{r:51,g:51,b:51},{r:0,g:102,b:102},{r:0,g:102,b:102},{r:0,g:102,b:102},{r:0,g:102,b:102},{r:0,g:51,b:102},{r:0,g:0,b:102},{r:51,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:102},{r:102,g:0,b:51},{r:102,g:0,b:0},{r:102,g:51,b:0},{r:102,g:102,b:0},{r:102,g:102,b:0},{r:102,g:102,b:0},{r:102,g:102,b:0},{r:102,g:102,b:0},{r:102,g:102,b:0},{r:102,g:102,b:0},{r:51,g:102,b:0},{r:0,g:102,b:0},{r:0,g:102,b:51},{r:0,g:102,b:102},{r:0,g:102,b:102},{r:0,g:102,b:102},{r:0,g:0,b:0},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:0,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:51},{r:51,g:0,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:51,g:51,b:0},{r:0,g:51,b:0},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:0,g:51,b:51},{r:51,g:51,b:51}],columns:31,rows:9}},t.exports=e["default"]},function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{"default":t}}Object.defineProperty(e,"__esModule",{value:!0});var o=r(1),s=n(o),i=r(6),g=n(i),a=r(7);e.CanvasOffscreenBuffer=s["default"],e.DataProberImageBuilder=g["default"],e.LookupTable=a.LookupTable,e.LookupTableManager=a.LookupTableManager,e.Presets=a.Presets},function(t,e,r){"use strict";function n(t){return t&&t.__esModule?t:{"default":t}}function o(t,e){function r(t){g.lastImageStack=t,g.render()}this.queryDataModel=t,this.metadata=t.originalData.InSituDataProber,this.fieldIndex=0,this.renderMethod="renderXY",this.lastImageStack=null,this.workImage=new Image,this.onReadyListeners=[],this.listeners={},this.listenerCount=0,this.probeXYZ=[Math.floor(this.metadata.dimensions[0]/2),Math.floor(this.metadata.dimensions[1]/2),Math.floor(this.metadata.dimensions[2]/2)],this.setField(this.metadata.fields[this.fieldIndex]),this.pushMethod=e?"pushToFrontAsBuffer":"pushToFrontAsImage",a["default"].addFields(this.metadata.ranges);for(var n=0,o=0;3>o;++o){var s=this.metadata.dimensions[o];n=s>n?s:n}this.bgCanvas=new i["default"](n,n),this.fgCanvas=null;var g=this;this.listenerId=t.addDataListener(r),this.onLookupTableChange=function(){g.update()},a["default"].addLookupTableListener(this.onLookupTableChange)}Object.defineProperty(e,"__esModule",{value:!0}),e["default"]=o;var s=r(1),i=n(s),g=r(3),a=n(g);o.prototype.setPushMethodAsBuffer=function(){this.pushMethod="pushToFrontAsBuffer"},o.prototype.setPushMethodAsImage=function(){this.pushMethod="pushToFrontAsImage"},o.prototype.getYOffset=function(t){return void 0===t&&(t=this.probeXYZ[2]),this.metadata.sprite_size-t%this.metadata.sprite_size-1},o.prototype.getImage=function(t,e){void 0===t&&(t=this.probeXYZ[2]),this.workImage.onload=e,this.workImage.src=this.lastImageStack[this.metadata.slices[Math.floor(t/this.metadata.sprite_size)]].url},o.prototype.update=function(){this.queryDataModel.fetchData()},o.prototype.setProbe=function(t,e,r){this.probeXYZ=[t,e,r],this.queryDataModel.fetchData()},o.prototype.getProbe=function(){return this.probeXYZ},o.prototype.render=function(){this.lastImageStack&&this[this.renderMethod]()},o.prototype.pushToFront=function(t,e,r,n,o,s){this[this.pushMethod](t,e,r,n,o,s)},o.prototype.pushToFrontAsImage=function(t,e,r,n,o,s){var g=Math.floor(t*r),a=Math.floor(e*n),b=this.onReadyListeners,l=b.length,h=null;this.fgCanvas?this.fgCanvas.size(g,a):this.fgCanvas=new i["default"](g,a),h=this.fgCanvas.get2DContext(),h.drawImage(this.bgCanvas.el,0,0,t,e,0,0,g,a),h.beginPath(),h.moveTo(o*r,0),h.lineTo(o*r,a),h.moveTo(0,s*n),h.lineTo(g,s*n),h.strokeStyle="#ffffff",h.lineWidth=1,h.stroke();for(var u={url:this.fgCanvas.toDataURL(),type:this.renderMethod};l--;)b[l](u)},o.prototype.pushToFrontAsBuffer=function(t,e,r,n,o,s){for(var i=Math.floor(t*r),g=Math.floor(e*n),a=this.onReadyListeners,b=a.length,l={canvas:this.bgCanvas.el,imageData:this.bgCanvas.el.getContext("2d").getImageData(0,0,t,e),area:[0,0,t,e],outputSize:[i,g],crosshair:[o*r,s*n],type:this.renderMethod};b--;)a[b](l)},o.prototype.renderXY=function(){var t=this,e=this.bgCanvas.get2DContext(),r=this.getYOffset(),n=this.probeXYZ,o=this.metadata.dimensions,s=this.metadata.spacing;this.getImage(this.probeXYZ[2],function(){var i=this;e.drawImage(i,0,o[1]*r,o[0],o[1],0,0,o[0],o[1]),t.applyLookupTable(o[0],o[1]),t.pushToFront(o[0],o[1],s[0],s[1],n[0],n[1])})},o.prototype.renderZY=function(){function t(){var g=e.getYOffset(s),a=this;r.drawImage(a,n[0],o[1]*g,1,o[1],s,0,1,o[1]),s--?e.getImage(s,t):(e.applyLookupTable(o[2],o[1]),e.pushToFront(o[2],o[1],i[2],i[1],n[2],n[1]))}var e=this,r=this.bgCanvas.get2DContext(),n=(this.getYOffset(),this.probeXYZ),o=this.metadata.dimensions,s=o[2],i=this.metadata.spacing;s--&&e.getImage(s,t)},o.prototype.renderXZ=function(){function t(){var g=e.getYOffset(i),a=this;r.drawImage(a,0,o[1]*g+n[1],o[0],1,0,i,o[0],1),i--?e.getImage(i,t):(e.applyLookupTable(o[0],o[2]),e.pushToFront(o[0],o[2],s[0],s[2],n[0],n[2]))}var e=this,r=this.bgCanvas.get2DContext(),n=(this.getYOffset(),this.probeXYZ),o=this.metadata.dimensions,s=this.metadata.spacing,i=o[2];i--&&e.getImage(i,t)},o.prototype.applyLookupTable=function(t,e){var r=this.bgCanvas.get2DContext(),n=this.getField(),o=a["default"].getLookupTable(n),s=r.getImageData(0,0,t,e),i=s.data,g=i.length,b=0,l=this.metadata.ranges[n],h=l[1]-l[0];if(o){for(;g>b;){var u=(i[b]+256*i[b+1]+65536*i[b+2])/16777216,c=o.getColor(u*h+l[0]);i[b]=Math.floor(255*c[0]),i[b+1]=Math.floor(255*c[1]),i[b+2]=Math.floor(255*c[2]),b+=4}r.putImageData(s,0,0)}},o.prototype.setField=function(t){this.queryDataModel.setValue("field",t)},o.prototype.getField=function(){return this.queryDataModel.getValue("field")},o.prototype.getLookupTable=function(){return a["default"].getLookupTable(this.getField())},o.prototype.getLookupTableManager=function(){return a["default"]},o.prototype.getFields=function(){return this.metadata.fields},o.prototype.addImageReadyListener=function(t){var e="image-ready-listener-"+ ++this.listenerCount;return this.listeners[e]=t,this.onReadyListeners.push(t),e},o.prototype.removeImageReadyListener=function(t){delete this.listeners[t],this.onReadyListeners=[];for(var e in this.listeners)this.onReadyListeners.push(this.listeners[e])},o.prototype["delete"]=function(){a["default"].removeLookupTableListener(this.onLookupTableChange),this.onLookupTableChange=null,this.queryDataModel.removeDataListener(this.listenerId),this.queryDataModel=null,this.bgCanvas["delete"](),this.bgCanvas=null,this.workImage=null,this.listenerId=null},t.exports=e["default"]},function(t,e,r){"use strict";function n(t){if(t&&t.__esModule)return t;var e={};if(null!=t)for(var r in t)Object.prototype.hasOwnProperty.call(t,r)&&(e[r]=t[r]);return e["default"]=t,e}Object.defineProperty(e,"__esModule",{value:!0});var o=r(2),s=n(o),i=r(3),g=n(i),a=r(4),b=n(a);e.LookupTable=s,e.LookupTableManager=g,e.Presets=b},function(t,e,r){"use strict";function n(){n.init.call(this)}var o={};o.isObject=function(t){return"object"==typeof t&&null!==t},o.isNumber=function(t){return"number"==typeof t},o.isUndefined=function(t){return void 0===t},o.isFunction=function(t){return"function"==typeof t},t.exports=n,n.EventEmitter=n,n.prototype._events=void 0,n.prototype._maxListeners=void 0,n.defaultMaxListeners=10,n.init=function(){this._events=this._events||{},this._maxListeners=this._maxListeners||void 0},n.prototype.setMaxListeners=function(t){if(!o.isNumber(t)||0>t||isNaN(t))throw TypeError("n must be a positive number");return this._maxListeners=t,this},n.prototype.emit=function(t){var e,r,n,s,i,g;if(this._events||(this._events={}),"error"===t&&!this._events.error)throw e=arguments[1],e instanceof Error?e:Error('Uncaught, unspecified "error" event.');if(r=this._events[t],o.isUndefined(r))return!1;if(o.isFunction(r))switch(arguments.length){case 1:r.call(this);break;case 2:r.call(this,arguments[1]);break;case 3:r.call(this,arguments[1],arguments[2]);break;default:for(n=arguments.length,s=new Array(n-1),i=1;n>i;i++)s[i-1]=arguments[i];r.apply(this,s)}else if(o.isObject(r)){for(n=arguments.length,s=new Array(n-1),i=1;n>i;i++)s[i-1]=arguments[i];for(g=r.slice(),n=g.length,i=0;n>i;i++)g[i].apply(this,s)}return!0},n.prototype.addListener=function(t,e){var r;if(!o.isFunction(e))throw TypeError("listener must be a function");if(this._events||(this._events={}),this._events.newListener&&this.emit("newListener",t,o.isFunction(e.listener)?e.listener:e),this._events[t]?o.isObject(this._events[t])?this._events[t].push(e):this._events[t]=[this._events[t],e]:this._events[t]=e,o.isObject(this._events[t])&&!this._events[t].warned){var r;r=o.isUndefined(this._maxListeners)?n.defaultMaxListeners:this._maxListeners,r&&r>0&&this._events[t].length>r&&(this._events[t].warned=!0,o.isFunction(console.error)&&console.error("(node) warning: possible EventEmitter memory leak detected. %d listeners added. Use emitter.setMaxListeners() to increase limit.",this._events[t].length),o.isFunction(console.trace)&&console.trace())}return this},n.prototype.on=n.prototype.addListener,n.prototype.once=function(t,e){function r(){this.removeListener(t,r),n||(n=!0,e.apply(this,arguments))}if(!o.isFunction(e))throw TypeError("listener must be a function");var n=!1;return r.listener=e,this.on(t,r),this},n.prototype.removeListener=function(t,e){var r,n,s,i;if(!o.isFunction(e))throw TypeError("listener must be a function");if(!this._events||!this._events[t])return this;if(r=this._events[t],s=r.length,n=-1,r===e||o.isFunction(r.listener)&&r.listener===e)delete this._events[t],this._events.removeListener&&this.emit("removeListener",t,e);else if(o.isObject(r)){for(i=s;i-->0;)if(r[i]===e||r[i].listener&&r[i].listener===e){n=i;break}if(0>n)return this;1===r.length?(r.length=0,delete this._events[t]):r.splice(n,1),this._events.removeListener&&this.emit("removeListener",t,e)}return this},n.prototype.removeAllListeners=function(t){var e,r;if(!this._events)return this;if(!this._events.removeListener)return 0===arguments.length?this._events={}:this._events[t]&&delete this._events[t],this;if(0===arguments.length){for(e in this._events)"removeListener"!==e&&this.removeAllListeners(e);return this.removeAllListeners("removeListener"),this._events={},this}if(r=this._events[t],o.isFunction(r))this.removeListener(t,r);else if(Array.isArray(r))for(;r.length;)this.removeListener(t,r[r.length-1]);return delete this._events[t],this},n.prototype.listeners=function(t){var e;return e=this._events&&this._events[t]?o.isFunction(this._events[t])?[this._events[t]]:this._events[t].slice():[]},n.listenerCount=function(t,e){var r;return r=t._events&&t._events[e]?o.isFunction(t._events[e])?1:t._events[e].length:0}}]);
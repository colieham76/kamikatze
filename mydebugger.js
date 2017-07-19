"use strict";
const profiler = require('screeps-profiler');
var mydebugger = {
    str: function(str,log=false) {
//        console.log(str);
        /*
            str = Math.floor((Game.cpu.getUsed()-this.start)*1000)/1000+": "+this.obj.name+" "+str;
            if (Game.cpu.getUsed()-this.start - this.lasttime > 1) {
                str = '<span style="color:#FF0000">'+str+'</span>';
            }
            if (log) console.log(str);
            this.messagearray = this.messagearray.concat(new Array(str));
            this.lasttime = Game.cpu.getUsed()-this.start;
        */  
    },
    enable: function(obj = {name: "noName"}) {
        this.start = Game.cpu.getUsed();
        this.lasttime = Game.cpu.getUsed();
        this.messagearray = new Array();
        this.obj = obj;
        this.str("START");
    },
    getStr: function() {
        return this.messagearray;
    },
    end: function(VERBOSE = false) {
        this.str("END");
        if (VERBOSE) {
            for(keys in this.messagearray) {
                console.log(this.messagearray[keys]);
            }
        } else {    
//            console.log(this.messagearray[this.messagearray.length-1]);
        }
    }
};

profiler.registerObject(mydebugger,'mydebugger');
module.exports = mydebugger;
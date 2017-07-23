"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var roleReserver = {
    /** @param {Creep} creep **/
    run: function(creep) {
        creep.reserveController(creep.room.controller);
	}
};
profiler.registerObject(roleReserver,'roleReserver');
module.exports = roleReserver;
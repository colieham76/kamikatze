"use strict";
const profiler = require('screeps-profiler');
var roleHarvesterSimple = {
    /** @param {Creep} creep **/
    run: function(creep) {
        var debug = false;
        // Expects standing at the right position.
        // does repair check every 5 ticks
        // does not build
        // does not renew
        // Wenn ich 10 Work Parts hab, dann bin ich nen 1500er / 3000er Harvester, der nur jeden 2. Tick zuschlagen muss.
        if (creep.getActiveBodyparts(WORK) != 10 || creep.ticksToLive % 2 == 0) {
            let source = Game.getObjectById(creep.memory.target)
            creep.harvest(source);
            if (creep.ticksToLive % 5 == 0)
                creep.repairNearby();
        }
    }
};

profiler.registerObject(roleHarvesterSimple,'roleHarvesterSimple');
module.exports = roleHarvesterSimple;
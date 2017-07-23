"use strict";
const profiler = require('screeps-profiler');
const cachedSearch = require('cachedSearch');
var roleScout = {
    /** @param {Creep} creep **/
    run: function(creep) {
//        creep.suicide();
        var debug = false;
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        let flag = false;
        if (hostiles.length > 0) {
            flag = creep.fleeYouFools();
        }
        if (!flag) {
            let targetpos = new RoomPosition(25,25,creep.memory.target);
            if (creep.pos != targetpos)
                creep.movePredefined(targetpos,{range: 20});   
        }
        if (!creep.room.memory.scouted) {
            cachedSearch.sourcesOfRoom(creep.room.name);
            if (!creep.room.controller) {
                let mineral = creep.room.find(FIND_MINERALS);
                if (mineral.length > 0) {
                    Memory.neutralextractors[creep.room.name] = mineral[0].id;
                }
            }
            creep.room.memory.scouted = true;
        }
        if (creep.room.name == creep.memory.target && Memory.whitelistrooms.indexOf(creep.room.name) === -1) {
            creep.suicide();
        }
    	if (debug) console.log(creep.name + '>' + Game.flags[creep.memory.target].name);
	}
};
profiler.registerObject(roleScout,'roleScout');
module.exports = roleScout;
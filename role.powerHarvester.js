"use strict";
const profiler = require('screeps-profiler');
var rolePowerharvester = {
    /** @param {Creep} creep **/
    run: function(creep) {
//        console.log(creep.name+" is a powerharvester and is in "+creep.room.name);
//        creep.suicide();
        creep.notifyWhenAttacked(false);
        var debug = false;
        let target = false;
        if (debug) console.log('Master, '+creep.name+' ('+creep.memory.role+') reporting for duty!');
        if(creep.room.name == creep.memory.target) {
            if (creep.memory.targetId) {
                target = Game.getObjectById(creep.memory.targetId);
            } else {
                target = creep.room.find(FIND_STRUCTURES, {
                    filter: function(structure) {
                        return ( structure.structureType == STRUCTURE_POWER_BANK)
                    }
                })[0];
                if (target) {
                    creep.memory.targetId = target.id;
                }
            }
            if (target) {
                if(creep.pos.inRangeTo(target, 1)) {
                    creep.attack(target);
                } else {
                    creep.movePredefined(target);
                }
            } else {
                var done = false;
                for(key in Memory.powerRooms) {
                    powerRoom = Memory.powerRooms[key];
                    if (powerRoom != creep.memory.target) {
                        creep.memory.target = powerRoom;
                        done = true;
                    }
                }
                if (!done) {
                    creep.suicide();
                }
            }
        } else {
            creep.movePredefined(new RoomPosition(25,25,creep.memory.target));
        }
	}
};
profiler.registerObject(rolePowerharvester,'rolePowerharvester');
module.exports = rolePowerharvester;
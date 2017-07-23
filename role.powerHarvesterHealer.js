"use strict";
const profiler = require('screeps-profiler');
var rolePowerHarvesterHealer = {
    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log(creep.name+" is a defender and is in "+creep.room.name);
        creep.notifyWhenAttacked(false);
        var debug = false;
        if (debug) console.log('Master, '+creep.name+' ('+creep.memory.role+') reporting for duty!');
        if (creep.pos.roomName != creep.memory.target) {
            creep.movePredefined(new RoomPosition(25,25,creep.memory.target));
        } else {
            if (debug) console.log('Master, I am at target room: '+creep.memory.target);
            let result = creep.Medic();
            if(!result) {
                if (debug) console.log("Master, there is nobody to heal!");
                var squad = creep.pos.findClosestByPath(FIND_MY_CREEPS, {
                    filter: function(unit) {
                        return ((unit.memory.role == 'powerHarvester') && unit.pos.roomName == creep.pos.roomName)
                    }
                });
                if (squad) {
                    if (debug) console.log("Master, I move to squad!");
                    creep.move(creep.pos.getDirectionTo(squad));
                } else {
                    if (debug) console.log("Master, I move to center of targetRoom!");
                    if (creep.memory.target) {
                        creep.movePredefined(new RoomPosition(25,25,creep.memory.target));
                    } else {
                        creep.movePredefined(25,25);
                    }
                }
            }
        }
	}
};
profiler.registerObject(rolePowerHarvesterHealer,'rolePowerHarvesterHealer');
module.exports = rolePowerHarvesterHealer;
"use strict";
const profiler = require('screeps-profiler');
var rolePowerHarvesterHauler = {
    /** @param {Creep} creep **/
    run: function(creep) {
//        console.log(creep.name+" is a powerharvester and is in "+creep.room.name);
//        creep.suicide();
        creep.notifyWhenAttacked(false);
        var debug = false;
        let target = false;
        if (debug) console.log('Master, '+creep.name+' ('+creep.memory.role+') reporting for duty!');
        if(creep.room.name == creep.memory.target || creep.memory.modus) {
            let target = false;
            let range = false;
            creep.memory.modus = creep.memory.modus || 1;
            if (creep.memory.modus == 1) {
                // Modus 1 ... Power-Bank ist noch am Leben, also warten.
                if (!creep.memory.powerBank) {
                    let tmp = creep.room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_POWER_BANK});
                    if (tmp.length == 0) {
                        creep.memory.modus = 2;
                    } else {
                        creep.memory.powerBank = tmp[0].id;
                        target = tmp[0];
                    }
                }
                if (creep.memory.powerBank) {
                    if (!target) target = Game.getObjectById(creep.memory.powerBank);
                    range = 3;
                } 
                if (!target) {
                    creep.memory.modus = 2;
                }
            } 
            if (creep.memory.modus == 2) {
                // Modus 2 ... Power-Bank ist gefallen, Power ist gedroppt, also einladen.
                // Finde dropped power
                if (!creep.memory.power) {
                    let tmp = creep.room.find(FIND_DROPPED_RESOURCES, {filter: s => s.resourceType == RESOURCE_POWER});
                    if (tmp.length == 0) {
                        creep.memory.modus = 4;
                    } else {
                        creep.memory.power = tmp[0].id;
                        target = tmp[0];
                    }
                }
                if (creep.memory.power) {
                    if (!target) target = Game.getObjectById(creep.memory.power);
                    if (target && creep.pos.getRangeTo(target) <= 1)   {
                        creep.pickup(target);
                        creep.memory.modus = 3;
                    }
                    range = 1;
                } 
            }
            if (creep.memory.modus == 3) {
                // Modus 3 ... Power ist eingeladen, also ab nach hause.
                if (!creep.memory.terminal) {
                    let tmp = Game.my.managers.terminals.getAllTerminals();
                    let closest = false;
                    let length = false;
                    for(let terminal in tmp) {
                        let l = Game.my.managers.infrastructure.getRoomPathsLengthSimple(creep.room.name,tmp[terminal].room.name);
                        if (!length || l < length) {
                            length = l;
                            closest = tmp[terminal];
                        }
                        if (closest != false) {
                            creep.memory.terminal = closest;
                            target = closest;
                        }
                    }
                }
                if (creep.memory.terminal) {
                    if (!target) target = Game.getObjectById(creep.memory.terminal);
                    if (target && creep.pos.getRangeTo(target) <= 1)   {
                        creep.transfer(target,RESOURCE_POWER);
                        creep.memory.modus = 4;
                    }
                    range = 1;
                }
            }
            if (creep.memory.modus == 4) {
                // Modus 4 ... Job done, recycle.
                creep.suicide();
                return;
            }
            if (target) {
                creep.movePredefined(target, {range: range});
            }
        } else {
            creep.movePredefined(new RoomPosition(25,25,creep.memory.target));
        }
	}
};
profiler.registerObject(rolePowerHarvesterHauler,'rolePowerHarvesterHauler');
module.exports = rolePowerHarvesterHauler;
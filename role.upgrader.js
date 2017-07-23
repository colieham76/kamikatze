"use strict";
const profiler = require('screeps-profiler');
var roleUpgrader = {
    /** @param {Creep} creep **/
    run: function(creep) {
        var debug = false;
        if (debug) console.log(creep.name + ': reporting');
	    if(_.sum(creep.carry) > creep.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER) {
            if (creep.room.controller.my) {
                if (debug) console.log(creep.name + ': upgrading');
                creep.buildNearby();
                if (creep.upgradeController(creep.room.controller) == ERR_NOT_IN_RANGE) {
                    creep.movePredefined(creep.room.controller, {range: 3});
                }
            }
        }
        let container = Game.getObjectById(creep.room.memory.controllercontainer);
        let link = false;
        if (creep.room.memory.links) {
             link = Game.getObjectById(creep.room.memory.links.controllerlink);
        }
        if (link) {
            if ( _.sum(creep.carry) < creep.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER * 2) {
                if (link.energy > 0) {
                    if(creep.withdraw(link, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.movePredefined(link,{range:1});
                    }
                } else if (container.store[RESOURCE_ENERGY] != 0) {
                    if(creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                        creep.movePredefined(container,{range:1});
                    }
                }
            }
        } else {
            if (_.sum(creep.carry) < creep.getActiveBodyparts(WORK) * UPGRADE_CONTROLLER_POWER * 2 && !creep.hasMoveOrder) {
                if(creep.withdraw(container, RESOURCE_ENERGY) === ERR_NOT_IN_RANGE) {
                    creep.movePredefined(container,{range:1});
                } else {
                    let path = creep.room.memory.upgraderpath;
                    let step = path.findIndex(x => x.x == creep.pos.x && x.y == creep.pos.y && x.roomName == creep.pos.roomName);
                    if (step !== -1) {
                        creep.move(Math.floor(Math.random()*7+1));
                    }
                }
            }
        }
	}
};
profiler.registerObject(roleUpgrader,'roleUpgrader');
module.exports = roleUpgrader;
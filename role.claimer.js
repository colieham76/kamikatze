"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var roleClaimer = {
    /** @param {Creep} creep **/
    run: function(creep) {
        mydebugger.enable(creep);
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        let flag = false;
        if (hostiles.length > 0) {
            flag = creep.fleeYouFools();
        }
        if (!flag) {
            if(creep.memory.target) {
                console.log("Marching all the way to "+creep.memory.target+"!");
                console.log("It's far away I'm in "+creep.pos+"!");
                if(creep.room.name === creep.memory.target && creep.room.controller) {
                    if (creep.pos.inRangeTo(creep.room.controller,1)) {
                        let sign = "Conquered and claimed by a cat - KamiKatze - *mreow*";
                        creep.signController(creep.room.controller, sign);
                        if (creep.claimController(creep.room.controller) == OK) {
                            
                            Memory.claiming.splice(Memory.claiming.indexOf(creep.room.name),1);
                            delete Memory.priorityOfRooms;
                            creep.suicide();
                        }
                    } else {
                        creep.movePredefined(creep.room.controller);    
                    }
                } else {
                    if (creep.memory.target) {
                        if (Game.rooms[creep.memory.target]) {
                            creep.movePredefined(Game.rooms[creep.memory.target].controller);    
                        } else {
                            creep.movePredefined(new RoomPosition(25,25,creep.memory.target));
                        }
                    }
                }
            }
        }
        if(Game.rooms[creep.memory.target])
            Game.rooms[creep.memory.target].visual.circle(Game.rooms[creep.memory.target].controller.pos, {fill: 'transparent', radius: 0.55, stroke: 'DarkRed', strokeWidth: 0.1})
        return mydebugger.getStr();
	}
};
profiler.registerObject(roleClaimer,'roleClaimer');
module.exports = roleClaimer;
"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var roleSquadSiegeReserver = {
    /** @param {Creep} creep **/
    run: function(creep) {
        mydebugger.enable(creep);
        let hostiles = creep.room.find(FIND_HOSTILE_CREEPS);
        let flag = false;
        if (hostiles.length > 0) {
            flag = creep.fleeYouFools();
        }
        if (!flag) {
            mydebugger.str("reserver is alive");
            let mysquad = creep.getMySquad();
            if(creep.room.name === mysquad.targetRoom && creep.room.controller) {
                if (creep.pos.inRangeTo(creep.room.controller,1)) {
                    creep.attackController(creep.room.controller);
                } else {
                    mydebugger.str("reserver move to controller of current room");
                    creep.movePredefined(creep.room.controller);    
                }
            } else {
                mydebugger.str("reserver move to target room's controller");
                if (mysquad.targetRoom) {
                    if (Game.rooms[mysquad.targetRoom]) {
                        creep.movePredefined(Game.rooms[mysquad.targetRoom].controller);    
                    } else {
                        creep.movePredefined(new RoomPosition(25,25,mysquad.targetRoom));
                    }
                }
            }
        }
        return mydebugger.getStr();
	}
};
profiler.registerObject(roleSquadSiegeReserver,'roleSquadSiegeReserver');
module.exports = roleSquadSiegeReserver;
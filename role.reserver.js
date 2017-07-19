"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var roleReserver = {
    /** @param {Creep} creep **/
    run: function(creep) {
        mydebugger.enable(creep);
        if(creep.memory.target) {
            mydebugger.str("reserver is alive");
            if(creep.room.name === creep.memory.target && creep.room.controller) {
                if (creep.pos.inRangeTo(creep.room.controller,1)) {
                    creep.reserveController(creep.room.controller);
                    let sign = "Reserved by a cat - KamiKatze - *mreow*";
                    if (!creep.room.controller.sign || creep.room.controller.sign.text != sign) {
                        creep.signController(creep.room.controller, sign);
                    } else {
                        creep.memory.usesimple = true;
                    }
                } else {
                    mydebugger.str("reserver move to controller of current room");
                    creep.movePredefined(creep.room.controller);    
                }
            } else {
                mydebugger.str("reserver move to target room's controller");
                if (creep.memory.target) {
                    if (Game.rooms[creep.memory.target]) {
                        creep.movePredefined(Game.rooms[creep.memory.target].controller);    
                    } else {
                        creep.movePredefined(new RoomPosition(25,25,creep.memory.target));
                    }
                }
            }
        }
        if(Game.rooms[creep.memory.target])
            Game.rooms[creep.memory.target].visual.circle(Game.rooms[creep.memory.target].controller.pos, {fill: 'transparent', radius: 0.55, stroke: 'LimeGreen', strokeWidth: 0.1})
        return mydebugger.getStr();
	}
};
profiler.registerObject(roleReserver,'roleReserver');
module.exports = roleReserver;
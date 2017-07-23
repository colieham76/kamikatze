"use strict";
const profiler = require('screeps-profiler');
var roleSiegeTank = {
    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log(creep.name+" is a defender and is in "+creep.room.name);
        creep.notifyWhenAttacked(false);
        var debug = false;
        if (debug) console.log('Master, '+creep.name+' ('+creep.memory.role+') reporting for duty!');
        if (debug) console.log('Master, I have a target room: '+mysquad.targetRoom);
        if (creep.memory.squad) {
            let mysquad = creep.getMySquad();
            if (!mysquad) return;
            if (mysquad.modus != "staging") {
                let closeheal = creep.HealMeOrClose();
                let rangedheal = false;
                if (!closeheal) {
                    creep.attackNearby();
                    rangedheal = creep.HealACreepRanged();
                }
                if (!rangedheal) {
                    let res = creep.fireMG();
                }
    
                let takendmg = false;
                if (creep.memory.lastTickHP) {
                    takendmg = creep.memory.lastTickHP - creep.hits;
                    creep.memory.takendmg = Math.max(creep.memory.takendmg, takendmg, 0);
                    creep.say(takendmg);
                }
                creep.memory.lastTickHP = creep.hits;
                if (creep.hits == creep.hitsMax) {
                    creep.memory.takendmg = 0;
                }    
                let target = false;
                if (
                    (!takendmg && creep.hits == creep.hitsMax)
                 || (
                     Game.flags["squad"+creep.memory.squad+"target"].pos.roomName == creep.room.name
                     && (creep.getActiveBodyparts(TOUGH)) * 100 > creep.memory.takendmg  * creep.pos.getRangeTo(creep.pos.findClosestByRange(FIND_EXIT))
                     && !(takendmg == 0 && creep.hits != creep.hitsMax)
                    )
                ) {
                    target = "squad"+creep.memory.squad+"target";
                    if (debug) console.log('Master, moving to targetflag: '+target);
                } else {
                    target = "squad"+creep.memory.squad+"fallback";
                    if (debug) console.log('Master, moving to fallbackflag: '+target);
                }
                if (Game.flags[target]) {
                    creep.movePredefined(Game.flags[target].pos,{avoid: false});
                } else {
                    creep.movePredefined(new RoomPosition(25,25,mysquad.targetRoom),{avoid: false});
                    if (debug) console.log('Master, moving to targetroom: '+target);
                }
            } else {
                if (Game.flags["squad"+creep.memory.squad+"staging"]) {
                    if (debug) console.log('Master, moving to stagingroom: '+Game.flags["squad"+creep.memory.squad+"staging"].pos.roomName);
                    creep.movePredefined(Game.flags["squad"+creep.memory.squad+"staging"].pos);
                } else {
                    creep.movePredefined(new RoomPosition(25,25,mysquad.targetRoom));
                    if (debug) console.log('Master, moving to targetroom: '+target);
                }
            }
        } else {
            creep.moveTo(25,25);
        }
	}
};
profiler.registerObject(roleSiegeTank,'roleSiegeTank');
module.exports = roleSiegeTank;
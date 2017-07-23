"use strict";
const profiler = require('screeps-profiler');
var roleSquadBuddy = {
    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log(creep.name+" is a defender and is in "+creep.room.name);
        creep.notifyWhenAttacked(false);
        var debug = false;
//        if (creep.name == 'squadbuddy-6') {
            debug = true;
//        }
        if (debug) console.log('Master, '+creep.name+' ('+creep.memory.role+') reporting for duty!');
        if (creep.memory.buddy && !Game.creeps[creep.memory.buddy]) {
            delete creep.memory.buddy;
        }
        let mysquad = _.filter(Memory.squads,s => s.squad == creep.memory.squad);
        if (mysquad.length == 0) {
            delete creep.memory.squad;
        } else {
            mysquad = mysquad[0];
        }
        if (creep.getMilitaryBoosted(mysquad,debug)) {
            // returns true, if we need to abort calculation for this troop.
            return;
        }
        if (creep.getActiveBodyparts(HEAL) == 0) {
            creep.movePredefined(creep.pos.findClosestByPath(FIND_MY_CREEPS, {filter: c => c.getActiveBodyparts(HEAL) > 0}));
            return;
        }
        let result = false;
        if (creep.memory.buddy) {
            if (Game.creeps[creep.memory.buddy].room.name == creep.room.name) {
                result = creep.Medic();
                if (debug) console.log("Master, the medic result is: "+result);
                if (result) {
                    if (result.name != creep.name) {
                        creep.memory.tmpbuddy = result.name;
                        creep.memory.tmpbuddytime = Game.time;
                    } else {
                        // i healed myself, so i reset result, so that i move to my buddy
                        // but only if i'm not on a exit tile...
                    }
                }
            } else {
                creep.HealSomebody();
            }
            if (debug) console.log("Master, there is a squad buddy!");
            if (!result)    {
                let targetpos = false;
                let secondleveltargetpos = false;
                if (
                    // there is a tmpbuddy
                    creep.memory.tmpbuddy 
                    // its alive
                    && Game.creeps[creep.memory.tmpbuddy] 
                    // its in the same room
                    && Game.creeps[creep.memory.tmpbuddy].room.name == creep.room.name 
                    // and its not outdated
                    && creep.memory.tmpbuddytime > Game.time - 10 
                    // and its not on an exit
                    && !Game.creeps[creep.memory.tmpbuddy].isOnExit()
                ) {
                    if (debug) console.log("Master, I'll cuddle with my temporary buddy!");
                    targetpos = Game.creeps[creep.memory.tmpbuddy].pos;
                } else {
                    if (debug) console.log("Master, I'll cuddle with my squad buddy!");
                    targetpos = Game.creeps[creep.memory.buddy].pos;
                }
                if (debug) console.log("Master, my cuddle partner is at "+targetpos);
                let range = 0;
                if (targetpos.isExit()) {
                    range = 1;
                }
                result = creep.movePredefined(targetpos,{avoid:false,noShortCuts:true,range:range});
                if (debug) console.log("Master, my movePredefined result is: "+result);
           }
        } else {
            result = creep.Medic();
            // TODO filter auf Game.my.creeps umbauen
            // TODO buddy umbauen auf squadsk > squadskirmisher
            let buddy = _.filter(Game.creeps, (c) => ['squadskirmisher','squadsk','squadboostedskirmisher','squadboostedsk','squadsiegetank'].indexOf(c.memory.role) !== -1 && !c.memory.buddy && c.memory.squad == creep.memory.squad);
            if (buddy.length == 0 && ['combat','fallback'].indexOf(mysquad.modus) !== -1) {
                // combat, my buddy might be dead, so i fill up with somebody else
                buddy = _.filter(Game.creeps, (c) => ['squadskirmisher','squadsk','squadboostedskirmisher','squadboostedsk','squadsiegetank'].indexOf(c.memory.role) !== -1 && c.memory.squad == creep.memory.squad);
            }
            if (buddy.length > 0) {
                buddy[0].memory.buddy = creep.name;
                creep.memory.buddy = buddy[0].name;
            } else {
                if (!result) {
                    let flagname = "squad"+creep.memory.squad+"staging";
                    if (mysquad.modus == "combat")
                        flagname = "squad"+creep.memory.squad+"target";
                    if (Game.flags[flagname]) {
                        creep.movePredefined(Game.flags[flagname],{avoid:false});
                    }
                }
            }
        }
	}
};
profiler.registerObject(roleSquadBuddy,'roleSquadBuddy');
module.exports = roleSquadBuddy;
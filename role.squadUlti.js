"use strict";
const profiler = require('screeps-profiler');
var roleSquadUlti = {
    /** @param {Creep} creep **/
    run: function(creep) {
        //console.log(creep.name+" is a defender and is in "+creep.room.name);
        creep.notifyWhenAttacked(false);
        var debug = false;
        if (creep.memory.squad == 12) {
//            debug = true;
        }
//        if (creep.name == "squadsk-273") debug = true;

        let mysquad = creep.getMySquad();
        let fireMG = creep.fireMG();

        if (debug) console.log('Master, '+creep.name+' ('+creep.memory.role+') reporting for duty! My squad is: '+creep.memory.squad+', and my target room is: '+mysquad.targetRoom);


        if (creep.memory.retreat && creep.getActiveBodyparts(RANGED_ATTACK) >= Math.ceil(_.filter(creep.body, (b) => b.type == RANGED_ATTACK).length/2) ) {
            creep.memory.retreat = false;
        }
        if (creep.memory.buddy) {
            if (!Game.creeps[creep.memory.buddy]) {
                delete creep.memory.buddy
            } else {
/*                if (Game.creeps[creep.memory.buddy].hits < Game.creeps[creep.memory.buddy].hitsMax * 0.75) {
                    creep.memory.retreat = true;
                }*/
            }
        }
        if (creep.getMilitaryBoosted(mysquad,debug)) {
            // returns true, if we need to abort calculation for this troop.
            return;
        }
        if (
            // Och habe das retreat flag
            creep.memory.retreat
            // Oder ich habe keine aktiven RangedAttack, aber ich habe überhaupt RangeAttack
            || (creep.getActiveBodyparts(RANGED_ATTACK) <= 0 && _.filter(creep.body, (b) => b.type == RANGED_ATTACK).length > 0)
            // Oder ich habe einen Safemode Targetroom
            || (Game.rooms[mysquad.targetRoom] && Game.rooms[mysquad.targetRoom].controller && Game.rooms[mysquad.targetRoom].controller.safeMode)
        ) {
            creep.memory.retreat = true;
            let flag = creep.fleeYouFools(debug,true);
            creep.heal(creep);
            if (!flag) {
                if (creep.room.find(FIND_HOSTILE_CREEPS).length != 0 || creep.pos.x >= 48 || creep.pos.y >= 48 || creep.pos.x <= 1 || creep.pos.y <= 1 ) {
                    creep.movePredefined(new RoomPosition(25,25,mysquad.fallbackRoom));
                } else {
                    let squadbuddies = _.filter(Game.my.creeps.squadbuddy,(c) => c.room.name == creep.room.name);
                    if (squadbuddies.length > 0) {
                        creep.movePredefined(creep.pos.findClosestByPath(squadbuddies));
                    }
                }
            }
            creep.say("retreat!");
        } else {
            let target = false;
            if(mysquad.modus == 'combat' && creep.room.name == mysquad.targetRoom) {
                if (debug) console.log('Master, I am at target room: '+mysquad.targetRoom);
                target = creep.findTargetLogic(debug);
            } else {
                if (debug) console.log('Master, I am not at target room: '+mysquad.targetRoom);
                target = creep.findTargetLogic(debug,5);
//                if (!(target instanceof Creep) && !(target instanceof StructureWall)) {
                if (!(target instanceof Creep)) {
                    if (debug) console.log('Master, I am resetting target: '+target);
                    target = false;
                }
            }
            if (debug) console.log('Master, my target in room '+creep.room.name+' is: '+target);
            if (target) {
                if (debug) console.log("has target: "+target.pos);
                if (creep.getActiveBodyparts(ATTACK) == 0) {
                    if (debug) console.log('Master, '+creep.name+' is a ranged one.');
                    if (!fireMG)    creep.HealSomebody();
                    else            creep.HealMeOrClose();
                    let flag = creep.fleeYouFools(debug,true);
                    if (debug) console.log("flee you fools: "+flag);
                    let range = 3;
                    if(target instanceof ConstructionSite) {
                        range = 0;
                    }
                    if(target instanceof Creep) {
                        if (target.getActiveBodyparts(ATTACK) == 0 && target.getActiveBodyparts(RANGED_ATTACK) == 0) {
                            range = 1;
                        }
                    }
                    if(target instanceof Source) {
                        range = 1;
                    }
                    if(target instanceof Structure && target.structureType != STRUCTURE_TOWER) {
                        range = 1;
                    }
                    if(!flag && (!target || target instanceof StructureKeeperLair)) {
                        flag = creep.Medic();;
                        
                    }
                    if (
                        // I did not flee
                        // I did not heal
                        !flag 
                        // Target is not on room change
                        && !target.pos.isExit() 
                    ) {
                        if (
                            // Target is not yet in Range
                            target.pos.getRangeTo(creep) > range
                        ) {
                            if (debug) console.log('Master, Target is not yet in Range: I approach!');
                            if (creep.isOnExit()) {
    //                            if (creep.room.find(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_TOWER && !s.my}).length == 0 || _.filter(fireMG,t=>(!t.structureType || t.structureType != STRUCTURE_WALL)).length == 0) {
                                if (
                                    /* ########################
                                    ###########################
                                    ######### LONGBOW #########
                                    ###########################
                                    ######################## */
                                    // If this is true, i do not enter the room because of longbow tactics.
                                    // If there is no enemy tower, i do not need longbow
                                    creep.room.find(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_TOWER && !s.my && s.energy > 9}).length == 0
                                    // If there is a path to the enemy tower, i do not need longbow
                                    || creep.pos.findClosestByPath(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_TOWER && !s.my})
                                    // if there is nothing in range for my MG, longbow does not work...
                                    || fireMG.length == 0
                                ) {
                                    if (debug) console.log(creep.name+" fires MG: "+fireMG);
                                    creep.say('clear');
                                    creep.moveTo(creep.room.getPositionAt(25,25));
                                }
                            } else {
                                if (
                                    // true means i have to wait for my buddy
                                    mysquad.isSK == false // SKs don't wait for their buddies
                                    && creep.memory.buddy // I have a buddy i can wait for
                                    && Game.creeps[creep.memory.buddy] // my buddy is alive
                                    && (
                                        Game.creeps[creep.memory.buddy].room.name != creep.room.name // and my buddy is not in the same room
                                        || Game.creeps[creep.memory.buddy].pos.getRangeTo(creep) >= 3
                                    )
                                ) {
                                    if (Game.creeps[creep.memory.buddy].room.name == creep.room.name) {
                                        creep.say(Game.creeps[creep.memory.buddy].pos.getRangeTo(creep))
                                    }
                                } else {
                                    creep.movePredefined(target,{range:range, checkIfSave:true, avoid: false, onlyMoveOnCompletePath: false});
                                }
                            }
                        } else if (
                            // Target is inner Range
                            target.pos.getRangeTo(creep) < 3
                            // and we are close to exit
                            && creep.pos.findInRange(FIND_EXIT,2).length > 0
                        ) {
                            console.log('result: '+creep.movePredefined(creep.room.getPositionAt(25,25),{checkIfSave:true, avoid: false, onlyMoveOnCompletePath: false}));
                        }
                        // creep.say('R: '+target.pos.getRangeTo(creep)+'/'+range+' E: '+creep.pos.findInRange(FIND_EXIT,3).length)
                    } else if (creep.isOnExit() && creep.room.find(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_TOWER && !s.my}).length == 0) {
                        creep.movePredefined(creep.room.getPositionAt(25,25));
                    }
                } else {
                    if (debug) console.log('Master, '+creep.name+' is a melee one.');
                    let range = 1;
                    if(target instanceof ConstructionSite) {
                        range = 0;
                    }
                    if (creep.pos.inRangeTo(target,range) && !(target instanceof StructureKeeperLair) && !(target instanceof ConstructionSite)) {
                        if (debug) console.log("melee attack");
                        creep.attack(target);
                    } else {
                        if (!fireMG)    creep.HealSomebody();
                        else            creep.HealMeOrClose();
                        creep.attackNearby(debug);
                        if (creep.isOnExit()) {
                            creep.movePredefined(creep.room.getPositionAt(25,25));
                        } else {
                            if (
                                // true means i have to wait for my buddy
                                mysquad.isSK == false // SKs don't wait for their buddies
                                && creep.memory.buddy // I have a buddy i can wait for
                                && Game.creeps[creep.memory.buddy] // my buddy is alive
                                && (
                                    Game.creeps[creep.memory.buddy].room.name != creep.room.name // and my buddy is not in the same room
                                    || Game.creeps[creep.memory.buddy].pos.getRangeTo(creep) >= 3
                                )
                            ) {
                                console.log(creep.name+' at '+creep.pos+' should wait for his buddy '+creep.memory.buddy+' at '+Game.creeps[creep.memory.buddy].pos);
                            } else {
                                if (debug) console.log("real move to "+target);
        //                                creep.movePredefined(target,{checkIfSave:true});
                                creep.movePredefined(target,{avoid: false});
                            }
                        }
                    }
                }
            } else {
                if (debug) console.log("there is no target");
                let result = false;
                if(creep.room.name == mysquad.targetRoom) {
                    result = creep.Medic();
                } else {
                    creep.HealSomebody();
                }
                if(!result) {
                    creep.attackNearby(debug);
                    if (debug) console.log("there is nothing to heal");
                    if (creep.memory.squad) {
                        if (
                            // true means i have to wait for my buddy
                            mysquad.isSK == false // SKs don't wait for their buddies
                            && creep.memory.buddy // I have a buddy i can wait for
                            && Game.creeps[creep.memory.buddy] // my buddy is alive
                            && (
                                Game.creeps[creep.memory.buddy].room.name != creep.room.name // and my buddy is not in the same room
                                || Game.creeps[creep.memory.buddy].pos.getRangeTo(creep) >= 3
                            )
                            && !creep.isOnExit()
                        ) {
                            console.log(creep.name+' at '+creep.pos+' should wait for his buddy '+creep.memory.buddy+' at '+Game.creeps[creep.memory.buddy].pos);
                        } else {
                            if (mysquad.modus == "combat") {
                                if (Game.flags['squad'+creep.memory.squad+'target']) {
                                    if (debug) console.log("going to target flag");
                                    creep.movePredefined(Game.flags['squad'+creep.memory.squad+'target'], {range: 3}, debug);
                                } else {
                                    if (debug) console.log("going to target room of squad");
                                    creep.movePredefined(new RoomPosition(25,25,mysquad.targetRoom));
                                }
                            } else /* if (["staging","recruiting"].indexOf(mysquad.modus) != -1) */ {
                                if (Game.flags['squad'+creep.memory.squad+'staging']) {
                                    if (debug) console.log("going to staging flag");
                                    creep.movePredefined(Game.flags['squad'+creep.memory.squad+'staging'], {range: 3}, debug);
                                } else {
                                    if (debug) console.log("going to staging room of squad");
                                    creep.movePredefined(new RoomPosition(25,25,mysquad.stagingRoom));
                                }
                            }
                        }
                    }
                }
            }
            if (debug) console.log('Master, roger and out');
        }
	}
};
profiler.registerObject(roleSquadUlti,'roleSquadUlti');
module.exports = roleSquadUlti;
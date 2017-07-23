"use strict";
const profiler = require('screeps-profiler');
var roleHarvester = {
    /** @param {Creep} creep **/
    run: function(creep) {
        var debug = false;
        //if (creep.name == "Bailey")  debug = true;
        //creep.suicide();
        
        if (creep.memory.renew) {
            if (creep.ticksToLive < 1400) {
                // find spawn
                let spawn = creep.pos.findClosestByPath(_.filter(Game.spawns, s=>s.room.name == creep.room.name && s.spawning === null));
                if (spawn) {
                    // goto spawn or get renewed
                    if (creep.pos.isNearTo(spawn)) {
                        spawn.renewCreep(creep);
                    } else {
                        creep.movePredefined(spawn,{range: 1});
                    }
                    return;
                }
            } else {
                creep.memory.renew = false;
            }
        }
        
        if (typeof creep.memory.moving == "undefined") creep.memory.moving = true;
        // Wenn ich 10 Work Parts hab, dann bin ich nen 1500er / 3000er Harvester, der nur jeden 2. Tick zuschlagen muss.
        if (creep.memory.moving || creep.getActiveBodyparts(WORK) != 10 || creep.ticksToLive % 2 == 0) {
            let source = Game.getObjectById(creep.memory.target)
            if (source) {
                source.room.visual.circle(source.pos, {fill: 'transparent', radius: 0.55, stroke: 'LimeGreen', strokeWidth: 0.1})
                if (debug) console.log(creep.name + ": "+JSON.stringify(source.pos));
                var container = false;
                creep.memory.targetPos = source.pos;
                if (creep.memory.targetcontainer) {
                    container = Game.getObjectById(creep.memory.targetcontainer);
                    if (debug) console.log(creep.name + ": found target container: "+JSON.stringify(container.pos)); 
                }
                if (!container) {
                    var top = Math.max(0,source.pos.y-1);
                    var left = Math.max(0,source.pos.x-1);
                    var bottom = Math.min(49,source.pos.y+1);
                    var right = Math.min(49,source.pos.x+1);
                    if (debug) console.log(creep.name + ": looking in : "+top+"/"+left+"/"+bottom+"/"+right); 
                    container = _.filter(source.room.lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true),(l) => l.structure.structureType == STRUCTURE_CONTAINER);
                    if (debug) console.log(creep.name + ": searched for target container: "+JSON.stringify(container)); 
                    if (container.length > 0) {
                        creep.memory.targetcontainer = container[0].structure.id;
                        container = container[0].structure;
                    }
                }
                if (container && container.pos) {
                    creep.movePredefined(container);
                } else {
                    creep.movePredefined(source,{range: 1});
                }
                if (debug) console.log(creep.name + ": wants to harvest "+JSON.stringify(source.pos)); 
                if ((container && creep.pos == container.pos) || creep.pos.inRangeTo(source,1)) {
                    if (creep.ticksToLive < 200 && creep.room.controller.my && creep.room.energyCapacityAvailable < 700) {
                        // this is a remote harvester supporting a small room. it should be renewed, because it will not be rebuilt here.
                        creep.memory.renew = true;
                    } else {
                        creep.memory.renew = false;
                    }
                    creep.memory.moving = false;
                    if (debug) console.log(creep.name + ": harvests "+JSON.stringify(source.pos)); 
                    let result = false;
                    if (_.sum(creep.carry) >= creep.getActiveBodyparts(WORK)*BUILD_POWER) {
                        result = creep.buildNearby();
                    }
                    if (result !== OK) {
                        creep.harvest(source);
                        creep.repairNearby();
                        if (creep.pos.findInRange(FIND_CONSTRUCTION_SITES,3).length == 0 && container instanceof StructureContainer) {
                            if (creep.pos.x == container.pos.x && creep.pos.y == container.pos.y) {
                                creep.memory.usesimple = true;
                            }
                        }
                    }
                }
            } else {
                if (creep.memory.targetPos)
                    creep.movePredefined(new RoomPosition(creep.memory.targetPos.x,creep.memory.targetPos.y,creep.memory.targetPos.roomName), {range: 1});
            }
        }
    }
};

profiler.registerObject(roleHarvester,'roleHarvester');
module.exports = roleHarvester;
"use strict";
const profiler = require('screeps-profiler');
var cachedSearch = require('cachedSearch');
var roleExtractor = {
    /** @param {Creep} creep **/
    run: function(creep) {
        var debug = false;
        // if (creep.name == "Nathan") debug = true;
        if (!creep.memory.target) {
            var targets = creep.room.find(FIND_MINERALS);
            creep.memory.target = targets[0].id;
        }
        let mineral = Game.getObjectById(creep.memory.target);
        if (mineral.mineralAmount == 0) {
            creep.suicide();
        }
        if (mineral) {
            if (_.sum(creep.carry) > 0){
                let target = creep.pos.findInRange(FIND_STRUCTURES, 3, { filter: (s) => s.structureType == STRUCTURE_CONTAINER && _.sum(s.store) < (s.storeCapacity - _.sum(creep.store)) } );
                if (target.length == 0) {
                    target = creep.room.terminal;
                } else {
                    target = target[0];
                }
                if (target) {
                    if (creep.pos.inRangeTo(target,1)) {
                        let key = false;
                        for(key in creep.carry) {
                            if (creep.carry[key] > 0)
                                break;
                        }
                        var result = creep.transfer(target,key);
                    } else {
                        creep.movePredefined(target);
                    }
                }
            } else {
                var extractors = cachedSearch.extractorOfRoom(mineral.pos.roomName);
                var extractor = extractors[0];
                if (extractor && mineral) {
                    if (creep.pos.inRangeTo(extractor,1)) {
                        if(extractor.cooldown == 0) {
                            creep.harvest(mineral);
                        }
                    } else {
                        creep.movePredefined(extractor.pos);
                    }
                }
            }
        }
    }
};
profiler.registerObject(roleExtractor,'roleExtractor');
module.exports = roleExtractor;
"use strict";
const profiler = require('screeps-profiler');
var cachedSearch = require('cachedSearch');

const PICKUP_ENERGY         = 1;
const HARVEST_ENERGY        = 2;
const TRANSFER_ENERGY       = 3;
const REPAIR_STRUCTURE      = 4;
const BUILD_STRUCTURE       = 5;
const UPGRADE_CONTROLLER    = 6;
const HARVEST_EXTRACTOR     = 7;
const TRANSFER_MINERAL      = 8;
const DISMANTLE             = 9;
const PICKUP_POWER          = 10;
const PICKUP_MINERAL        = 12;
const GET_BOOSTED           = 13;

var roleZombie = {
    /** @param {Creep} creep **/
    run: function(creep) {
        var debug = false;
        let targetPos = false;
        let stillAZombie = true;
//        console.log(creep.name);
        if (creep.name == "slave-71") {
            debug = true;
        }
        if (_.sum(creep.carry) == 0 && creep.ticksToLive < 100) {
            creep.suicide();
        }
        if (creep.carryCapacity == 0) {
            creep.moveTo(Game.spawns[cachedSearch.nearbySpawn(creep.room.name,creep.pos.x,creep.pos.y)]);
            return;
        }
        let flag = false;
        creep.repairNearby(debug);
//        creep.pickupEnergyNearby(debug);
//        creep.buildNearby();
//        creep.dismantleNearby();
        if (!flag) {
            let job = false;
            if (creep.memory.job)
                job = Memory.jobs[Game.my.managers.jobFinder.getQueueForJobtype(Game.my.managers.jobFinder.getJobtypeFromID(creep.memory.job))][creep.memory.job]
            if (!creep.isOnExit() && creep.pos.inRangeTo(creep.memory.zombie.target,creep.memory.zombie.range) || 
                (
                    !job ||
                    job.x != creep.memory.zombie.target.x ||
                    job.y != creep.memory.zombie.target.y ||
                    job.roomName != creep.memory.zombie.target.roomName
                )) {
                // I'm in range, I'm not an zombie anymore!
                if (debug) console.log("'I'm in range, I'm not an zombie anymore!' said "+creep.name);
                delete creep.memory.zombie;
                stillAZombie = false;
            } else {
                // I'm not yet there - zombie mode!
                let range = creep.memory.zombie.range;
                if (creep.isOnExit()) {
                    range = 1;
                }
                creep.movePredefined(new RoomPosition(creep.memory.zombie.target.x,creep.memory.zombie.target.y,creep.memory.zombie.target.roomName),{range: range});
            }
        }
//        creep.say("BRAINZ!!!",true); 
        return stillAZombie;
	}
};
profiler.registerObject(roleZombie,'roleZombie');
module.exports = roleZombie;
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
const SCOUT           = 14;

var roleSlave = {
    /** @param {Creep} creep **/
    pickup_energy: function(creep,myjob) {
        let deletejob = false;
        let deletemyjob = false;
        if (_.sum(creep.carry) == creep.carryCapacity) {
            deletemyjob = true;
        } else {
            let target = new RoomPosition(myjob.x,myjob.y,myjob.roomName);
            if (creep.pos.roomName == target.roomName && creep.pos.inRangeTo(target,1) && !creep.isOnExit()) {
                let flag = creep.pickupEnergyNearby(); // flag is true if there is something to pickup
                if (!flag) {
                    let stuff = target.look()		// collection of things at our potential target
                    for(let key in stuff) {
                        if(stuff[key].structure && stuff[key].structure.store && (stuff[key].structure.store[RESOURCE_ENERGY] > 200 || stuff[key].structure.store[RESOURCE_ENERGY] > creep.carryCapacity)) {
                            creep.withdraw(stuff[key].structure,RESOURCE_ENERGY);
                            flag = true;        // flag is true if we withdrawn something
                        }
                    }
                }
                if (!flag || _.sum(creep.carry)>(creep.carryCapacity-10)) {
                    deletejob = true;
                }
            } else {
                creep.movePredefined(target, {range: 1});
                creep.memory.zombie = {
                    target: target,
                    range: 1
                };
            }
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    pickup_mineral: function(creep,myjob) {
        let debug = false;
        var deletejob = false;
        var deletemyjob = false;
        if (debug) console.log(creep.name+" has a pickupjob: "+myjob.jobkey+" "+myjob.meta2);
        if (_.sum(creep.carry) >= creep.carryCapacity * 0.5){
            deletemyjob = true;
        } else {
            let mineral = Game.getObjectById(myjob.meta);
            if (mineral) {
                if (creep.pos.roomName == mineral.pos.roomName && creep.pos.inRangeTo(mineral,1) && !creep.isOnExit()) {
                    if (mineral.store) {
                    // storages, terminal etc
                        deletemyjob = true;
                        if (myjob.meta2 == 0) {
                            console.log(creep.name+' > pickup_mineral > meta 2 == 0');
                            let key = false;
                            let found = false;
                            if (debug) console.log("checking for general job in this room");
                            let jobkey = myjob.roomName+"$"+myjob.x+"x"+myjob.y+"$8";
                            var potentialJobs = _.filter(Memory.jobs["TRANSFER_MINERAL"], (job) => (job.jobtype == TRANSFER_MINERAL && job.meta2 == 0 && job.roomName == creep.room.name && job.jobkey != jobkey));
                            if (debug) console.log("found: "+potentialJobs.length);
                            if(potentialJobs.length > 0 || !creep.room.isMine()) {
                                deletemyjob = false;
                                if (creep.room.isMine()) {
                                    creep.memory.job = potentialJobs[0].jobkey;
                                }
                                key = mineral.getStoreHighestMineral();
                            } else {
                                if (debug) console.log("checking for specific jobs in this room");
                                for(key in mineral.store) {
                                    if (key != RESOURCE_ENERGY) {
                                        var potentialJobs = _.filter(Memory.jobs["TRANSFER_MINERAL"], (job) => (job.jobtype == TRANSFER_MINERAL && job.meta2 == key && job.roomName == creep.room.name && job.assigned.length <= 1));
                                        if (debug) console.log('pickup mineral looking for '+key+" transfer jobs... found: "+potentialJobs.length);
                                        if (potentialJobs.length > 0) {
                                            deletemyjob = false;
                                            creep.memory.job = potentialJobs[0].jobkey;
                                            found = true;
                                            break;
                                        }
                                    }
                                }
                            }
/*                            if (!found) {
                                for(key in mineral.store) {
                                    if (key != RESOURCE_ENERGY) {
                                        found = true;
                                        break;
                                    }
                                }
                            }*/
                            if (found) {
                                creep.withdraw(mineral,key);
                                deletemyjob = true;
                            } else {
                                deletejob = true;
                            }
                        } else {
                            // either we have meta2 as number, than its a container somewhere
                            if (_.isNumber(myjob.meta2)) {
                                console.log(creep.name+' > pickup_mineral > meta 2 == isNumber');
                                let key = false;
                                key = mineral.getStoreHighestMineral();
                                if (!key) {
                                    // this resource is not their anymore...
                                    deletejob = true;
                                } else {
                                    creep.withdraw(mineral,key);
                                    deletemyjob = true;
                                }
                            } else {
                                console.log(creep.name+' > pickup_mineral > meta 2 == else');
                                // or we have a string, than its a requested mineral for labs
                                if(mineral.store[myjob.meta2] > 0) {
                                    var potentialJobs = _.filter(Memory.jobs["TRANSFER_MINERAL"], (job) => (job.jobtype == TRANSFER_MINERAL && job.meta2 == myjob.meta2 && job.roomName == creep.room.name && job.assigned.length <= 1));
                                    if (debug) console.log(" found: "+potentialJobs.length);
                                    if (potentialJobs.length > 0) {
                                        creep.withdraw(mineral,myjob.meta2);
                                        deletemyjob = true;
                                    } else {
                                        deletejob = true;
                                    }
                                } else {
                                    deletejob = true;
                                }
                            }
                        }
                    } else if (mineral.mineralType) {
                        // labs
                        if (debug) console.log("creep is trying to withdraw");
                        if (debug) console.log(myjob.meta2);
                        if (myjob.meta2 == 0 || myjob.meta2 == 'all') {
                            if (debug) console.log("yay");
                            creep.withdraw(mineral,mineral.mineralType);
                            deletejob = true;
                        } else {
                            let amount = Math.min(mineral.mineralAmount-1000,creep.carryCapacity-_.sum(creep.carry));
                            if (amount > 0)
                                creep.withdraw(mineral,mineral.mineralType,amount);
                            else 
                                deletejob = true;
                            deletemyjob = true;
                        }
                    } else {
                        // laying around
                        creep.pickup(mineral);
                        if (_.sum(creep.carry)+mineral.amount >= creep.carryCapacity){
                            deletemyjob = true;
                        } else {
                            deletejob = true;
                        }
                    }
                } else {
                    creep.movePredefined(mineral,{range: 1});
                    creep.memory.zombie = {
                        target: mineral.pos,
                        range: 1
                    };
                }
            } else {
                deletemyjob = true;
            }
        }
        if (debug) console.log(deletemyjob+" deletemyjob");
        if (debug) console.log(deletejob+" deletejob");
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    pickup_power: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        if (_.sum(creep.carry) == creep.carryCapacity){
            deletemyjob = true;
        } else {
            if (!creep.memory.target) {
                energy = Game.getObjectById(myjob.meta);
                if (energy) {
                    creep.memory.target = energy.pos;
                }
            }
            if (creep.memory.target) {
                if (creep.pos.inRangeTo(new RoomPosition(creep.memory.target.x,creep.memory.target.y,creep.memory.target.roomName),1) && !creep.isOnExit()) {
                    var energy = creep.room.find(FIND_DROPPED_RESOURCES, {
                        filter: function(resource) {
                            return (resource.resourceType === RESOURCE_POWER)
                        }
                    });
                    if (energy.length > 0) {
                        creep.pickup(energy[0]);
                        Game.notify("Master, a slave named "+creep.name+" found power! "+JSON.stringify(energy[0]));
                        deletemyjob = true;
                    } else {
                        // is there a powerbank?
                        var energy = creep.room.find(FIND_STRUCTURES, {
                            filter: function(s) {
                                return (s.structureType === STRUCTURE_POWER_BANK)
                            }
                        });
                        if (energy.length > 0) {
                            Game.notify("Master, a slave named "+creep.name+" found a power bank! "+JSON.stringify(energy[0]));
                        } else {
                            deletejob = true;
                        }
                    }
                } else {
                    let target = new RoomPosition(creep.memory.target.x,creep.memory.target.y,creep.memory.target.roomName);
                    creep.movePredefined(target,{range: 1})
                    creep.memory.zombie = {
                        target: target,
                        range: 1
                    };
                }
            } else {
                deletejob = true;
            }
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    harvest_energy: function(creep,myjob) {
        let debug = false;
        var deletejob = false;
        var deletemyjob = false;
        if (_.sum(creep.carry) == creep.carryCapacity){
            deletejob = true;
        } else {
            let source = Game.getObjectById(myjob.meta);
            if (source) {
                if (creep.pos.inRangeTo(source,2) && !creep.isOnExit()) {
                    var top = Math.max(0,source.pos.y-1);
                    var left = Math.max(0,source.pos.x-1);
                    var bottom = Math.min(49,source.pos.y+1);
                    var right = Math.min(49,source.pos.x+1);
                    let pickupObj = false;
                    creep.room.lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true).forEach(function(lookObject) {
                        if(lookObject.structure.structureType == STRUCTURE_CONTAINER && lookObject.structure.store[RESOURCE_ENERGY] > 0) {
                            pickupObj = lookObject.structure;
                        }
                    });
                    if (pickupObj) {
                        creep.withdraw(pickupObj,RESOURCE_ENERGY);
                    }
                }
                if(source.energy == 0) {
                    if (debug) console.log("harvest job gets deleted by "+creep.name+"': "+JSON.stringify(source.energy)+"/"+JSON.stringify(source.pos));
                    deletejob = true;
                } else {
                    if (creep.pos.inRangeTo(source,1)) {
                        creep.harvest(source);
                    } else {
                        creep.movePredefined(source.pos,{range: 1});
                        creep.memory.zombie = {
                            target: source.pos,
                            range: 1
                        };
                    }
                }
            } else {
                creep.movePredefined(new RoomPosition(myjob.x,myjob.y,myjob.roomName));
            }
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    dismantle: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        if (_.sum(creep.carry) == creep.carryCapacity || creep.hits != creep.hitsMax){
            deletemyjob = true;
        } else {
            let target = Game.getObjectById(myjob.meta);
            if (target) {
                if (creep.pos.inRangeTo(target,1) && !creep.isOnExit()) {
                    creep.dismantle(target);
                } else {
                    creep.movePredefined(target.pos, {range: 1});
                    creep.memory.zombie = {
                        target: target.pos,
                        range: 1
                    };
                }
            } else {
                deletejob = true;
            }
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    transfer_mineral: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        let target = Game.getObjectById(myjob.meta);
        if (target.structureType != STRUCTURE_TERMINAL && target.structureType != STRUCTURE_STORAGE && target.structureType != STRUCTURE_LAB && target.structureType != STRUCTURE_POWER_SPAWN) {
            deletejob = true;
        } else {
            if (target.structureType == STRUCTURE_LAB && target.mineralAmount >= 2000) {
                deletejob = true;
            } else if (target.structureType == STRUCTURE_POWER_SPAWN && target.power >= target.powerCapacity) {
                deletejob = true;
            } else {
                if (creep.pos.inRangeTo(target,1) && !creep.isOnExit()) {
                    let mineral = false;
                    for(let key in creep.carry) {
                        if (key != RESOURCE_ENERGY && (myjob.meta2 == 0 || myjob.meta2 == key)) {
                            mineral = key;
                            break;
                        }
                    }
                    if (mineral) {
                        if (target.structureType == STRUCTURE_LAB) {
                            let amount = Math.min(Math.max(1000 - target.mineralAmount,0),creep.carry[target.mineralType]);
                            var result = creep.transfer(target,mineral,amount);
                        } else if (target.structureType == STRUCTURE_POWER_SPAWN) {
                            var result = creep.transfer(target,RESOURCE_POWER);
                        } else {    
                            var result = creep.transfer(target,mineral);
                        }
                    } 
                    deletemyjob = true;
                } else {
                    creep.movePredefined(target, {range: 1});
                    creep.memory.zombie = {
                        target: target.pos,
                        range: 1
                    };
                }
            }
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    transfer_energy: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        creep.pickupEnergyNearby();
        if(typeof Game.rooms[myjob.roomName].storage != 'undefined' && Game.rooms[myjob.roomName].storage.structureType == STRUCTURE_STORAGE && Game.rooms[myjob.roomName].storage.my) {
            creep.buildNearby();
        }
        if (creep.carry[RESOURCE_ENERGY] == 0) {
            deletemyjob = true;
        }
        let target = Game.getObjectById(myjob.meta);
        if (target) {
            if (target.structureType != STRUCTURE_STORAGE && target.structureType != STRUCTURE_TERMINAL && target.structureType != STRUCTURE_CONTAINER && target.energy == target.energyCapacity) {
                deletejob = true;
            } else if (_.sum(target.store) == target.storeCapacity) {
                deletejob = true;
            } else {
                if (creep.pos.inRangeTo(target,1) && !creep.isOnExit()) {
                    var result = creep.transfer(target,RESOURCE_ENERGY);
                    deletemyjob = true;
                    // TODO wenns voll sein wird, löschen.
                    if(target.structureType == STRUCTURE_EXTENSION) {
                        deletejob = true;
                    }
                } else {
                    if (creep.room.memory.links && creep.room.memory.links.borderlinks) {
                        for(let key in creep.room.memory.links.borderlinks) {
                            let borderlink = Game.getObjectById(creep.room.memory.links.borderlinks[key]);
                            if (borderlink && creep.pos.inRangeTo(borderlink,1)) {
                                if (creep.transfer(borderlink,RESOURCE_ENERGY) == OK) {
                                    if (creep.carry[RESOURCE_ENERGY] <= 800)
                                        deletemyjob = true;
                                }
                            } 
                        }
                    }
                    creep.movePredefined(target,{range:1});
                }
            }
        } else {
            deletejob = true;
        }
        if (deletejob) {
            Game.my.managers.jobFinder.fillJobQueueTransferEnergy(creep.room);
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    repair: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        let debug = false;
        if (!myjob.meta) {
            // Ein Gebäude wurde gebaut, und der Job ohne ID angelegt. Wir müssen die ID recovern anhand der Pos.
            let structs = new RoomPosition(myjob.x,myjob.y,myjob.roomName).lookFor(LOOK_STRUCTURES);
            //console.log(JSON.stringify(structs));
            for(let key in structs) {
                if (structs[key].hits < structs[key].hitsMax) {
                    myjob.meta = structs[key].id;
                    if (debug) console.log("repairing by coords instead of ID");
                }
            }
        }
        let target = Game.getObjectById(myjob.meta);
        if (target) {
            if (target.hits >= target.hitsMax) {
                deletejob = true;
            } else {
                if (creep.pos.inRangeTo(target,3)  && !creep.isOnExit()) {
                    myjob.meta2 = target.hits;
                    var result = creep.repair(target);
                    if(result != OK) {
                        deletemyjob = true;
                    }
                } else {
                    creep.movePredefined(target, {range: 3});
                    creep.memory.zombie = {
                        target: target.pos,
                        range: 3
                    };
                }
            }
        } else {
            deletejob = true;
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    build_structure: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        let target = Game.getObjectById(myjob.meta);
        if (target) {
            if (!creep.isOnExit()) {
                if (creep.pos.inRangeTo(target,3)) {
                    creep.pickupEnergyNearby();
                    if (creep.room.isMineClaimed() && creep.room.storage && creep.room.storage.pos.inRangeTo(target,3) && creep.room.storage.store[RESOURCE_ENERGY] > 50000) {
                        creep.movePredefined(creep.room.storage, {range: 1});
                        if (creep.pos.inRangeTo(creep.room.storage,1) && _.sum(creep.carry) < creep.getActiveBodyparts(WORK)*BUILD_POWER*2) {
                            creep.withdraw(creep.room.storage,RESOURCE_ENERGY);
                        }
                    }
                    creep.cancelOrder('repair');
                    var result = creep.build(target);
                    
                    if(result == ERR_NOT_ENOUGH_RESOURCES) {
                        deletemyjob = true;
                    }
                    if (target.structureType == STRUCTURE_RAMPART) {
                        deletemyjob = false;
                        deletejob = false;
                        // create job for repairing this rampart
                        // assign this job to me.
                        let key = Game.my.managers.jobFinder.addJobIfNotExists(REPAIR_STRUCTURE,creep.room.name,target.pos.x,target.pos.y,false);
                        creep.memory.job = key;
                    }
                } else {
                    creep.movePredefined(target, {range: 3});
                    creep.memory.zombie = {
                        target: target.pos,
                        range: 3
                    };
                }
            } else {
                creep.movePredefined(target, {range: 1});
            }
        } else {
            deletejob = true;
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    upgrade_controller: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        let target = Game.getObjectById(myjob.meta);
        if (creep.pos.inRangeTo(target,3) && !creep.isOnExit()) {
            var result = creep.upgradeController(target);
            if(result == ERR_NOT_ENOUGH_RESOURCES) {
                deletemyjob = true;
            }
        } else {
            creep.movePredefined(target,{range: 3});
            creep.memory.zombie = {
                target: target.pos,
                range: 3
            };            
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    getboosted: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        let target = Game.getObjectById(myjob.meta);
        if (target.mineralAmount < 300) {
            deletemyjob = true;
            deletejob = true;
        } else {
            if (creep.pos.inRangeTo(target,1) && !creep.isOnExit()) {
                var result = target.boostCreep(creep);
                deletemyjob = true;
                deletejob = true;
            } else {
                creep.movePredefined(target, {range: 1});
            }
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
    scout: function(creep,myjob) {
        var deletejob = false;
        var deletemyjob = false;
        let pos = new RoomPosition(25,25,myjob.roomName);
        if (creep.pos.inRangeTo(pos,20)) {
            deletejob = true;
            deletemyjob = true;
        } else {
            creep.movePredefined(pos,{range: 20});
            creep.memory.zombie = {
                target: pos,
                range: 20
            };            
        }
        return {deletemyjob: deletemyjob, deletejob: deletejob};
    },
                           
    run: function(creep) {
        var debug = false;
        if (creep.name == "slave-505") {
            debug = true;
        }
        if (debug) {
            console.log(creep.memory.job);
        }
        if (_.sum(creep.carry) == 0 && creep.ticksToLive < 100) {
            creep.suicide();
        }
        if (creep.carryCapacity == 0 || creep.getActiveBodyparts(WORK) == 0) {
            creep.moveTo(Game.spawns[cachedSearch.nearbySpawn(creep.room.name,creep.pos.x,creep.pos.y)]);
            return;
        }
        creep.repairNearby(debug);
        if (!creep.memory.job) {
            console.log(creep.name+' > has no job');
//            Memory.showJobReport = true;
            let start = Game.cpu.getUsed();
            Game.my.managers.jobFinder.giveMeAJob(creep);
//            Memory.showJobReport = false;
            let duration = Game.cpu.getUsed()-start;
            console.log(creep.name+' > ('+duration.toFixed(2)+') has now a job? '+creep.memory.job);
        }
        if (creep.memory.job) {
            let deletejob = false;
            let deletemyjob = false;
            Memory.jobs[Game.my.managers.jobFinder.getQueueForJobtype(Game.my.managers.jobFinder.getJobtypeFromID(creep.memory.job))] = Memory.jobs[Game.my.managers.jobFinder.getQueueForJobtype(Game.my.managers.jobFinder.getJobtypeFromID(creep.memory.job))] || {};
            if (Memory.jobs[
                Game.my.managers.jobFinder.getQueueForJobtype(
                    Game.my.managers.jobFinder.getJobtypeFromID(creep.memory.job)
                )
            ][creep.memory.job]) {
                if (debug) console.log(creep.memory.job + " is assigned to a slave named " + creep.name);
                var myjob = Memory.jobs[
                    Game.my.managers.jobFinder.getQueueForJobtype(
                        Game.my.managers.jobFinder.getJobtypeFromID(creep.memory.job)
                    )
                ][creep.memory.job];
//                    creep.say(Game.my.managers.jobFinder.jobtypeToText(myjob.jobtype));
                creep.say(Game.my.managers.jobFinder.jobtypeToIcon(myjob.jobtype)+(creep.memory.roomslave?" R":"")+" "+_.sum(creep.carry)+"/"+creep.carryCapacity);
                let result = {deletejob: false, deletemyjob: false};
                if (myjob.jobtype == PICKUP_ENERGY) {
                    result = this.pickup_energy(creep,myjob);
                } else if (myjob.jobtype == PICKUP_MINERAL) {
                    result = this.pickup_mineral(creep,myjob);
                } else if (myjob.jobtype == PICKUP_POWER) {
                    result = this.pickup_power(creep,myjob);
                } else if (myjob.jobtype == HARVEST_ENERGY) {
                    result = this.harvest_energy(creep,myjob);
                } else if (myjob.jobtype == DISMANTLE) {
                    result = this.dismantle(creep,myjob);
                } else if (myjob.jobtype == TRANSFER_MINERAL) {
                    result = this.transfer_mineral(creep,myjob);
                } else if (myjob.jobtype == TRANSFER_ENERGY) {
                    result = this.transfer_energy(creep,myjob);
                } else if (myjob.jobtype == REPAIR_STRUCTURE) {
                    result = this.repair(creep,myjob);
                } else if (myjob.jobtype == BUILD_STRUCTURE) {
                    result = this.build_structure(creep,myjob);
                } else if (myjob.jobtype == UPGRADE_CONTROLLER) {
                    result = this.upgrade_controller(creep,myjob);
                } else if (myjob.jobtype == GET_BOOSTED) {
                    result = this.getboosted(creep,myjob);
                } else if (myjob.jobtype == SCOUT) {
                    result = this.scout(creep,myjob);
                }
                deletejob   = result.deletejob;
                deletemyjob = result.deletemyjob;
                if (deletejob || deletemyjob) {
                    if (debug) {
                        console.log(creep.name+' > deletejob: '+deletejob);
                        console.log(creep.name+' > deletemyjob: '+deletemyjob);
                    }
                    if (!deletemyjob || deletejob) {
                        if(Game.flags[creep.memory.job]) {
                            Game.flags[creep.memory.job].remove();
                        }
                        delete Memory.jobs[Game.my.managers.jobFinder.getQueueForJobtype(Game.my.managers.jobFinder.getJobtypeFromID(creep.memory.job))][creep.memory.job]
                        for(let key in myjob.assigned) {
                            if (Game.creeps[myjob.assigned[key]]) {
                                delete Game.creeps[myjob.assigned[key]].memory.job;
                            }
                        }
                    } else {
                        myjob.assigned.splice(myjob.assigned.indexOf(creep.name),1)
                        delete creep.memory.job;                    
                    }
                    delete creep.memory.target;
                }
            } else {
                delete creep.memory.job;
            }
        }
	}
};
profiler.registerObject(roleSlave,'roleSlave');
module.exports = roleSlave;
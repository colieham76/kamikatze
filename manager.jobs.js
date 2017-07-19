"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');

const PICKUP_ENERGY         = 1;
const HARVEST_ENERGY        = 2;
const TRANSFER_ENERGY       = 3;
const REPAIR_STRUCTURE      = 4;
const BUILD_STRUCTURE       = 5;
const UPGRADE_CONTROLLER    = 6;
const TRANSFER_MINERAL      = 8;
const DISMANTLE             = 9;
const PICKUP_POWER          = 10;
const PICKUP_MINERAL        = 12;
const GET_BOOSTED           = 13;
const SCOUT                 = 14;


const FLAGCOLOR_PICKUP_ENERGY         = COLOR_PURPLE;
const FLAGCOLOR_HARVEST_ENERGY        = COLOR_GREEN;
const FLAGCOLOR_TRANSFER_ENERGY       = COLOR_BLUE;
const FLAGCOLOR_REPAIR_STRUCTURE      = COLOR_YELLOW;
const FLAGCOLOR_BUILD_STRUCTURE       = COLOR_YELLOW;
const FLAGCOLOR_UPGRADE_CONTROLLER    = COLOR_ORANGE;
//const FLAGCOLOR_HARVEST_EXTRACTOR     = COLOR_GREEN;
const FLAGCOLOR_TRANSFER_MINERAL      = COLOR_BLUE;
const FLAGCOLOR_DISMANTLE             = COLOR_ORANGE;
const FLAGCOLOR_PICKUP_POWER          = COLOR_PURPLE;
//const FLAGCOLOR_HARVEST_INTO_CONTAINER= COLOR_GREEN;
const FLAGCOLOR_PICKUP_MINERAL          = COLOR_RED;
const FLAGCOLOR_GET_BOOSTED          = COLOR_ORANGE;
const FLAGCOLOR_SCOUT                   = COLOR_GREEN;

var jobFinder = {
    slaves : new Array(),
    report: function() {
        if (Memory.showJobReport === false) {
            delete Memory.jobvisuals;
            return false;
        }
        for(let room in Memory.jobvisuals) {
            for(let key in Memory.jobvisuals[room]) {
                let vis = Memory.jobvisuals[room][key];
                let color = "#FF0000";
                // TODO
                if (vis.jobkey && Memory.jobs[jobFinder.getQueueForJobtype(jobFinder.getJobtypeFromID(vis.jobkey))][vis.jobkey]) {
                    if (Memory.jobs[jobFinder.getQueueForJobtype(jobFinder.getJobtypeFromID(vis.jobkey))][vis.jobkey].assigned.length > 0) {
                        color = "#12ba00";
                    }
                    new RoomVisual(room).text(vis.text,vis.x,vis.y,{color:color});
                }
            }
        }
        console.log(' --- JOBS ---');
        let report = {};
        for(let queue in Memory.jobs) {
            queue = Memory.jobs[queue];
            for (let job in queue) {
                job = queue[job];
                report[job.jobtype] = report[job.jobtype] || {};
                report[job.jobtype].assigned = report[job.jobtype].assigned || 0;
                report[job.jobtype].assigned += job.assigned.length;
                report[job.jobtype].jobs = report[job.jobtype].jobs || 0;
                report[job.jobtype].jobs ++;
            }
        }
        for (let jobtype in report) {
            console.log("JobType "+this.jobtypeToText(jobtype)+" ("+this.jobtypeToIcon(jobtype)+")\t is assigned \t"+report[jobtype].assigned+" times of \t"+report[jobtype].jobs+" jobs");
        }
        var slaves = _.filter(Game.my.creeps.slave, (creep) => !creep.memory.job && !creep.spawning);
        var haulers = _.filter(Game.my.creeps.hauler, (creep) => !creep.memory.job && !creep.spawning);
        console.log(' --- ');
        console.log(slaves.length +" Slaves without a job");
        for (let key in slaves) {
            let slave = slaves[key];
            console.log(slave.name+" in "+slave.pos.roomName+" is roomslave: "+slave.memory.roomslave+" with carry "+JSON.stringify(slave.carry));
        }
        console.log(haulers.length +" Haulers without a job");
        for (let key in haulers) {
            let hauler = haulers[key];
            console.log(hauler.name+" in "+hauler.pos.roomName+" with carry "+JSON.stringify(hauler.carry));
        }
    },
    /** @param {Creep} creep **/
    jobtypeToFlagcolor: function(jobtype) {
        if (jobtype == PICKUP_ENERGY) return FLAGCOLOR_PICKUP_ENERGY;
        if (jobtype == HARVEST_ENERGY) return FLAGCOLOR_HARVEST_ENERGY;
        if (jobtype == TRANSFER_ENERGY) return FLAGCOLOR_TRANSFER_ENERGY;
        if (jobtype == REPAIR_STRUCTURE) return FLAGCOLOR_REPAIR_STRUCTURE;
        if (jobtype == BUILD_STRUCTURE) return FLAGCOLOR_BUILD_STRUCTURE;
        if (jobtype == UPGRADE_CONTROLLER) return FLAGCOLOR_UPGRADE_CONTROLLER;
//        if (jobtype == HARVEST_EXTRACTOR) return FLAGCOLOR_HARVEST_EXTRACTOR;
        if (jobtype == TRANSFER_MINERAL) return FLAGCOLOR_TRANSFER_MINERAL;
        if (jobtype == DISMANTLE) return FLAGCOLOR_DISMANTLE;
        if (jobtype == PICKUP_POWER) return FLAGCOLOR_PICKUP_POWER;
//        if (jobtype == HARVEST_INTO_CONTAINER) return FLAGCOLOR_HARVEST_INTO_CONTAINER;
        if (jobtype == PICKUP_MINERAL) return FLAGCOLOR_PICKUP_MINERAL;
        if (jobtype == GET_BOOSTED) return FLAGCOLOR_GET_BOOSTED;
        if (jobtype == SCOUT) return FLAGCOLOR_SCOUT;
    },

    jobtypeToText : function(jobtype) {
        if (jobtype == PICKUP_ENERGY) return "PICKUP_ENERGY";
        if (jobtype == HARVEST_ENERGY) return "HARVEST_ENERGY";
        if (jobtype == TRANSFER_ENERGY) return "TRANSFER_ENERGY";
        if (jobtype == REPAIR_STRUCTURE) return "REPAIR_STRUCTURE";
        if (jobtype == BUILD_STRUCTURE) return "BUILD_STRUCTURE";
        if (jobtype == UPGRADE_CONTROLLER) return "UPGRADE_CONTROLLER";
//        if (jobtype == HARVEST_EXTRACTOR) return "HARVEST_EXTRACTOR";
        if (jobtype == TRANSFER_MINERAL) return "TRANSFER_MINERAL";
        if (jobtype == DISMANTLE) return "DISMANTLE";
        if (jobtype == PICKUP_POWER) return "PICKUP_POWER";
//        if (jobtype == HARVEST_INTO_CONTAINER) return "HARVEST_INTO_CONTAINER";
        if (jobtype == PICKUP_MINERAL) return "PICKUP_MINERAL";
        if (jobtype == GET_BOOSTED) return "GET_BOOSTED";
        if (jobtype == SCOUT) return "SCOUT";
        return jobtype;
    },

    jobtypeToIcon : function(jobtype) {
        if (jobtype == PICKUP_ENERGY) return "♚";
        if (jobtype == HARVEST_ENERGY) return "♟";
        if (jobtype == TRANSFER_ENERGY) return "♞";
        if (jobtype == REPAIR_STRUCTURE) return "♝";
        if (jobtype == BUILD_STRUCTURE) return "♜";
        if (jobtype == UPGRADE_CONTROLLER) return "♛";
//        if (jobtype == HARVEST_EXTRACTOR) return "♟♟";
        if (jobtype == TRANSFER_MINERAL) return "♞♞";
        if (jobtype == DISMANTLE) return "♜♜";
        if (jobtype == PICKUP_POWER) return "♚♚";
//        if (jobtype == HARVEST_INTO_CONTAINER) return "♟";
        if (jobtype == PICKUP_MINERAL) return '\\m/';
        if (jobtype == GET_BOOSTED) return ':3';
        if (jobtype == SCOUT) return '8)';
        return jobtype;
    },
    getJobtypeFromID: function(jobid) {
        return jobid.split("$")[2];
    },
    getQueueForJobtype: function(jobtype) {
        if (jobtype == PICKUP_POWER)
            return "PICKUP_POWER";
        if (jobtype == PICKUP_ENERGY || jobtype == PICKUP_MINERAL)
            return "PICKUP_ENERGY_PICKUP_MINERAL";
        if (jobtype == TRANSFER_MINERAL)
            return "TRANSFER_MINERAL";
        if (jobtype == TRANSFER_ENERGY)
            return "TRANSFER_ENERGY";
        if (jobtype == DISMANTLE || jobtype == HARVEST_ENERGY)
            return "DISMANTLE_HARVEST_ENERGY";
        if (jobtype == REPAIR_STRUCTURE || jobtype == BUILD_STRUCTURE)
            return "REPAIR_STRUCTURE_BUILD_STRUCTURE";
        if (jobtype == UPGRADE_CONTROLLER)
            return "UPGRADE_CONTROLLER";
        if (jobtype == GET_BOOSTED)
            return "GET_BOOSTED";
        if (jobtype == SCOUT)
            return "SCOUT";
    },
    addJobIfNotExists : function(jobtype,roomName,x,y,meta,meta2=false) {
        var jobkey = roomName+"$"+x+"x"+y+"$"+jobtype;
        let queue = this.getQueueForJobtype(jobtype);
        Memory.jobs[queue] = Memory.jobs[queue] || {};
        if(Memory.jobs[queue][jobkey]) {
            Memory.jobs[queue][jobkey].touched = Game.time;
            Memory.jobs[queue][jobkey].meta = meta;
            if ((jobtype == TRANSFER_MINERAL || jobtype == PICKUP_MINERAL) && Memory.jobs[queue][jobkey].meta2 != meta2) {
                Memory.jobs[queue][jobkey].meta2 = 0;
            }
        } else {
            var job = {
                jobkey: jobkey,
                jobtype: jobtype,
                roomName: roomName,
                x: x,
                y: y,
                meta: meta,
                meta2: meta2,
                assigned: [],
                created: Game.time,
                touched: Game.time,
            }
            Memory.jobs[queue][jobkey] = job;
            if (this.useJobFlags)
                Game.rooms[roomName].createFlag(x,y,jobkey,this.jobtypeToFlagcolor(jobtype));
        }
        return jobkey;
    },
    findNearest : function(creeppos,jobs,VERBOSE=false,becheap=false) {
        if (jobs.length == 0) {
            if (VERBOSE) mydebugger.str("findNearest: no jobs, should be fast");
            return false;
        }
        if (jobs.length == 1) {
            if (VERBOSE) mydebugger.str("findNearest: just one job, should be fast");
            return jobs[0];
        }

        // is there a job in the same room as the creep?
        var result1 = false;
        var result2 = false;
        for (let key in jobs) {
            if (jobs[key].roomName == creeppos.roomName) {
                result1 = true;
            } else {
                result2 = true;
            }
        }
        if (result1 && result2) {
            if (VERBOSE) mydebugger.str("findNearest: there are some jobs in my room, so ignore the others. Before length: "+jobs.length);
            for (let i = 0; i < jobs.length; i++) {
                if (jobs[i].roomName != creeppos.roomName) {
                    jobs = jobs.filter(function(el) {return el.jobkey != jobs[i].jobkey});
                    i--;
                }
            }
            if (VERBOSE) mydebugger.str("findNearest: there are some jobs in my room, so ignore the others. After length: "+jobs.length);
        }
        if (jobs.length == 1) {
            if (VERBOSE) mydebugger.str("findNearest: now there is only one job left, so i'm returning something");
            return jobs[0];
        }
        let usesimple = true;
        if (result1 == true) {
            if (VERBOSE) mydebugger.str("findNearest: we can NOT use simple room pathfinding, could be slow...");
            // job.roomName always is creeppos.roomName
            // we need precise route
            usesimple = false;
        }
        var returnKeys = false;
        var returnDistance = false;
        for (let key in jobs) {
            let job = jobs[key];
            let jobpos = new RoomPosition(job.x,job.y,job.roomName);                
            if (VERBOSE) mydebugger.str("findNearest: checking distance from job "+jobpos+" to "+creeppos+" with usesimple: "+usesimple);
            if (usesimple) {
                var distance = Game.my.managers.infrastructure.getRoomPathsLengthSimple(creeppos.roomName,jobpos.roomName,VERBOSE);
            } else {
                //var distance = Game.my.managers.infrastructure.getRoomPathsLength(creeppos,jobpos,VERBOSE);
                var distance = creeppos.getRangeTo(jobpos);
            }
            if(!returnKeys || returnDistance > distance) {
                // reset results, i found a closer one
                returnKeys = [];
                returnDistance = distance;
            } 
            if (returnDistance == distance) {
                // keep result, add new job, for later detail evaluation.
                returnKeys.push(key);
            }
        }
        let returnKey = false;
        if (!usesimple || returnKeys.length == 1 || becheap) {
            returnKey = returnKeys[0];
        } else {
            returnDistance = false;
            for(let key in returnKeys) {
                let job = jobs[key];
                // TODO: startpos is creep pos, so its always searches for the whole path. It could once calculate from which exit the creep would enter and check the closest job from there
                
                let start = creeppos;
                let end = new RoomPosition(job.x,job.y,job.roomName);  
                let paths = PathFinder.search(start,{pos: end},{
                  // We need to set the defaults costs higher so that we
                  // can set the road cost lower in `roomCallback`
                  plainCost: 2,
                  swampCost: 10,
                  roomCallback: function(roomName) {
                    let room = Game.rooms[roomName];
                    // In this example `room` will always exist, but since PathFinder 
                    // supports searches which span multiple rooms you should be careful!
                    if (!room) return;
                    let costs = new PathFinder.CostMatrix;
                    room.find(FIND_STRUCTURES).forEach(function(s) {
                        if (s.structureType === STRUCTURE_ROAD) {
                            // Favor roads over plain tiles
                            costs.set(s.pos.x, s.pos.y, 1);
                        } else if (OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1) {
                            costs.set(s.pos.x, s.pos.y, 255);
                        }
                    });
                    return costs;
                  }
                });
                if (!returnKey || returnDistance > paths.costs) {
                    returnKey = key;
                    returnDistance = paths.costs;
                } 
                
            }
        }
        if (VERBOSE) mydebugger.str("findNearest: : "+usesimple);
        return jobs[returnKey];
    },
     
    fillJobQueuePickupEnergy: function(room) {
        room.memory.toBePickedUp = [];
        var energys = room.find(FIND_DROPPED_RESOURCES,{filter: (d) => {return (d.resourceType == RESOURCE_ENERGY && !d.pos.isExit())}});
        for (let key in energys) {
            var energy = energys[key];
            this.addJobIfNotExists(PICKUP_ENERGY,room.name,energy.pos.x,energy.pos.y,energy.id,energy.amount);
            room.memory.toBePickedUp = room.memory.toBePickedUp.concat([{
                x: energy.pos.x,
                y: energy.pos.y,
            }]);
        }
        var containers = room.find(FIND_STRUCTURES, {
            filter: s => 
                s.structureType == STRUCTURE_CONTAINER 
             && s.store[RESOURCE_ENERGY] > 800 
             && s.id != s.room.memory.controllercontainer
             && s.id != s.room.memory.storagecontainer
        }); 
        for (let key in containers) {
            var container = containers[key];
            this.addJobIfNotExists(PICKUP_ENERGY,room.name,container.pos.x,container.pos.y,container.id,container.store[RESOURCE_ENERGY]);
        }
        if (room.isMineClaimed()) {
            if(room.storage) {
                if(room.terminal) {
                    if (room.terminal.store[RESOURCE_ENERGY] > 91000) {
                        this.addJobIfNotExists(PICKUP_ENERGY,room.name,room.terminal.pos.x,room.terminal.pos.y,room.terminal.id,room.terminal.store[RESOURCE_ENERGY]-50000);
                    }
                }
                if (room.storage.store[RESOURCE_ENERGY] > 900000 || room.areThereEnemies()) {
                    this.addJobIfNotExists(PICKUP_ENERGY,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,room.storage.store[RESOURCE_ENERGY]);
                }
                if (room.storage.my) {
                    if (room.storage.store[RESOURCE_ENERGY] > 100000 && _.filter(Game.constructionSites, c => c.pos.roomName == room.name).length > 0) {
                        this.addJobIfNotExists(PICKUP_ENERGY,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,room.storage.store[RESOURCE_ENERGY]-100000);
                    }
                }
            }
        } else {
            if (room.storage && room.storage.store[RESOURCE_ENERGY] > 0) {
                this.addJobIfNotExists(PICKUP_ENERGY,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,room.storage.store[RESOURCE_ENERGY]);
            }
            if (room.terminal && room.terminal.store[RESOURCE_ENERGY] > 0) {
                this.addJobIfNotExists(PICKUP_ENERGY,room.name,room.terminal.pos.x,room.terminal.pos.y,room.terminal.id,room.terminal.store[RESOURCE_ENERGY]);
            }
        }
    },
    
    fillJobQueuePickupMineral: function(room) {
        var energys = room.find(FIND_DROPPED_RESOURCES,{filter: (d) => {return (d.resourceType != RESOURCE_ENERGY)}});
        for (let key in energys) {
            var energy = energys[key];
            this.addJobIfNotExists(PICKUP_MINERAL,room.name,energy.pos.x,energy.pos.y,energy.id,energy.amount);
        }
        var containers = room.find(FIND_STRUCTURES, {
            filter: function(structure) {
                return (structure.structureType == STRUCTURE_CONTAINER && _.sum(structure.store) - structure.store[RESOURCE_ENERGY] > 400);
            }
        });
        for (let key in containers) {
            var container = containers[key];
            this.addJobIfNotExists(PICKUP_MINERAL,room.name,container.pos.x,container.pos.y,container.id,_.sum(container.store));
        }
        if (room.storage) {
            if((!room.storage.my || !room.storage.isActive()) && _.sum(room.storage.store) - room.storage.store[RESOURCE_ENERGY] > 0) {
                let nearby = cachedSearch.nearbySpawn(room.name,room.storage.pos.x,room.storage.pos.y);
                if (Game.spawns[nearby].room.terminal) {
                    this.addJobIfNotExists(PICKUP_MINERAL,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,0);
                }
            }
            if (room.isMineClaimed()) {
                if ((_.sum(room.storage.store) - room.storage.store[RESOURCE_ENERGY]) > 0 && _.sum(room.storage.store) > 500000) {
                    this.addJobIfNotExists(PICKUP_MINERAL,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,0);
                }
            } else {
                if ((_.sum(room.storage.store) - room.storage.store[RESOURCE_ENERGY]) > 0) {
                    let nearby = cachedSearch.nearbySpawn(room.name,room.storage.pos.x,room.storage.pos.y);
                    if (Game.spawns[nearby].room.terminal) {
                        this.addJobIfNotExists(PICKUP_MINERAL,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,0);
                    }
                }
            }
        }
        if (room.terminal && (_.sum(room.terminal.store) - room.terminal.store[RESOURCE_ENERGY]) > 0 && !room.isMineClaimed()) {
            let nearby = cachedSearch.nearbySpawn(room.name,room.terminal.pos.x,room.terminal.pos.y);
            if (Game.spawns[nearby].room.terminal) {
                this.addJobIfNotExists(PICKUP_MINERAL,room.name,room.terminal.pos.x,room.terminal.pos.y,room.terminal.id,(_.sum(room.terminal.store) - room.terminal.store[RESOURCE_ENERGY]));
            }
        }
        
    },
    
    fillJobQueueScout: function(roomName) {
        this.addJobIfNotExists(SCOUT,roomName,25,25,roomName);
    },

    fillJobQueueUpgradeController: function(room) {
        if (room.controller) {
            if (room.controller.my) {
                this.addJobIfNotExists(UPGRADE_CONTROLLER,room.name,room.controller.pos.x,room.controller.pos.y,room.controller.id);
            }
        }
    },

    fillJobQueueHarvestEnergy: function(room) {
        if (room.controller /* && room.controller.my*/) {
            var mysources = cachedSearch.sourcesOfRoom(room.name);
            for (let key in mysources) {
                let source = mysources[key];
                if(source.energy > 0 || source.ticksToRenegeration < 30) {
                    var top = source.pos.y-1;
                    var left = source.pos.x-1;
                    var bottom = source.pos.y+1;
                    var right = source.pos.x+1;
                    var harvester = _.filter(room.lookForAtArea(LOOK_CREEPS,top,left,bottom,right,true), (c) => c.creep && c.creep.my && c.creep.memory.role == 'harvester');
                    if (harvester.length == 0) {
                        var terrain = _.filter(room.lookForAtArea(LOOK_TERRAIN,top,left,bottom,right,true), (terrain) => terrain.terrain == 'plain' || terrain.terrain == 'swamp');
                        for (let key in terrain) {
                            let stuff = new RoomPosition(terrain[key].x,terrain[key].y,source.room.name).look()		// collection of things at our potential target
                            if (_.findIndex(stuff, p => (p.structure && (p.structure && OBSTACLE_OBJECT_TYPES.indexOf(p.structure.structureType) !== -1))) === -1) {
                                this.addJobIfNotExists(HARVEST_ENERGY,room.name,terrain[key].x,terrain[key].y,source.id);
                            }
                        }
                    }
                }
            }
        }
    },

    fillJobQueueTransferEnergy: function(room) {
        if (room.controller && room.controller.my) {
            var transporterInThisRoom = _.filter(Game.my.creeps.transporter, (trans) => trans.pos.roomName == room.name);
            if (!room.storage || transporterInThisRoom.length == 0) {
                if (!room.areThereEnemies()) {
                    var target = room.find(FIND_STRUCTURES, {
                        filter: function(structure) {
                            return (structure.structureType == STRUCTURE_TOWER 
                                && structure.energy <= (structure.energyCapacity * 0.7)
                            || (structure.structureType == STRUCTURE_EXTENSION
                                && structure.energy < structure.energyCapacity) 
                            || (structure.structureType == STRUCTURE_SPAWN
                                && structure.energy < structure.energyCapacity)
                            );
                        }
                    });
                    for (let key in target) {
                        if (key > 10) break;
                        let structure = target[key];
                        this.addJobIfNotExists(TRANSFER_ENERGY,room.name,structure.pos.x,structure.pos.y,structure.id,0);
                    }
                }
                var target = room.find(FIND_STRUCTURES, {
                    filter: function(structure) {
                        return (structure.structureType == STRUCTURE_TOWER 
                            && structure.energy <= (structure.energyCapacity * 0.5)
                        );
                    }
                });
                for (let key in target) {
                    let structure = target[key];
                    this.addJobIfNotExists(TRANSFER_ENERGY,room.name,structure.pos.x,structure.pos.y,structure.id,0);
                }
            }
            if (room.storage) {
                if(room.terminal) {
                    if (room.terminal.store[RESOURCE_ENERGY] < 90000 && room.storage.store[RESOURCE_ENERGY] > 100000) {
                        this.addJobIfNotExists(TRANSFER_ENERGY,room.name,room.terminal.pos.x,room.terminal.pos.y,room.terminal.id);
                    } else {
                        this.addJobIfNotExists(TRANSFER_ENERGY,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,(room.storage.store[RESOURCE_ENERGY]<10000?0:room.storage.store[RESOURCE_ENERGY]));
                    }
                } else {
                    if (_.sum(room.storage.store) < room.storage.storeCapacity) {
                        this.addJobIfNotExists(TRANSFER_ENERGY,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,(room.storage.store[RESOURCE_ENERGY]<10000?0:room.storage.store[RESOURCE_ENERGY]));
                    }
                }
            }
        }
    },
    
    fillJobQueueTransferMineral: function(room) {
        if (room.controller && room.controller.my) {
            if(typeof room.terminal != "undefined" && _.sum(room.terminal.store) < 200000 && room.terminal.my) {
                this.addJobIfNotExists(TRANSFER_MINERAL,room.name,room.terminal.pos.x,room.terminal.pos.y,room.terminal.id,0);
            }
            if(typeof room.storage != "undefined" && _.sum( room.storage.store) < 500000 && room.storage.my) {
                if (typeof room.terminal == "undefined" || _.sum(room.terminal.store) >= 200000) {
                    // either there is no Terminal
                    this.addJobIfNotExists(TRANSFER_MINERAL,room.name,room.storage.pos.x,room.storage.pos.y,room.storage.id,0);
                }
            }
            if (room.controller.level == 8) {
                let powerspawns = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_POWER_SPAWN && s.my});
                if (powerspawns.length > 0) {
                    this.addJobIfNotExists(TRANSFER_MINERAL,room.name,powerspawns[0].pos.x,powerspawns[0].pos.y,powerspawns[0].id,RESOURCE_POWER);
                }
            }
        }
    },
    
    fillJobQueueDismantle: function(room) {
        if (Game.flags['thisRoomIgnoresDismantle'] && Game.flags['thisRoomIgnoresDismantle'].pos.roomName == room.name) {
            return;
        }
        if (room.controller && !room.controller.my) {
            var target = room.find(FIND_STRUCTURES, {
                filter: function(structure) {
                    return (
                            ([STRUCTURE_ROAD,STRUCTURE_CONTAINER,STRUCTURE_STORAGE,STRUCTURE_TERMINAL].indexOf(structure.structureType) == -1)
                         && structure.hits
                        )
                }
            });
            for (let key in target) {
                if (target[key].my) {
                    target[key].notifyWhenAttacked(false);
                }
                this.addJobIfNotExists(DISMANTLE,room.name,target[key].pos.x,target[key].pos.y,target[key].id);
            }
        }
        if (Game.flags['forcedismantle'] && Game.flags['forcedismantle'].pos.roomName == room.name) {
            let range = Game.flags['forcedismantle'].memory.range || 0;
            let top     = Game.flags['forcedismantle'].pos.y-range;
            let left    = Game.flags['forcedismantle'].pos.x-range;
            let bottom  = Game.flags['forcedismantle'].pos.y+range;
            let right   = Game.flags['forcedismantle'].pos.x+range;
            let structs = Game.flags['forcedismantle'].room.lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true);
            for (let key in structs) {
                this.addJobIfNotExists(DISMANTLE,room.name,structs[key].structure.pos.x,structs[key].structure.pos.y,structs[key].structure.id);
                structs[key].structure.notifyWhenAttacked(false);
            }
        }
        if (Game.flags['donotrepairroads'] && Game.flags['donotrepairroads'].pos.roomName == room.name) {
            var target = room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_ROAD});
            for (let key in target) {
                this.addJobIfNotExists(DISMANTLE,room.name,target[key].pos.x,target[key].pos.y,target[key].id);
            }
        }

    },
    
    fillJobQueueRepairStructure: function(room) {
//        if (cachedSearch.towersOfRoom(room.name).length == 0 && !room.areThereEnemies()) {
            for (let key in room.memory.toBeRepaired) {
                let structure = Game.getObjectById(room.memory.toBeRepaired[key].id);
                if(structure && structure.hits < (room.memory.toBeRepaired[key].targethealth * 0.9)) {
                    let doit = true;
                    if (Game.flags['forcedismantle'] && Game.flags['forcedismantle'].pos.roomName == structure.pos.roomName) {
                        let range = Game.flags['forcedismantle'].memory.range || 0;
                        if (Game.flags['forcedismantle'].pos.getRangeTo(structure.pos) <= range) {
                            doit = false;
                        }
                    }
                    if (doit) {
                        this.addJobIfNotExists(REPAIR_STRUCTURE,room.name,structure.pos.x,structure.pos.y,structure.id,structure.hits);
                    }
                        
                }
            }
//        }
    },
    
    fillJobQueueBuildStructure: function(room) {
        var target = cachedSearch.constructionsidesOfRoom(room.name);
        for (let key in target) {
            let constructionsite = target[key];
            if (constructionsite.my) {
                this.addJobIfNotExists(BUILD_STRUCTURE,room.name,constructionsite.pos.x,constructionsite.pos.y,constructionsite.id);
            }
        }
    },
    
    fillJobQueuePickupPower: function(room) {
        if (room.name.substring(2,3) == 0 || room.name.substring(5,6) == 0) {
            var target = room.find(FIND_DROPPED_RESOURCES, {
                filter: function(resource) {
                    return (resource.resourceType === RESOURCE_POWER)
                }
            });
            for (let key in target) {
                this.addJobIfNotExists(PICKUP_POWER,room.name,target[key].pos.x,target[key].pos.y,target[key].id);
            }
            var target = room.find(FIND_STRUCTURES, {
                filter: (structure) => 
                      (structure.structureType === STRUCTURE_POWER_BANK)
                  });
            if (target.length > 0) {
                if (target[0].hits < 175000) {
                    this.addJobIfNotExists(PICKUP_POWER,room.name,target[0].pos.x,target[0].pos.y,target[0].id);
                }
            }
        }
    },
    
    fillJobQueue : function(rooms) {
        mydebugger.enable({name: 'fillJobQueue'});
        if(!Memory.jobs) {
            Memory.jobs = {};
        }
        Memory.jobvisuals = {};

        var jobs = Memory.jobs;
        Game.my.managers.labmanager.manage(this);
        for(var key in rooms) {
            var room = Game.rooms[rooms[key]];
            if(room) {
                if (room.controller && room.controller.owner && !room.controller.my) {
                    // enemy rooms should only get dismantled :D
                    this.fillJobQueueDismantle(room);
                    // and looted
                    this.fillJobQueuePickupEnergy(room);
                    this.fillJobQueuePickupMineral(room);
                    mydebugger.str("collecting Dismantle in room " + room.name+ " finished");
                } else {
                    mydebugger.str("starting with job collection in room " + room.name);
                    this.fillJobQueuePickupEnergy(room);
                    mydebugger.str("collecting PickupEnergy in room " + room.name+ " finished");
                    this.fillJobQueuePickupMineral(room);
                    mydebugger.str("collecting PickupMineral in room " + room.name+ " finished");
                    this.fillJobQueueUpgradeController(room);
                    mydebugger.str("collecting UpgradeController in room " + room.name+ " finished");
                    this.fillJobQueueHarvestEnergy(room);
                    mydebugger.str("collecting HarvestEnergy in room " + room.name+ " finished");
                    this.fillJobQueueTransferEnergy(room);
                    mydebugger.str("collecting TransferEnergy in room " + room.name+ " finished");
                    this.fillJobQueueTransferMineral(room);
                    mydebugger.str("collecting TransferMineral in room " + room.name+ " finished");
                    this.fillJobQueueDismantle(room);
                    mydebugger.str("collecting Dismantle in room " + room.name+ " finished");
                    this.fillJobQueueRepairStructure(room);
                    mydebugger.str("collecting RepairStructure in room " + room.name+ " finished");
                    this.fillJobQueueBuildStructure(room);
                    mydebugger.str("collecting BuildStructure in room " + room.name+ " finished");
                    this.fillJobQueuePickupPower(room);
                    mydebugger.str("collecting PickupPower in room " + room.name+ " finished");
                }
            }
        }
        for (let key in Memory.whitelistrooms) {
            var room = Memory.whitelistrooms[key];
            if (!Game.rooms[room]) {
            	let parsed = room.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
                if (!(parsed[1] % 10 === 0) || (parsed[2] % 10 === 0)) { // never scout highways with scouts
                    this.fillJobQueueScout(room);
                }
            }
        }
        mydebugger.str("jobfinder is removing jobs which are not up-to-date");
        for(var queuekey in jobs) {
            let queue = jobs[queuekey];
            for(let jobkey in queue) {
                var job = queue[jobkey];
                let deleteit = false;
                if(Memory.jobrooms.indexOf(job.roomName) === -1 && job.jobtype != SCOUT) {
                    deleteit = true;
                }
                if(Game.rooms[job.roomName] && job.jobtype == SCOUT) {
                    deleteit = true;
                }
                if(job.touched <= Game.time - 20 && job.jobtype != GET_BOOSTED && !Game.rooms['sim']) {
                    deleteit = true;
                }
                if (deleteit) {
                    // console.log("jobmanager deletes a job: "+job.jobtype+" >>> "+JSON.stringify(job));
                    for(let asskey in job.assigned) {
                        if (Game.creeps[job.assigned[asskey]]) {
                            delete Game.creeps[job.assigned[asskey]].memory.job;
                            delete Game.creeps[job.assigned[asskey]].memory.zombie;
                        }
                    }
                    delete Memory.jobs[queuekey][jobkey];
                    if(Game.flags[jobkey]) {
                        Game.flags[jobkey].remove();
                    }
                }
                for(let asskey in job.assigned) {
                    if(!Game.creeps[job.assigned[asskey]] || Game.creeps[job.assigned[asskey]].memory.job != job.jobkey) {
                        if (Memory.jobs[queuekey][jobkey]) {
                            Memory.jobs[queuekey][jobkey].assigned.splice(asskey,1);
                        }
                    }
                }
                if (this.useJobFlags && !Game.flags[jobkey]) {
                    if (Game.rooms[job.roomName]) {
                        Game.rooms[job.roomName].createFlag(job.x,job.y,job.jobkey,this.jobtypeToFlagcolor(job.jobtype));
                    } else {
                        console.log("WTF");
                    }
                }
                if (this.useJobVisuals && Memory.showJobReport) {
                    if (Game.rooms[job.roomName]) {
                        if (!Memory.jobvisuals[job.roomName]) Memory.jobvisuals[job.roomName] = [];
                        Memory.jobvisuals[job.roomName] = Memory.jobvisuals[job.roomName].concat([{text: this.jobtypeToIcon(job.jobtype),x: job.x,y: job.y,jobkey: job.jobkey}])
                    } 
                }
            }
        }
        mydebugger.end(false);
        Memory.jobsDebug = mydebugger.getStr();
        return mydebugger.getStr();
    },
    GeneralValidateJob : function(job,creep) {
        if (Game.my.managers.infrastructure.getRoomPathsLengthSimple(creep.pos.roomName,job.roomName) > 5) {
            return false;
        } else {
            return true;
        }
    },
    RoomSlaveValidateJob : function(job,creep) {
        if (Game.my.managers.infrastructure.getRoomPathsLengthSimple(creep.memory.roomslave,job.roomName) > 3) {
            return false;
        } else {
            return true;
        }
    },
	
	assignPickupPower: function(debug, slave) {
		let potentialJobs = _.filter(Memory.jobs.PICKUP_POWER, (job) => this.GeneralValidateJob(job,slave) && job.assigned.length < 5);
		if (debug) console.log(slave.name+" assignPickupPower found: "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignDismantle: function(debug, slave) {
		if (slave.getActiveBodyparts(WORK) >= 4) {
    		if (slave.memory.roomslave)
    			var potentialJobs = _.filter(Memory.jobs.DISMANTLE_HARVEST_ENERGY, (job) => this.RoomSlaveValidateJob(job,slave) &&  job.assigned.length < 1 && job.jobtype == DISMANTLE);
    		else
    			var potentialJobs = _.filter(Memory.jobs.DISMANTLE_HARVEST_ENERGY, (job) => this.GeneralValidateJob(job,slave) &&  job.assigned.length < 1 && job.jobtype == DISMANTLE);
            if (debug) console.log(slave.name+" assignDismantle found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
			if (potentialJobs.length > 0) {
				let potentialJob = this.findNearest(slave.pos,potentialJobs);
				slave.memory.job = potentialJob.jobkey;
				Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
                console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");  
				return true;
			}
		}
		return false;
	},
	
	assignPickupMineral: function(debug, slave,level) {
		if (slave.memory.roomslave) {
		    if (!Game.rooms[slave.memory.roomslave].terminal) {
		        return false;
		    } else {
			    var potentialJobs = _.filter(Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL, (job) => this.RoomSlaveValidateJob(job,slave) && job.assigned.length < level && job.jobtype == PICKUP_MINERAL);
		    }
		} else {
			var potentialJobs = _.filter(Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL, (job) => this.GeneralValidateJob(job,slave) && job.assigned.length < level && job.jobtype == PICKUP_MINERAL);
		}
        if (debug) console.log(slave.name+" assignPickupMineral found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignPickupEnergy: function(debug, slave,level) {
		if (slave.memory.roomslave)
			var potentialJobs = _.filter(Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL, (job) => this.RoomSlaveValidateJob(job,slave) && job.assigned.length < level && ((job.jobtype == PICKUP_ENERGY && job.meta2 > slave.carryCapacity * (job.assigned.length + 1))));                                
		else
		    var potentialJobs = _.filter(Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL, (job) => this.GeneralValidateJob(job,slave) && job.assigned.length < level && ((job.jobtype == PICKUP_ENERGY && job.meta2 > slave.carryCapacity * (job.assigned.length + 1))));
        if (debug) console.log(slave.name+" assignPickupEnergy found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignPickupEnergyOrMineral: function(debug, slave,mineralvalidator,level) {
	    let result = false;
		if (mineralvalidator.length > 0) {
		    result = this.assignPickupMineral(debug,slave,level);
		    if (!result) {
		        result = this.assignPickupEnergy(debug,slave,level)
		    }
		} else {
		    result = this.assignPickupEnergy(debug,slave,level);
		}
		return result;
	},
	
	assignHarvestEnergy: function(debug, slave) {
		if (slave.memory.roomslave)
		    var potentialJobs = _.filter(Memory.jobs.DISMANTLE_HARVEST_ENERGY, (job) => this.RoomSlaveValidateJob(job,slave) &&  job.assigned.length < 1 && job.jobtype == HARVEST_ENERGY);
		else
		    var potentialJobs = _.filter(Memory.jobs.DISMANTLE_HARVEST_ENERGY, (job) => this.GeneralValidateJob(job,slave) &&  job.assigned.length < 1 && job.jobtype == HARVEST_ENERGY);
        if (debug) console.log(slave.name+" assignHarvestEnergy found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignScout: function(debug, slave) {
		var potentialJobs = _.filter(Memory.jobs.SCOUT, (job) => this.GeneralValidateJob(job,slave) &&  job.assigned.length < 1);
		if (debug) console.log(slave.name+" assignScout found: "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignTransferMineral: function(debug, slave) {
		let carry = false;
		for(carry in slave.carry) {
			if (carry != RESOURCE_ENERGY) {
				break;
			}
		}
		var potentialJobs = _.filter(Memory.jobs.TRANSFER_MINERAL, (job) =>  this.GeneralValidateJob(job,slave) && job.meta2 == carry && job.roomName == slave.room.name);
        if (debug) console.log(slave.name+" assignTransferMineral found (carry: "+carry+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		} else {
			var potentialJobs = _.filter(Memory.jobs.TRANSFER_MINERAL, (job) =>  this.GeneralValidateJob(job,slave) && job.meta2 == 0);
//			var potentialJobs = _.filter(Memory.jobs.TRANSFER_MINERAL, (job) =>  job.meta2 == 0);
            if (debug) console.log(slave.name+" assignTransferMineral found (all minerals): "+potentialJobs.length);
			if (potentialJobs.length > 0) {
				let potentialJob = this.findNearest(slave.pos,potentialJobs);
				slave.memory.job = potentialJob.jobkey;
				Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
                console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
				return true;
			}
		}
		return false;
	},
	
	assignUpgradeController: function(debug, slave) {
	    var roomslave = slave.memory.roomslave;
	    if (!roomslave) {
	        roomslave = slave.room.name;
	    }
		var potentialJobs = _.filter(Memory.jobs.UPGRADE_CONTROLLER, (job) =>  this.GeneralValidateJob(job,slave) && job.roomName == roomslave);
        if (debug) console.log(slave.name+" assignUpgradeController found: "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignRepairStructure: function(debug, slave, level = 2) {
		if (slave.memory.roomslave)
			var potentialJobs = _.filter(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE, (job) =>  this.RoomSlaveValidateJob(job,slave) && job.jobtype == REPAIR_STRUCTURE && job.assigned.length < level);
		else
			var potentialJobs = _.filter(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE, (job) =>  this.GeneralValidateJob(job,slave) && job.jobtype == REPAIR_STRUCTURE && job.assigned.length < level);
        if (debug) console.log(slave.name+" assignRepairStructure found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
//			let potentialJob = this.findNearest(slave.pos,potentialJobs);
//			let potentialJob = this.findNearest(slave.pos,potentialJobs,false,true);
			let potentialJob = _.sortBy(potentialJobs,j => j.meta2)[0];
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	
	assignBuildStructure: function(debug, slave, level = 2) {
		if (slave.memory.roomslave)
			var potentialJobs = _.filter(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE, (job) =>  this.RoomSlaveValidateJob(job,slave) && job.jobtype == BUILD_STRUCTURE && job.assigned.length < level);
		else
			var potentialJobs = _.filter(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE, (job) =>  this.GeneralValidateJob(job,slave) && job.jobtype == BUILD_STRUCTURE && job.assigned.length < level);
        if (debug) console.log(slave.name+" assignBuildStructure found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
//			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			let potentialJob = this.findNearest(slave.pos,potentialJobs,false,true);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},

	assignRepairStructure: function(debug, slave, level = 2) {
		if (slave.memory.roomslave)
			var potentialJobs = _.filter(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE, (job) =>  this.RoomSlaveValidateJob(job,slave) && job.assigned.length < level && job.jobtype == REPAIR_STRUCTURE);
		else
			var potentialJobs = _.filter(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE, (job) =>  this.GeneralValidateJob(job,slave) && job.assigned.length < level && job.jobtype == REPAIR_STRUCTURE);
        if (debug) console.log(slave.name+" assignRepairStructure found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
//			let potentialJob = this.findNearest(slave.pos,potentialJobs);
//			let potentialJob = this.findNearest(slave.pos,potentialJobs,false,true);
			let potentialJob = _.sortBy(potentialJobs,j => j.meta2)[0];
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},

	
	assignTransferEnergy: function(debug, slave) {
		if (slave.memory.roomslave)
			var potentialJobs = _.filter(Memory.jobs.TRANSFER_ENERGY, (job) =>  this.RoomSlaveValidateJob(job,slave));
		else
			var potentialJobs = _.filter(Memory.jobs.TRANSFER_ENERGY, (job) =>  this.GeneralValidateJob(job,slave));
        if (debug) console.log(slave.name+" assignTransferEnergy found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
		if (potentialJobs.length > 0) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			//let potentialJob = _.sortBy(potentialJobs,j => j.meta2)[0];
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},
	
	assignTransferEnergyToSpawnAndExtensions: function(debug, slave) {
	    var roomslave = slave.memory.roomslave;
	    if (!roomslave) {
	        roomslave = creep.room.name;
	    }
		var potentialJobs = _.filter(Memory.jobs.TRANSFER_ENERGY, (job) => this.RoomSlaveValidateJob(job,slave) 
			&& (job.roomName == roomslave)
			&& ([STRUCTURE_SPAWN, STRUCTURE_EXTENSION].indexOf(Game.getObjectById(job.meta).structureType)) !== -1                                
		);
        if (debug) console.log(slave.name+" assignTransferEnergyToSpawnAndExtensions found (roomslave: "+slave.memory.roomslave+"): "+potentialJobs.length);
        if (debug) console.log(slave.name+" assignTransferEnergyToSpawnAndExtensions might have issues with storage in above mentioned room");
		if (potentialJobs.length > 0 && (!Game.rooms[roomslave].storage || _.sum(Game.rooms[roomslave].storage.store) < 100000)) {
			let potentialJob = this.findNearest(slave.pos,potentialJobs);
			slave.memory.job = potentialJob.jobkey;
			Memory.jobs[this.getQueueForJobtype(potentialJob.jobtype)][potentialJob.jobkey].assigned.push(slave.name);
            console.log(slave.name+" new job "+slave.memory.job+" ("+this.jobtypeToText(this.getJobtypeFromID(slave.memory.job))+")");
			return true;
		}
		return false;
	},

    giveMeAJob : function(slave) {
        if (slave.memory.jobFailTime && slave.memory.jobFailTime > Game.time- 10) {
            // skip, nachdem ich mal keinen Job erhalten habe...
            return false;
        }
        delete slave.memory.jobFailTime;
        var debug = Memory.showJobReport;
        Memory.jobs = Memory.jobs || {};
        let mineralvalidator = _.filter(Memory.jobs.TRANSFER_MINERAL, (job) => job.meta2 == 0);
        if (slave.memory.job) {
            if (!Memory.jobs[
                jobFinder.getQueueForJobtype(
                    jobFinder.getJobtypeFromID(slave.memory.job)
                )
            ][slave.memory.job]) {
                delete slave.memory.job;
                delete slave.memory.zombie;
            }
        }
        if (!slave.memory.job) {
            if (debug) console.log(slave.name+" has no job");
            if (_.sum(slave.carry) <= slave.carryCapacity * 0.1 && _.sum(slave.carry) - slave.carry[RESOURCE_ENERGY] == 0) {
                if (debug) console.log(slave.name+" has no minerals and is low on energy");
				if (!slave.memory.roomslave) {
                    if (debug) console.log(slave.name+" is not a roomslave!");
					for(let level = 2;level<=5;level++) {
						if (this.assignPickupPower(debug, slave))									break;
						if (this.assignDismantle(debug, slave))									    break;
						if (this.assignPickupEnergyOrMineral(debug, slave,mineralvalidator,level))	break;
						if (this.assignHarvestEnergy(debug, slave))								    break;
						if (this.assignScout(debug, slave))										    break;
					}
				} else {
                    if (debug) console.log(slave.name+" is a roomslave: "+slave.memory.roomslave);
					for(let level = 2;level<=5;level++) {
						if (this.assignPickupEnergyOrMineral(debug, slave,mineralvalidator,level))	break;
						if (this.assignHarvestEnergy(debug, slave))								    break;
					}
				}
            } else if (_.sum(slave.carry) - slave.carry[RESOURCE_ENERGY] > 0) {
                if (debug) console.log(slave.name+" has minerals");
				this.assignTransferMineral(debug, slave);
            } else {
                if (debug) console.log(slave.name+" has no minerals and has energy");
                if (slave.room.find(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_SPAWN}).length > 0 && slave.room.controller.level < 3 && slave.room.controller.my) {
                    if (debug) console.log(slave.name+" boosts controller til lvl 3");
					this.assignUpgradeController(debug, slave);
				} else {
					if (!slave.memory.roomslave) {
					    if (debug) console.log(slave.name+" is not a roomslave!");
						if (this.assignRepairStructure(debug, slave,5))				        return;
						if (this.assignBuildStructure(debug, slave,5))			        	return;
						if (this.assignTransferEnergy(debug, slave))						return;
						if (this.assignUpgradeController(debug, slave))					    return;
					} else {
					    if (debug) console.log(slave.name+" is a roomslave: "+slave.memory.roomslave);
					    let room = Game.rooms[slave.memory.roomslave];
						if (room.controller.ticksToDowngrade < 4000) {
					        if (debug) console.log(slave.name+" EMERGENCY CONTROLLER UPGRADE");
							this.assignUpgradeController(debug, slave);
						} else {
						    if (room.areThereEnemies()) {
                                if (debug) console.log(slave.name+" using enemy assignment");
                                // only fill spawn and repair
                                if (this.assignTransferEnergyToSpawnAndExtensions(debug, slave))				return;
                                if (this.assignRepairStructure(debug, slave, 10))				                return;
                                if (this.assignTransferEnergy(debug, slave))									return;
                            } else {
                                if (debug) console.log(slave.name+" usual assignment");
                                if (this.assignTransferEnergyToSpawnAndExtensions(debug, slave))				return;
                                if (this.assignRepairStructure(debug, slave,10))							    return;
                                if (this.assignBuildStructure(debug, slave,10))							        return;
                                if (this.assignTransferEnergy(debug, slave))									return;
                                if (this.assignUpgradeController(debug, slave))								    return;
						    }
						}
					}
				}
			}
        }
        if (!slave.memory.job) {
            // Wenn wir immer noch keinen Job haben, dann skippe mal für ein paar ticks
            slave.memory.jobFailTime = Game.time;
        }
    },

    assignJobs : function() {
        Game.my.managers.labmanager.manage(this);
        Memory.jobs = Memory.jobs || {};
        var debug = Memory.showJobReport;
        let mineralvalidator = _.filter(Memory.jobs.TRANSFER_MINERAL, (job) => job.meta2 == 0);
        var slaves      = _.filter(Game.my.creeps.slave, (creep) => !creep.spawning);
        var inspawning  = _.filter(Game.my.creeps.slave, (creep) => creep.spawning && !creep.memory.job);
        for (let key in inspawning) {
            let creep = inspawning[key];
            var potentialJobs = _.filter(Memory.jobs, (job) => job.jobtype == GET_BOOSTED && job.roomName == creep.pos.roomName && [RESOURCE_KEANIUM_ACID,RESOURCE_KEANIUM_HYDRIDE].indexOf(job.meta2) !== -1);
            if (potentialJobs.length > 0) {
                creep.memory.job = potentialJobs[0].jobkey;
            }
        }
        for (let key in slaves) {
            let slave = slaves[key];
            this.giveMeAJob(slave);
        }
//        console.log(slavereport.slaveWithEnergy+" UNASSIGNED SLAVES WITH ENERGY TOTAL");
//        console.log(slavereport.slaveWithoutEnergy+" UNASSIGNED SLAVES WITHOUT ENERGY TOTAL");
    },
}
profiler.registerObject(jobFinder,'jobFinder');
module.exports = jobFinder;
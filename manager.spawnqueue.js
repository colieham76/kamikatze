"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');

var squadQueueManager = {
    prio: {
        [WORK]: 1,
        [CLAIM]: 2,
        [CARRY]: 3,
        [MOVE]: 4
    },
    addToQueue: function(roomName,role,body,queueamount,memory={},prio=-1) {
        let debug = false;
        Memory.spawnqueue[roomName]       = Memory.spawnqueue[roomName] || {};
        Memory.spawnqueue[roomName][role] = Memory.spawnqueue[roomName][role] || [];
        if (queueamount <= 0 || !body) {
            return false;
        }
        memory.role = role;
        for(let i = 0; i < queueamount; i++) {
            Memory.spawnqueue[roomName][role].push({
                role: role,
                body: body,
                memory: memory,
                prio: prio
            });
        }
        if (debug) {
            var bodytext = "";
            let tbody = {};
            body.forEach(function(elem){ if(!tbody[elem]) tbody[elem] = 0; tbody[elem]++; });
            for (let key in tbody) {
                bodytext += tbody[key]+"x "+key+", ";
            }
            console.log(roomName + " wants to add " + queueamount + " " + role+ " ("+bodytext.substring(0,bodytext.length-2)+") with memory: "+JSON.stringify(memory));
        }
    },
    getQueueRoleNum: function(role) {
        let num = 0;
        for (let room in _.keys(Game.my.spawnqueue)) {
            room = _.keys(Game.my.spawnqueue)[room];
            num += Game.my.spawnqueue[room][role].length;
        }
        return num;
    },
    checkQueue: function() {
        let start = Game.cpu.getUsed();
        Memory.spawnqueue = {};
        let spawnrooms = Game.my.managers.strategy.getCoreRooms();
        for(let key in spawnrooms) {
            let roomname = spawnrooms[key];
            let room = Game.rooms[roomname];
            Memory.spawnqueue[room.name]       = Memory.spawnqueue[room.name] || {};
            // which creeps does this room have?
            let c = _.filter(Game.creeps, (creep) => creep.pos.roomName == room.name && (creep.memory.role == 'transporter' || creep.memory.role == 'upgrader' || creep.memory.role == 'extractor'));
            // Do I need transporter in this room?
            if (room.storage && (
                (room.storage.structureType == STRUCTURE_CONTAINER  && room.storage.store[RESOURCE_ENERGY] > 1000)
             || (room.storage.structureType == STRUCTURE_STORAGE && room.storage.store[RESOURCE_ENERGY] > 10000)
             )) {
                let transporterInThisRoom    = _.filter(c, (creep) => creep.memory.role == 'transporter' && (creep.ticksToLive > 200 || !creep.ticksToLive)).length;
                let transporterNeeded = 3;
                if(room.controller.level < 4)     transporterNeeded = 2;
                room.memory.configtransporter = transporterNeeded;
                if (transporterInThisRoom == 0) {
                    // emergency transporter
                    this.addToQueue(room.name,"transporter",this.getTransporterBody(room.energyAvailable),1);
                } else {
                    this.addToQueue(room.name,"transporter",this.getTransporterBody(room.energyCapacityAvailable),transporterNeeded-transporterInThisRoom);
                }
            }
            // Do I need upgrader in this room?
            if (!Game.flags['focusUpgradingOnlyHere'] || Game.flags['focusUpgradingOnlyHere'].pos.roomName == room.name) {
                if (room.storage && room.memory.controllercontainer && _.size(_.filter(Game.constructionSites,(c) => c.pos.roomName == room.name && [STRUCTURE_ROAD,STRUCTURE_RAMPART,STRUCTURE_WALL].indexOf(c.structureType) === -1)) == 0) {
                    let upgraderInThisRoom       = _.filter(c, (creep) => creep.memory.role == 'upgrader').length;
                    let upgraderNeeded = 1;
                    if (room.controller.level < 4)                                               upgraderNeeded = Math.floor(room.storage.store[RESOURCE_ENERGY] / 50000) + 4;
                    else if (room.controller.level < 8)                                          upgraderNeeded = Math.floor(Math.max(0,room.storage.store[RESOURCE_ENERGY]-100000) / 50000);
                    else if (room.controller.level == 8)                                         upgraderNeeded = 1;
                    upgraderNeeded = Math.min(5,upgraderNeeded);
                    this.addToQueue(room.name,"upgrader",this.getUpgraderBody(room),upgraderNeeded-upgraderInThisRoom);
                    if (upgraderNeeded > 0) {
                        if (room.memory.upgraderpathTime < Game.time - 2500) {
                            delete room.memory.upgraderpath;
                            room.memory.upgraderpathTime = Game.time;
                        }
                        if (!room.memory.upgraderpath) {
                            console.log('!!!!!!!!!!!!!!!!!! recalc of path');
                            let targetPos = {pos: room.storage.pos, range:1}
                            let startPos = Game.getObjectById(room.memory.controllercontainer).pos;
                            let paths = PathFinder.search(startPos,targetPos,{
                              // We need to set the defaults costs higher so that we
                              // can set the road cost lower in `roomCallback`
                              plainCost: 2,
                              swampCost: 10,
                              maxOps: 4000,
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
                                  } else if (s.structureType === STRUCTURE_CONTROLLER) {
                                    // Favor roads over plain tiles
                                        costs.set(s.pos.x-3, s.pos.y-3, 245);
                                        costs.set(s.pos.x-3, s.pos.y-2, 245);
                                        costs.set(s.pos.x-3, s.pos.y-1, 245);
                                        costs.set(s.pos.x-3, s.pos.y, 245);
                                        costs.set(s.pos.x-3, s.pos.y+1, 245);
                                        costs.set(s.pos.x-3, s.pos.y+2, 245);
                                        costs.set(s.pos.x-3, s.pos.y+3, 245);
                                        
                                        costs.set(s.pos.x+3, s.pos.y-3, 245);
                                        costs.set(s.pos.x+3, s.pos.y-2, 245);
                                        costs.set(s.pos.x+3, s.pos.y-1, 245);
                                        costs.set(s.pos.x+3, s.pos.y, 245);
                                        costs.set(s.pos.x+3, s.pos.y+1, 245);
                                        costs.set(s.pos.x+3, s.pos.y+2, 245);
                                        costs.set(s.pos.x+3, s.pos.y+3, 245);
                                        
                                        costs.set(s.pos.x-2, s.pos.y-3, 245);
                                        costs.set(s.pos.x-1, s.pos.y-3, 245);
                                        costs.set(s.pos.x, s.pos.y-3, 245);
                                        costs.set(s.pos.x+1, s.pos.y-3, 245);
                                        costs.set(s.pos.x+2, s.pos.y-3, 245);
                                        
                                        costs.set(s.pos.x-2, s.pos.y+3, 245);
                                        costs.set(s.pos.x-1, s.pos.y+3, 245);
                                        costs.set(s.pos.x, s.pos.y+3, 245);
                                        costs.set(s.pos.x+1, s.pos.y+3, 245);
                                        costs.set(s.pos.x+2, s.pos.y+3, 245);
                                  } else if (OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1 || s.structureType == STRUCTURE_CONTAINER) {
                                    costs.set(s.pos.x, s.pos.y, 255);
                                  }
                                });
                                return costs;
                              }
                            });
                            room.memory.upgraderpath = paths.path;
                        }
                        let distance = room.memory.upgraderpath.length;
                        let carrypartsneeded = Math.ceil((distance * 2 * _.filter(this.getUpgraderBody(room), b => b == WORK).length * Math.max(upgraderNeeded, upgraderInThisRoom) * UPGRADE_CONTROLLER_POWER * 1.05) / 100);
//                        console.log(room.name+ " debug information");
//                        console.log(room.name+ " distance "+distance);
//                        console.log(room.name+ " Work Parts "+_.filter(this.getUpgraderBody(room), b => b == WORK).length * upgraderNeeded);
//                        console.log(room.name+ " energy demand per tick "+_.filter(this.getUpgraderBody(room), b => b == WORK).length * upgraderNeeded * UPGRADE_CONTROLLER_POWER);
                        let maxbodypartsperhauler = Math.min(Math.floor(50/3),Math.floor(room.energyCapacityAvailable/150));
//                        console.log(room.name+ " carry parts needed: "+carrypartsneeded);
//                        console.log(room.name+ " maxbodypartsperhauler: "+maxbodypartsperhauler);
                        let haulers = Math.ceil(carrypartsneeded / maxbodypartsperhauler);
//                        console.log(room.name+ " haulers: "+haulers);
                        let carrypartsperhauler = Math.ceil(carrypartsneeded/haulers);
//                        console.log(room.name+ " carrypartsperhauler: "+carrypartsperhauler);
                        var upgraderHauler = _.filter(Game.my.creeps.upgraderHauler, (creep) => creep.room.name == room.name && (creep.ticksToLive > 100 || !creep.ticksToLive));
                        let haulersneeded = haulers-upgraderHauler.length;
//                        console.log(room.name+ " haulersneeded: "+haulersneeded);
                        this.addToQueue(room.name,"upgraderHauler",this.getUpgraderHaulerBody(carrypartsperhauler,room),haulersneeded,{}, 0);
                    }
                }
            }
            // Do I need extractor in this room?
            let extractorbuilding = cachedSearch.extractorOfRoom(room.name);
            if (extractorbuilding.length > 0) {
                let mineral = room.find(FIND_MINERALS)[0];
                if (mineral.mineralAmount > 0) {
                    let extractorInThisRoom      = _.filter(c, (creep) => creep.memory.role == 'extractor');
                    this.addToQueue(room.name,"extractor",this.getExtractorBody(room),1-extractorInThisRoom);
                }
            }
            // Do I need room slaves in this room?
            let roomslavesamount = 2;
            if (room.controller.level <= 3) {
                roomslavesamount = 4;
            }
            let slavesInThisRoom = _.filter(Game.my.creeps.slave, (creep) => creep.memory.roomslave == room.name).length;
            let roomslavesneeded = Math.max(1,_.filter(Game.spawns, (s) => s.pos.roomName == roomname).length)*roomslavesamount;
            if (room.controller.level <= 4) {
                // these rooms struggle with growth, so we spawn their roomslaves in a different room.
                this.addToQueue("globalhigh","slave",this.getSlaveBody(Game.my.managers.strategy.getHighestSpawnRoom(),"global"),roomslavesneeded - slavesInThisRoom,{roomslave: room.name});
            } else {
                this.addToQueue(room.name,"slave",this.getSlaveBody(room),roomslavesneeded - slavesInThisRoom,{roomslave: room.name});
            }
            
            // are Squad Units requested from this room specificly?
            Memory.squadsmetaroom = Memory.squadsmetaroom || {};
            Memory.squadsmetaroom[room.name] = Memory.squadsmetaroom[room.name] || {};
            for (let role in _.keys(Memory.squadsmetaroom[room.name])) {
                role = _.keys(Memory.squadsmetaroom[room.name])[role];
                this.addToQueue(room.name,role,    this.getSquadBody(role,room),     Memory.squadsmetaroom[room.name][role]);
            }
        }
        // Distribute harvesters to nearby spawnrooms
        for (let key in Game.my.mysources) {
            let source = Game.my.mysources[key];
            if (source.room.isMineReserved() || source.room.isMineClaimed() || source.room.isSK()) {
                let room = Game.rooms[source.my.deliveresTo];
                if (room.storage) { // RCL 1 / 2 hat eh keine harvester ^^ *hoff*
                    if (room.memory.sourceDistanceCacheTime < Game.time - 2500) {
                        delete room.memory.sourceDistanceCache;
                        delete room.memory.sourcePathCache;
                        room.memory.sourceDistanceCacheTime = Game.time;
                    }
                    room.memory.sourceDistanceCache = room.memory.sourceDistanceCache || {};
//                    room.memory.sourcePathCache = room.memory.sourcePathCache || {};
                    if (!room.memory.sourceDistanceCache[source.id]) {
                        let targetPos = false;
                        let containers = source.pos.findInRange(FIND_STRUCTURES,1,{filter: s => s.structureType == STRUCTURE_CONTAINER})
                        if (containers.length > 0) {
                            targetPos = {pos: containers[0].pos, range:1}
                        } else {
                            targetPos = {pos: source.pos, range:2};
                        }
                        let paths = PathFinder.search(room.storage.pos,targetPos,{
                          // We need to set the defaults costs higher so that we
                          // can set the road cost lower in `roomCallback`
                          plainCost: 2,
                          swampCost: 10,
                          maxOps: 4000,
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
                              } else if (OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1 || s.structureType == STRUCTURE_CONTAINER) {
                                costs.set(s.pos.x, s.pos.y, 255);
                              }
                            });
                            return costs;
                          }
                        });
                        room.memory.sourceDistanceCache[source.id] = paths.path.length;
//                        room.memory.sourcePathCache[source.id] = paths.path;
                    }
                    let distance = room.memory.sourceDistanceCache[source.id];
                    if (distance <= 250) {
                        let deploymenttime = distance + this.getHarvesterBody(room,source).length * 3 + 25;
                        var harvesterforsource = _.filter(Game.my.creeps.harvester, (creep) => creep.memory.target == source.id && (creep.ticksToLive > deploymenttime || !creep.ticksToLive));
                        let prio = Game.my.managers.infrastructure.getRoomPathsLengthSimple(source.pos.roomName,room.name);
                        if (harvesterforsource.length == 0) {
                            //console.log("adding harvester for "+source.room.name+" to "+room.name+" for "+source);
                            this.addToQueue(room.name,"harvester",this.getHarvesterBody(room,source),1,{target: source.id, targetPos: source.pos}, prio);
                        } else {
                            // Distribute sourcehaulers to nearby spawnrooms
                            //console.log("not adding harvester for "+source.room.name+" because of "+harvesterforsource[0]);
                            let carrypartsneeded = Math.ceil((distance * 2 * _.filter(this.getHarvesterBody(room,source), b => b == WORK).length * HARVEST_POWER * 1.05) / 100);
                            //let carrypartsneeded = Math.ceil((distance * 2 * _.filter(this.getUpgraderBody(room), b => b == WORK).length * Math.max(upgraderNeeded, upgraderInThisRoom) * UPGRADE_CONTROLLER_POWER * 1.2) / 100);

    //                        let maxbodypartsperhauler = Math.floor((room.energyCapacityAvailable - 150)/150);
                            let maxbodypartsperhauler = Math.min(Math.floor(50/3),Math.floor(room.energyCapacityAvailable/150));
                            let haulers = Math.ceil(carrypartsneeded / maxbodypartsperhauler);
                            let carrypartsperhauler = Math.ceil(carrypartsneeded/haulers);
/*                            if (source.id == '5873bba011e3e4361b4d627e') {
                                console.log('---');
                                console.log('distance: '+distance);
                                console.log('work parts: '+_.filter(this.getHarvesterBody(room,source), b => b == WORK).length);
                                console.log('carry parts needed: '+carrypartsneeded);
                                console.log('haulers: '+haulers);
                                console.log('carrypartsperhauler: '+carrypartsperhauler);
                                console.log('---');
                            }*/
                            var harvesterHaulerforsource = _.filter(Game.my.creeps.harvesterHauler, (creep) => creep.memory.source == source.id && (creep.ticksToLive > 100 || !creep.ticksToLive));
                            this.addToQueue(room.name,"harvesterHauler",this.getHarvesterHaulerBody(carrypartsperhauler,source,room),haulers-harvesterHaulerforsource.length,{source: source.id, sourcePos: source.pos}, prio);
                        }
                    } else {
                        console.log('spawnqueue > '+source.pos.roomName+' too far away from '+room.name);
                    }
                }
            } else {
                console.log('spawnqueue > not adding harvesters for '+source.pos.roomName);
            }
        }

        // Distribute claimers
        for (let key in Memory.claiming) {
            let claimingroomname = Memory.claiming[key];
            var claimerforroom = _.filter(Game.my.creeps.claimer, (creep) => creep.memory.target == claimingroomname);
            if (claimerforroom.length == 0) {
                let sourceSpawn = cachedSearch.nearbySpawn(claimingroomname,25,25,this.bodycost(this.getClaimerBody(claimingroomname)));
                let room = Game.spawns[sourceSpawn].room;
                this.addToQueue(room.name,"claimer",this.getClaimerBody(room),1,{target: claimingroomname});
            }
        }
        // Distribute neutral extractors
        for (let roomname in Memory.neutralextractors) {
            let mineral = Game.getObjectById(Memory.neutralextractors[roomname]);
            if (mineral && mineral.mineralAmount > 0 && Memory.whitelistrooms.indexOf(mineral.room.name) !== -1) {
                var ex = _.filter(Game.my.creeps.extractor, (creep) => creep.memory.target == mineral.id && (creep.ticksToLive > 200 || !creep.ticksToLive));
                if (ex.length == 0) {
                    var top = Math.max(0,mineral.pos.y-2);
                    var left = Math.max(0,mineral.pos.x-2);
                    var bottom = Math.min(49,mineral.pos.y+2);
                    var right = Math.min(49,mineral.pos.x+2);
                    let isthereacontainer = false;
                    mineral.room.lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true).forEach(function(lookObject) {
                        if(lookObject.structure.structureType == STRUCTURE_CONTAINER) {
                            isthereacontainer = true;
                        }
                    });
                    if (isthereacontainer) {
                        let sourceSpawn = cachedSearch.nearbySpawn(roomname,25,25,this.bodycost(this.getExtractorBody(false)));
                        let room = Game.spawns[sourceSpawn].room;
                        this.addToQueue(room.name,"extractor",this.getExtractorBody(false),1,{target: mineral.id});
                    }
                }
            }
        }
        // Distribute reservers
        for (let key in Memory.reserving) {
            let reservingroomname = Memory.reserving[key];
            var reserversforroom = _.filter(Game.my.creeps.reserver, (creep) => creep.memory.target == reservingroomname);
            if (reserversforroom.length == 0) {
                let sourceSpawn = cachedSearch.nearbySpawn(reservingroomname,25,25,1300);
                // is false if there is no "big enough" spawn
                if (sourceSpawn) {
                    let room = Game.spawns[sourceSpawn].room;
                    let prio = Game.my.managers.infrastructure.getRoomPathsLengthSimple(reservingroomname,room.name);
                    if (prio <= 4) {
                        this.addToQueue(room.name,"reserver",this.getReserverBody(room),1,{target: reservingroomname},prio);
                    }
                }
            }
        }
        // Distribute scouts
        for (let key in Memory.realwhitelistrooms) {
            let roomname = Memory.realwhitelistrooms[key];
            Memory.rooms[roomname] = Memory.rooms[roomname] || {};
        	let parsed = roomname.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
            if (!(parsed[1] % 10 === 0) || (parsed[2] % 10 === 0)) { // never scout highways with scouts
                if (!Game.rooms[roomname] 
                    && (
                        Memory.whitelistrooms.indexOf(roomname) !== -1  // either is on the whitelist.
                        || !Memory.rooms[roomname].scouted              // or is not yet scouted once.
                    )
                ) {
                    let scoutsforflag = _.filter(Game.my.creeps.scout, (creep) => creep.memory.target == roomname);
                    if (scoutsforflag.length == 0) {
                        let sourceSpawn = cachedSearch.nearbySpawn(roomname,25,25,this.bodycost(this.getScoutBody()));
                        let room = Game.spawns[sourceSpawn].room;
                        this.addToQueue(room.name,"scout",this.getScoutBody(room),1,{target: roomname});
                    }
                }
            }
        }
        // Distribute Powerharvester and PowerHarvesterHealer and PowerHarvesterHauler
        for (let key in Memory.powerRooms) {
            let roomname = Memory.powerRooms[key];
            let num = _.filter(Game.my.creeps.powerHarvester, (creep) => creep.memory.target == roomname && (creep.ticksToLive > 600 || !creep.ticksToLive));
            if (num.length < 1) {
                let sourceSpawn = cachedSearch.nearbySpawn(roomname,25,25,this.bodycost(this.getPowerHarvesterBody()));
                let room = Game.spawns[sourceSpawn].room;
                this.addToQueue(room.name,"powerHarvester",this.getPowerHarvesterBody(),1,{target: roomname});
            } 
            num = _.filter(Game.my.creeps.powerHarvesterHealer, (creep) => creep.memory.target == roomname && (creep.ticksToLive > 600 || !creep.ticksToLive));
            if (num.length < 2) {
                let sourceSpawn = cachedSearch.nearbySpawn(roomname,25,25,this.bodycost(this.getPowerHarvesterHealerBody()));
                let room = Game.spawns[sourceSpawn].room;
                this.addToQueue(room.name,"powerHarvesterHealer",this.getPowerHarvesterHealerBody(),2,{target: roomname});
            } 
            num = _.filter(Game.my.creeps.powerHarvesterHauler, (creep) => creep.memory.target == roomname && (!creep.ticksToLive));
            if (num.length < 3) {
                let sourceSpawn = cachedSearch.nearbySpawn(roomname,25,25,2500);
                let room = Game.spawns[sourceSpawn].room;
                this.addToQueue(room.name,"powerHarvesterHauler",this.getPowerHarvesterHaulerBody(room),3,{target: roomname});
            }
            
        }
        // Global Units - I don't care in which room they will get spawned.
        let room = Game.my.managers.strategy.getHighestSpawn().room;
        // Military Units
        if (!Memory.squadsmeta) Memory.squadsmeta = {};   
        let squadRoles = Game.my.managers.strategy.getSquadRoles();
        for (let role of squadRoles) {
            this.addToQueue("globalhigh",   role,    this.getSquadBody(role,room),     Memory.squadsmeta[role]);
        }
        // Workers
        this.addToQueue("globallow","slave",               this.getSlaveBody(room,"global"),                    Memory.population.slave - this.getQueueRoleNum('slave') - Game.my.creeps.slave.length);
//        this.addToQueue("globallow","hauler",              this.getHaulerBody(room,"global"),                   Math.min(Memory.population.hauler,Game.my.creeps.harvester.length) - Game.my.creeps.hauler.length);
        console.log('spawnqueue > '+(Game.cpu.getUsed()-start).toFixed(2));
    },
    getUpgraderBody: function(room) {
        let body = [];
        if (room.controller.level == 8) {
            body = [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE];
        } else {
            let upgraderbodypart    = [MOVE,WORK,WORK,CARRY];
            var bodysize = Math.max(1,Math.min(Math.floor(room.energyCapacityAvailable / this.bodycost(upgraderbodypart)),Math.floor(50/upgraderbodypart.length)));
            for(let i = 0; i < bodysize; i++) {
                body = body.concat(upgraderbodypart);
            }
            body.sort((a,b) => this.prio[a] - this.prio[b]);
        }
        return body;
    },
    getTransporterBody: function(energy) {
        let transporterbodypart = [CARRY,CARRY,MOVE];
        var bodysize = Math.min(Math.max(Math.floor(energy / this.bodycost(transporterbodypart)),3),Math.floor(50/transporterbodypart.length));
        let body = false;
        if (bodysize > 0) {
            body = new Array();
            for(let i = 0; i < bodysize; i++) {
                body = body.concat(transporterbodypart);
            }
            body.sort((a,b) => this.prio[a] - this.prio[b]);
        }
        return body;
    },
    getScoutBody: function() {
        return [MOVE];
    },
    getExtractorBody: function(room) {
        let extractorbody = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY];
        if (room.controller && room.controller.level <= 6)
            extractorbody = [MOVE,MOVE,MOVE,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY];
        return extractorbody;
    },
    getSquadBody: function(role,room) {
        if (role == 'squadsiegehealer')         return this.getSquadsiegehealerBody(room);
        if (role == 'squadsiegetank')           return this.getSquadsiegetankBody(room);
        if (role == 'squadsiegereserver')       return this.getSquadsiegereserverBody(room);
        if (role == 'squadsk')                  return this.getSquadskBody(room);
        if (role == 'squadbuddy')               return this.getSquadbuddyBody(room);
        if (role == 'squadskirmisher')          return this.getSquadskirmisherBody(room);
        if (role == 'squadboostedskirmisher')   return this.getBOOSTEDSquadskirmisherBody(room);
        if (role == 'squadboostedsk')           return this.getBOOSTEDSquadskBody(room);
        if (role == 'squadboostedbuddy')        return this.getBOOSTEDSquadbuddyBody(room);
        return false;
    },
    getBOOSTEDSquadskirmisherBody: function(room) {
        return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL];
    },
    getBOOSTEDSquadskBody: function(room) {
        return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,HEAL];
    },
    getBOOSTEDSquadbuddyBody: function(room) {
        return [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];
    },
    getSquadskirmisherBody: function(room) {
        let highestspawnlevel = Game.my.managers.strategy.getHighestSpawnLevel();
        let squadskirmisherbody     = [RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL]
        if (highestspawnlevel == 2) { // 550 
            squadskirmisherbody     = [RANGED_ATTACK,MOVE,MOVE,HEAL];
        } else if (highestspawnlevel == 3) { // 800
            squadskirmisherbody     = [RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE,MOVE,HEAL];
        } else if (highestspawnlevel == 4) { // 1300
            squadskirmisherbody     = [RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL];
        } else if (highestspawnlevel == 5) { // 1800
            squadskirmisherbody     = [RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL];
        } else if (highestspawnlevel == 6) { // 2300
            squadskirmisherbody     = [RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,RANGED_ATTACK,HEAL,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL];
        }
        return squadskirmisherbody;
    },
    getSquadbuddyBody: function(room) {
        let highestspawnlevel = Game.my.managers.strategy.getHighestSpawnLevel();
        let squadbuddybody          = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];
        if (highestspawnlevel == 3) { // 800
            squadbuddybody     = [MOVE,MOVE,HEAL,HEAL];
        } else if (highestspawnlevel == 4) { // 1300
            squadbuddybody     = [MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL];
        } else if (highestspawnlevel == 5) { // 1800
            squadbuddybody     = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];
        } else if (highestspawnlevel == 6) { // 2300
            squadbuddybody     = [TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];
        }
        return squadbuddybody;
    },
    getSquadsiegehealerBody: function(room) {
        let squadsiegehealerbody    = [RANGED_ATTACK,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,MOVE];
        return squadsiegehealerbody;
    },
    getSquadsiegereserverBody: function(room) {
        let squadsiegereserverbody  = [CLAIM,CLAIM,CLAIM,CLAIM,CLAIM,MOVE,MOVE,MOVE,MOVE,MOVE];
        return squadsiegereserverbody;
    },
    getSquadskBody: function(room) {
        let highestspawnlevel = Game.my.managers.strategy.getHighestSpawnLevel();
        let squadskbody             = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL,HEAL,HEAL];
        if (highestspawnlevel == 3) { // 800
            squadskbody     = [MOVE,MOVE,MOVE,ATTACK,RANGED_ATTACK,HEAL];
        } else if (highestspawnlevel == 4) { // 1300
            squadskbody     = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,HEAL];
        } else if (highestspawnlevel == 5) { // 1800
            squadskbody     = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,HEAL,HEAL];
        } else if (highestspawnlevel == 6) { // 2300
            squadskbody     = [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,RANGED_ATTACK,HEAL,HEAL,HEAL];
        }
        return squadskbody;
    },
    getSquadsiegetankBody: function(room) {
        let highestspawnlevel = Game.my.managers.strategy.getHighestSpawnLevel();
        let squadsiegetankbody  = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK];
        if (highestspawnlevel == 3) { // 800
            squadsiegetankbody  = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK];
        } else if (highestspawnlevel == 4) { // 1300
            squadsiegetankbody  = [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,RANGED_ATTACK,HEAL];
        }
        return squadsiegetankbody;
    },
    getPowerHarvesterBody: function() {
        return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,ATTACK,MOVE];
    },
    getPowerHarvesterHealerBody: function(room) {
        return [MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL,HEAL];
    },
    getPowerHarvesterHaulerBody: function(room) {
        let haulerbodypart       = [MOVE,MOVE,CARRY,CARRY,CARRY,CARRY];
        var bodysize = Math.min(Math.floor(room.energyCapacityAvailable / this.bodycost(haulerbodypart)),Math.floor(50/haulerbodypart.length));
        if (bodysize > 0) {
            let body = [];
            for(let i = 0; i < bodysize; i++) {
                body = body.concat(haulerbodypart);
            }
            body.sort((a,b) => this.prio[a] - this.prio[b]);
            return body;
        }
        return false;
    },
    getSlaveBody: function(room,scope="room") {
        let slavebodypart       = [MOVE,WORK,CARRY];
        console.log(room);
        let energy = SPAWN_ENERGY_CAPACITY + CONTROLLER_STRUCTURES.extension[Math.max(room.controller.level-1,0)] * EXTENSION_ENERGY_CAPACITY[Math.max(room.controller.level-1,0)];
        if (scope == "room") {
            energy = room.energyCapacityAvailable
        }
        if (Game.my.creeps.slave.length < Memory.population.slave / 2) {
            energy = room.energyAvailable;
        }

        var bodysize = Math.min(Math.floor(energy / this.bodycost(slavebodypart)),Math.floor(50/slavebodypart.length));
        if (bodysize > 0) {
            let body = new Array();
            for(let i = 0; i < bodysize; i++) {
                body = body.concat(slavebodypart);
            }
            body.sort((a,b) => this.prio[a] - this.prio[b]);
//            console.log("slave body "+JSON.stringify(body));
            return body;
        }
        return false;
    },
    getHaulerBody: function(room,scope="room") {
        let haulerbodypart       = [MOVE,MOVE,CARRY,CARRY,CARRY,CARRY];
        let energy = SPAWN_ENERGY_CAPACITY + CONTROLLER_STRUCTURES.extension[Math.max(room.controller.level-1,0)] * EXTENSION_ENERGY_CAPACITY[Math.max(room.controller.level-1,0)];
        if (scope == "room") {
            energy = room.energyCapacityAvailable
        }
        
        var bodysize = Math.min(Math.floor((energy-this.bodycost([WORK,MOVE])) / this.bodycost(haulerbodypart)),Math.floor(48/haulerbodypart.length));
        if (bodysize > 0) {
            let body = new Array(WORK,MOVE);
            for(let i = 0; i < bodysize; i++) {
                body = body.concat(haulerbodypart);
            }
            body.sort((a,b) => this.prio[a] - this.prio[b]);
            return body;
        }
        return false;
    },
    getReserverBody: function(room) {
        let reserverbodypart    = [MOVE,CLAIM];
        var bodysize = Math.min(Math.floor(room.energyCapacityAvailable / this.bodycost(reserverbodypart)),Math.floor(50/reserverbodypart.length),10);
        if (bodysize >= 2) {
            let body = new Array();
            for(let i = 0; i < bodysize; i++) {
                body = body.concat(reserverbodypart);
            }
            body.sort((a,b) => this.prio[a] - this.prio[b]);
            return body;
        }
        return false;
    },
    getClaimerBody: function(room) {
        return [MOVE,CLAIM];
    },
    getHarvesterBody: function(room,source) {
        let useCPUsavingHarvesters = false;
        let harvesterbodys = {};
        if (useCPUsavingHarvesters) {
            harvesterbodys = {
                1500: [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
                3000: [WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE,MOVE,MOVE],
                4000: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY,WORK,WORK,WORK,WORK,WORK,WORK,WORK],
            };
        } else {
            harvesterbodys = {
                1500: [WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE],
                3000: [WORK,WORK,WORK,WORK,WORK,CARRY,MOVE,MOVE,MOVE],
                4000: [TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,TOUGH,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,MOVE,CARRY,WORK,WORK,WORK,WORK,WORK,WORK,WORK],
            };
        }
        return harvesterbodys[source.energyCapacity]
    },
    getUpgraderHaulerBody: function(bodysize,room) {
        let haulerbodypart       = [MOVE,CARRY,CARRY];
        let body = [];
        for(let i = 0; i < bodysize; i++) {
            body = body.concat(haulerbodypart);
        }
        body.sort((a,b) => this.prio[a] - this.prio[b]);
        return body;
    },
    getHarvesterHaulerBody: function(bodysize,source,room) {
        let haulerbodypart       = [MOVE,CARRY,CARRY];
        let body = [];
        for(let i = 0; i < bodysize; i++) {
            body = body.concat(haulerbodypart);
        }
        body.sort((a,b) => this.prio[a] - this.prio[b]);
        return body;
    },
    bodycost: function(body) {
        var cost = 0;
        _.forEach(body, function(part) { cost += BODYPART_COST[part]; });  
        return cost;
    }

}
profiler.registerObject(squadQueueManager,'squadQueueManager');
module.exports = squadQueueManager;
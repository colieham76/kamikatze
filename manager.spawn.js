"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');
var strategyManager = require('manager.strategy');
const jobFinder = require('manager.jobs');
var spawnManager = {
    init: false,
    spawninit: false,
    updateContainerInit: false,
    slaves: -1,
    reserver: -1,
    powerharvester: -1,
    powerharvesterhealer: -1,
    scouts: -1,
    squadhealer: -1,
    squadfighter: -1,
    harvester: -1,
    hauler: -1,
    extractorInThisRoom: {},
    transporterInThisRoom: {},
    upgraderInThisRoom: {},
    extractor: {},
    roomslaves: {},
    roomhauler: {},
    energyInContainer: -1,
    energyMinContainer: Infinity,
    energyMaxContainer: -1,
    energylayingaround: -1,
    mysources: [], 
    output: [],
    ignorescoutroom: [],
    doInit: function() {
        this.init = true;
        this.powerharvester =       _.filter(Game.my.creeps.powerHarvester, (creep) => (creep.ticksToLive > 600 || !creep.ticksToLive));
        this.powerharvesterhealer = _.filter(Game.my.creeps.powerHarvesterHealer, (creep) => (creep.ticksToLive > 200 || !creep.ticksToLive));
        this.sh =                   Game.my.creeps.slave.concat(Game.my.creeps.hauler);
        this.ignorescoutroom = [];
    },
    doSpawnInit: function() {
        this.spawninit = true;
        Game.bucketManager.callfrombucket(Game.my.managers.spawnqueue,Game.my.managers.spawnqueue.checkQueue,{},"spawns-queue");
    },
    calcTransporterPath: function(room) {
        return false;
        if (room.name != "W88S68") return false;
        if (!room.storage) return false;
        let transportertargets = [];
        for(let key in room.memory.transportertargets) {
            let tmp = Game.getObjectById(room.memory.transportertargets[key]);
            if (tmp) transportertargets.push(tmp);
        }
        let start = room.storage.pos;
        let totalpath = [];
        let total = transportertargets.length;
        for(let i=0;i<total;i++) {
            let next = start.findClosestByPath(transportertargets, {ignoreCreeps: true});
            console.log('next: '+JSON.stringify(next));
            _.remove(transportertargets,x => x.id == next.id);
            let path = start.findPathTo(next, {range: 1, ignoreCreeps: true});
            console.log('pathpart: '+JSON.stringify(path));
            if (path.length > 0) {
                totalpath = totalpath.concat(path);
                start = new RoomPosition(path[path.length-1].x,path[path.length-1].y,room.name);
            }
        }
        console.log(room.name);
        room.visual.poly(totalpath, {stroke: '#aa0', strokeWidth: .15, opacity: .8, lineStyle: 'dashed'})
    },
    initRooms: function() {
        let spawnrooms = Game.my.managers.strategy.getCoreRooms();
        for(let key in spawnrooms) {
            let roomname = spawnrooms[key];
            if (Game.rooms[roomname].memory.storagecontainer) {
                if (!Game.rooms[roomname].storage) {
                    Game.rooms[roomname].storage = Game.getObjectById(Game.rooms[roomname].memory.storagecontainer);
                }
            } else {
                console.log('initRooms > '+roomname+' > checking for storage container');
                let spawns = cachedSearch.spawnsOfRoom(roomname);
                console.log(JSON.stringify(spawns));
                for(let key in spawns) {
                    let spawn = spawns[key];
                    console.log('initRooms > '+roomname+' > '+spawn.name);
                    var top = Math.max(0,spawn.pos.y-1);
                    var left = Math.max(0,spawn.pos.x-1);
                    var bottom = Math.min(49,spawn.pos.y+1);
                    var right = Math.min(49,spawn.pos.x+1);
                    Game.rooms[roomname].lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true).forEach(function(lookObject) {
                        console.log('initRooms > '+roomname+' > checking for storage container > found '+lookObject.structure.structureType);
                        if(lookObject.structure.structureType == STRUCTURE_CONTAINER) {
                            Game.rooms[roomname].memory.storagecontainer = lookObject.structure.id;
                        }
                    });
                }
            }
            if (!Game.rooms[roomname].memory.transporterpath) {
                this.calcTransporterPath(Game.rooms[roomname]);
            } else {
                Game.rooms[roomname].visual.poly(Game.rooms[roomname].memory.transporterpath, {stroke: '#ff0', strokeWidth: .15, opacity: .2, lineStyle: 'dashed'})
            }
        }
    },
    manageSpawn: function(name) {
        if (!this.init) {               this.doInit();        }
        if (!this.spawninit) {          this.doSpawnInit();        }
        let debug = false;
        let result = false;
        mydebugger.enable({name: 'manageSpawn '+name});
        var spawn = Game.spawns[name];
        if (spawn.spawning === null) {
            let roles = [
                'transporter',
                'squadskirmisher',
                'squadsk',
                'squadbuddy',
                'squadboostedskirmisher',
                'squadboostedsk',
                'squadboostedbuddy',
                'squadsiegehealer',
                'squadsiegetank',
                'squadsiegereserver',
                'claimer',
                'slave',
                'harvesterHauler',
                'harvester',
                'upgraderHauler',
                'upgrader',
                'hauler',
                'extractor',
                'reserver',
                'scout',
                'powerHarvester',
                'powerHarvesterHealer',
                'powerHarvesterHauler'
            ];
            if (Game.my.creeps['slave'].length < 5) {
                // emergency mode:
                roles = [
                    'transporter',
                    'slave',
                    'harvesterHauler',
                    'harvester',
                    'upgraderHauler',
                    'upgrader',
                ];
            }
            let brea = false;
            for(let role of roles) {
                let conti = true;
                brea = false;
                if (debug) console.log('Checking global high for '+role);
                if (Memory.spawnqueue["globalhigh"][role] && Memory.spawnqueue["globalhigh"][role].length > 0) {
                    let name = role + "-" + Memory.creepNum % 1000;
                    _.sortBy(Memory.spawnqueue["globalhigh"][role],(e) => e.prio);
                    let body = Memory.spawnqueue["globalhigh"][role][0].body;
                    if(spawn.room.energyCapacityAvailable >= this.bodycost(body)) {
                        result = true;
                        brea = true;
                        if(spawn.canCreateCreep(body, name) == OK) {
                            let newName = spawn.createCreep(body, name, Memory.spawnqueue["globalhigh"][role][0].memory);
                            Memory.creepNum++;
                            conti = false;
                            console.log('<span style="color:#12ba00">'+spawn.name+' is spawning new ' + role + ' (' + this.bodycost(body) + ', globalhigh, '+Memory.spawnqueue["globalhigh"][role][0].prio+')</span>');
                            Memory.spawnqueue["globalhigh"][role].shift();
                            delete spawn.room.memory.transportertargetsCurrent;
                            break;
                        } else {
                            console.log('<span style="color:#FF0000">'+spawn.room.name+' has not enough resources for new ' + role + ' (' + this.bodycost(body) + ', globalhigh, '+Memory.spawnqueue["globalhigh"][role][0].prio+')</span>');
                        }
                    } else {
                        console.log('<span style="color:#FF0000">'+spawn.room.name+' has a too big creep in its queue: ' + role + ' (' + this.bodycost(body) + ', globalhigh, '+Memory.spawnqueue["globalhigh"][role][0].prio+') with canCreateCreep result: '+spawn.canCreateCreep(body, name)+'</span>');
                        if (debug) console.log('Size does matter after all... '+this.bodycost(body));
                    }
                }
                if (conti) {
                    if (debug) console.log('Checking room for '+role);
                    if (Memory.spawnqueue[spawn.room.name][role] && Memory.spawnqueue[spawn.room.name][role].length > 0) {
                        let name = role + "-" + Memory.creepNum % 1000;
                        _.sortBy(Memory.spawnqueue[spawn.room.name][role],(e) => e.prio);
                        let body = Memory.spawnqueue[spawn.room.name][role][0].body;
                        if(spawn.room.energyCapacityAvailable >= this.bodycost(body)) {
                            result = true;
                            brea = true;
                            if(spawn.canCreateCreep(body, name) == OK) {
                                let newName = spawn.createCreep(body, name, Memory.spawnqueue[spawn.room.name][role][0].memory);
                                Memory.creepNum++;
                                conti = false;
                                console.log('<span style="color:#12ba00">'+spawn.name+' is spawning new ' + role + ' (' + this.bodycost(body) + ', room, '+Memory.spawnqueue[spawn.room.name][role][0].prio+')</span>');
                                Memory.spawnqueue[spawn.room.name][role].shift();
                                delete spawn.room.memory.transportertargetsCurrent;
                                break;
                            } else {
                                console.log('<span style="color:#FF0000">'+spawn.room.name+' has not enough resources for new ' + role + ' (' + this.bodycost(body) + ', room, '+Memory.spawnqueue[spawn.room.name][role][0].prio+')</span>');
                            }
                        } else {
                            console.log('<span style="color:#FF0000">'+spawn.room.name+' has a too big creep in its queue: ' + role + ' (' + this.bodycost(body) + ', room, '+Memory.spawnqueue[spawn.room.name][role][0].prio+') with canCreateCreep result: '+spawn.canCreateCreep(body, name)+'</span>');
                          if (debug) console.log('Size does matter after all... '+this.bodycost(body));
                        }
                    }
                }
                if (conti) {
                    if (debug) console.log('Checking globallow for '+role);
                    if (Memory.spawnqueue["globallow"][role] && Memory.spawnqueue["globallow"][role].length > 0) {
                        let name = role + "-" + Memory.creepNum % 1000;
                        _.sortBy(Memory.spawnqueue["globallow"][role],(e) => e.prio);
                        let body = Memory.spawnqueue["globallow"][role][0].body;
                        if(spawn.room.energyCapacityAvailable >= this.bodycost(body)) {
                            result = true;
                            brea = true;
                            if(spawn.canCreateCreep(body, name) == OK) {
                                let newName = spawn.createCreep(body, name, Memory.spawnqueue["globallow"][role][0].memory);
                                Memory.creepNum++;
                                console.log('<span style="color:#12ba00">'+spawn.name+' is spawning new ' + role + ' (' + this.bodycost(body) + ', globallow, '+Memory.spawnqueue["globallow"][role][0].prio+')</span>');
                                Memory.spawnqueue["globallow"][role].shift();
                                delete spawn.room.memory.transportertargetsCurrent;
                                break;
                            } else {
                                console.log('<span style="color:#FF0000">'+spawn.room.name+' has not enough resources for new ' + role + ' (' + this.bodycost(body) + ', globallow, '+Memory.spawnqueue["globallow"][role][0].prio+')</span>');
                            }
                        } else {
                            console.log('<span style="color:#FF0000">'+spawn.room.name+' has a too big creep in its queue: ' + role + ' (' + this.bodycost(body) + ', globallow, '+Memory.spawnqueue["globallow"][role][0].prio+') with canCreateCreep result: '+spawn.canCreateCreep(body, name)+'</span>');
                            if (debug) console.log('Size does matter after all... '+this.bodycost(body));
                        }
                    }
                }
                if (brea) {
                    break;
                }
            }
            if (!brea) {
                console.log('<span style="color:#FF0000">'+spawn.room.name+' has nothing to spawn: </span>');
//                console.log('<span style="color:#FF0000">globalhigh: '+JSON.stringify(Memory.spawnqueue["globalhigh"])+'</span>');
//                console.log('<span style="color:#FF0000">room: '+JSON.stringify(Memory.spawnqueue[spawn.room.name])+'</span>');
//                console.log('<span style="color:#FF0000">globalhigh: '+JSON.stringify(Memory.spawnqueue["globalhigh"])+'</span>');
            }
        }
        mydebugger.end(false);
        return result;
    },
    manageAllTerminals: function() {
        let rooms = Game.my.managers.strategy.getCoreRooms();
        for (let name in rooms) {
            name = rooms[name];
            if (Game.rooms[name].terminal) {
                Game.my.managers.terminals.manage(name);
            }
        }
    },
    towersOfRoom: function(room) {
        // Wenn Feinde in naher Reichweite -> Angreifen
        // Wenn Feinde verletzt -> Angreifen
        // Ansonsten heilen
        // Ansonsten reparieren
        // TODO: verbessertes Target-Pick für feinde
        // --> punktesystem - je weiter weg von allen anderen feinden, desto höher die punkte
        // --> punktesystem - je näher am tower, desto höher die punkte.
        // --> focusfire
        let repairtarget = false;
        let healtarget = false;
        let closestHostile = false;
        room.memory.toBeRepaired = room.memory.toBeRepaired || [];
        if (room.getEnemies().length > 0) {
            healtarget = room.find(FIND_MY_CREEPS, { filter: function(creep) { return (creep.memory.retreat || (creep.memory.role == "squadskirmisher" && creep.hits <= creep.hitsMax - 300)); }});
            for(let key in room.memory.toBeRepaired) {
                let tmprepairtarget = Game.getObjectById(room.memory.toBeRepaired[key].id);
                if (tmprepairtarget && [STRUCTURE_WALL,STRUCTURE_RAMPART].indexOf(tmprepairtarget.structureType) !== -1 && (!repairtarget || repairtarget.hits > tmprepairtarget.hits)) {
                    repairtarget = tmprepairtarget;
                }
            }
            closestHostile = new RoomPosition(25,25,room.name).findClosestByRange(FIND_HOSTILE_CREEPS, {
                filter: (c) => (c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0 || c.getActiveBodyparts(WORK) > 0 || c.getActiveBodyparts(HEAL) > 0 || c.getActiveBodyparts(CLAIM) > 0 || c.hits < 100 || c.owner.username == "Invader")
            });
            if (closestHostile && closestHostile.owner.username != "Invader") {
                Game.my.managers.infrastructure.doWallRampartCheckForRoom(room.name);
            }
        } else {
            healtarget = room.find(FIND_MY_CREEPS, { filter: function(creep) { return (creep.hits < creep.hitsMax); }});
            if (healtarget.length == 0 && room.memory.toBeRepaired.length > 0) {
                let repairkey = false;
                for(let key in room.memory.toBeRepaired) {
                    let tmprepairtarget = Game.getObjectById(room.memory.toBeRepaired[key].id);
                    if (tmprepairtarget && (!repairtarget || repairtarget.hits > tmprepairtarget.hits)) {
                        repairtarget = tmprepairtarget;
                        repairkey = key;
                    }
                }
                if (repairtarget && repairtarget.hits > room.memory.toBeRepaired[repairkey].targethealth) {
                    room.memory.toBeRepaired.splice(repairkey,1);
                    repairtarget = false;
                }
            }
        }
        var towers = cachedSearch.towersOfRoom(room.name);
        for(var key in towers) {
            if (closestHostile && (towers[key].pos.getRangeTo(closestHostile) < 15 || closestHostile.owner.username == "Invader" || closestHostile.hits < closestHostile.hitsMax)) {
                if (healtarget.length > 0) {
                    towers[key].heal(healtarget[0]);
                } else if (
                    !repairtarget 
                    || !repairtarget.pos.inRangeTo(closestHostile,4) 
                    || closestHostile.pos.findInRange(FIND_MY_CREEPS,3,{filter: c => c.getActiveBodyparts(RANGED_ATTACK) > 0 || c.getActiveBodyparts(ATTACK) > 0}).length > 0
                    || closestHostile.pos.findInRange(FIND_HOSTILE_CREEPS,3,{filter: c => c.getActiveBodyparts(HEAL) > 0}).length == 0
                ) {
                    towers[key].attack(closestHostile);
                } else {
                    towers[key].repair(repairtarget);
                }
            } else if (towers[key].energy >= (towers[key].energyCapacity * 0.5)) {
                if (healtarget.length > 0) {
                    towers[key].heal(healtarget[0]);
                } else if(repairtarget) {
                    towers[key].repair(repairtarget);
                }
            }  
        }
    },
    towerAllRooms: function() {
        let rooms = strategyManager.getCoreRooms();
        for (let room of rooms) {
            room = Game.rooms[room];
            this.towersOfRoom(room);
        }
    },
    manageAllRooms: function(jobFinder) {
        let setSkipTime = true;
        Game.my.spawnLowestSpawning = 9999999;
        for (let name in Game.rooms) {
            if (Game.rooms[name].controller && Game.rooms[name].controller.my) {
//                console.log('---- '+name+" ----");
                spawnManager.manageRoom(name);
                let spawns = cachedSearch.spawnsOfRoom(name);
                let done = false;
                if (Memory.skipSpawnsUntil > Game.time) {
                    done = true;
                }
                for(let key in spawns) {
                    if (!done && Game.spawns[spawns[key].name].spawning == null) {
                        let result = spawnManager.manageSpawn(spawns[key].name);
                        if (result) {
                            setSkipTime = false;
                        }
                        done = true;
                    }
                    if (Game.spawns[spawns[key].name].spawning != null) {
                        Game.my.spawnLowestSpawning = Math.min(Game.spawns[spawns[key].name].spawning.remainingTime,Game.my.spawnLowestSpawning);;
                    }
                    this.status(spawns[key].name,false);
                }
            }
        }
        if (Memory.skipSpawnsUntil <= Game.time) {
            if (setSkipTime) {
    //            console.log("spawnLowestSpawning > "+Game.my.spawnLowestSpawning);
                if (Game.my.spawnLowestSpawning == 9999999) Game.my.spawnLowestSpawning = 0;
                Memory.skipSpawnsUntil = Game.time + Math.min(25,Game.my.creepLowestTTL,Game.my.spawnLowestSpawning);
            } else {
                Memory.skipSpawnsUntil = Game.time;
            }
        }
        console.log("skipping spawns for "+(Memory.skipSpawnsUntil-Game.time));
    },
    bodycost: function(body) {
        var cost = 0;
        _.forEach(body, function(part) { cost += BODYPART_COST[part]; });  
        return cost;
    },
    doinfrastructureforroom: function(roomname) {
        Game.my.managers.infrastructure.doInfrastructureForSpawnRoom(Game.rooms[roomname]);
        var spawns = cachedSearch.spawnsOfRoom(roomname);
        for (let key in spawns) {
            let spawn = spawns[key];
            Game.my.managers.infrastructure.doInfrastructureForSpawn(spawn.name)
        }
        Memory.infrastructureRooms = Memory.infrastructureRooms.concat(Array(roomname));
    },
    /** @param {Creep} creep **/
    status: function(name,debug = false) {
        if (Memory.showSpawnStatus === false) return false;
        if (debug) mydebugger.enable({name: 'manageSpawn'});
        mydebugger.str("sub function start of status");
        var spawn = Game.spawns[name];
        let text = "";
        if (spawn.spawning !== null) {
            var body = {};
            Game.creeps[Game.spawns[name].spawning.name].body.forEach(function(elem){ if(!body[elem.type]) body[elem.type] = 0; body[elem.type] = body[elem.type]+1; });
            var bodytext = "";
            for (let key in body) {
                bodytext += body[key]+"x "+key+", ";
            }
            if (Game.creeps[spawn.spawning.name].memory.target) {
                let target = Game.creeps[spawn.spawning.name].memory.target;
                let IDtarget = Game.getObjectById(target);
                if (IDtarget) {
                    target = IDtarget.pos;
                }
                text = '<progress value="'+(spawn.spawning.needTime-spawn.spawning.remainingTime)+'" max="'+spawn.spawning.needTime+'">'+spawn.spawning.remainingTime+'/'+spawn.spawning.needTime+'</progress> ' + name + " is building " + Game.creeps[spawn.spawning.name].memory.role+" ("+target+", "+bodytext.substring(0,bodytext.length-2)+")";
            } else {
                text = '<progress value="'+(spawn.spawning.needTime-spawn.spawning.remainingTime)+'" max="'+spawn.spawning.needTime+'"> </progress> ' + name + " is building " + Game.creeps[spawn.spawning.name].memory.role+" ("+bodytext.substring(0,bodytext.length-2)+")";
            }
            console.log(text);
            spawn.room.visual.text(Game.creeps[spawn.spawning.name].memory.role,spawn.pos.x,spawn.pos.y,{font: "bold 0.5", color: '#b6b6b6', background: '#3f3f3f'});
        }
        mydebugger.str("sub function end of status");
        if (debug) return mydebugger.end(false);
    },
    doUpdateContainerInit: function() {
        this.updateContainerInit = true;
        this.output = [];
        Memory.energyInContainer = 0;
        Memory.energyMinContainer = Infinity;
        Memory.energyMaxContainer = 0;
        Memory.energylayingaround = 0;
    },
    exploreWhitelistRoom: function(room) {
        if (!this.init) {            this.doInit();        }
        room.my = room.my || {};
        Memory.updateContainerTick = Memory.updateContainerTick || 0
        if (Memory.updateContainerTick < Game.time - 10) {
            if (!this.updateContainerInit) {            this.doUpdateContainerInit();        }
            this.updateContainers(room);
        }
        room.memory.exploreHostilesTick = room.memory.exploreHostilesTick || 0;
        if (room.memory.exploreHostilesTick < Game.time - 10) {
            this.exploreHostiles(room);
        } else {
            room.my.enemies = [];
        }
    },
    findmysources: function() {
        for(let key in Memory.jobrooms) {
            let roomname = Memory.jobrooms[key];
            if (Game.rooms[roomname] && Game.rooms[roomname].isMine()) {
                if (!Game.rooms[roomname].isHighway()) {
                    if (Game.rooms[roomname].isSK()) {
                        let sksquads = _.filter(Memory.squads,s => s.targetRoom == roomname && s.modus == "combat");
                        if (sksquads.length > 0) {
                            this.mysources = this.mysources.concat(cachedSearch.sourcesOfRoom(roomname));
                        }
                    } else {
                        this.mysources = this.mysources.concat(cachedSearch.sourcesOfRoom(roomname));
                    }
                }
            }
        }
        for (let key in this.mysources) {
            this.mysources[key].my = this.mysources[key].my || {};
            this.mysources[key].my.deliveresTo = cachedSearch.sourceDeliveresToRoom(this.mysources[key].id);
            this.mysources[key].room.visual.text('x', this.mysources[key].pos);
        }
        Game.my.mysources = this.mysources;
    },
    printoutput: function() {
        if (Memory.showEnergyOutput) {
            this.output = _.sortBy(this.output,o => o.amount);
            for(let key in this.output) {
                console.log(this.output[key].output);
            }
        }
//        console.log('Energy in Container: '+Memory.energyInContainer+' (Min: '+Memory.energyMinContainer+' Max: '+Memory.energyMaxContainer+') >>> ' + Memory.energylayingaround + " energy laying around >>> "+this.mysources.length+" sources known");
//        console.log("currently "+_.keys(Game.constructionSites).length+" construction sites");
    },
    powerRooms: function() {
        for (let key in Memory.powerRooms) {
            let room = Game.rooms[Memory.powerRooms[key]];
            if (!room) continue;
            const target = room.find(FIND_STRUCTURES, {
                filter: (structure) =>
                    (structure.structureType === STRUCTURE_POWER_BANK)
            });
            if (target.length == 0) {
                Memory.powerRooms.splice(key,1)
                continue;
            }
            let active = false;
            let powerHarvester = _.filter(Game.my.creeps.powerHarvester,(c) => c.memory.target == room.name);
            let powerHarvesterHealer = _.filter(Game.my.creeps.powerHarvesterHealer,(c) => c.memory.target == room.name);
            let powerHarvesterHauler = _.filter(Game.my.creeps.powerHarvesterHauler,(c) => c.memory.target == room.name);
            if (target[0].ticksToDecay > 1000 || powerHarvester.length > 0) {
                if (target[0].hits / 666 < target[0].ticksToDecay) {
                    active = true;
                }
            }
            const current = Math.round(target[0].hits / target[0].hitsMax * 100000) / 1000;
            const last = Math.round(Memory.lastPowerBankStatus[room.name] / target[0].hitsMax * 100000) / 1000;
            let time = Math.round(target[0].ticksToDecay / 5000 * 100000) / 1000;
            let speed = Math.round(((current - last) + (Math.round(1 / 5000 * 100000) / 1000)) * 1000) / 1000;
            if (Memory.lastPowerBankStatus[room.name] != target[0].hits) {
                const dmgdone = (Memory.lastPowerBankStatus[room.name] - target[0].hits);
                if (target[0].ticksToDecay < Math.round(target[0].hits/dmgdone)) {
                    var color = '#FF0000';
                } else {
                    var color = '#12ba00';
                }
                console.log('POWERBANK OF '+room.name+' is '+active+': <span style="color:'+color+'">ticks needed for destruction with current speed: ' + Math.round(target[0].hits/dmgdone) + " ticks | ticks left: " + target[0].ticksToDecay + " ticks</span>");
            } else {
                console.log('POWERBANK OF '+room.name+' is '+active+': <span style="color:#FF0000">ticks needed for destruction with current speed: --- ticks | ticks left: ' + target[0].ticksToDecay + " ticks</span>");
            }
            console.log(powerHarvester.length+" powerHarvester, "+powerHarvesterHealer.length+" powerHarvesterHealer and "+powerHarvesterHauler.length+" powerHarvesterHauler are on the mission");
            Memory.lastPowerBankStatus[room.name] = target[0].hits;
        }
    },
    addToJobRooms: function(roomname) {
        if (this.debug) console.log("trying to add "+roomname+" to Memory.jobrooms");
        if (Memory.avoid.indexOf(roomname) === -1 && Memory.whitelistrooms.indexOf(roomname) !== -1) {
            if (Memory.jobrooms.indexOf(roomname) === -1) {
                if (this.debug) console.log("added "+roomname+" to Memory.jobrooms");
                Memory.jobrooms = Memory.jobrooms.concat(roomname);
            }
        } else {
            this.removeFromJobRooms(roomname);
        }
    },
    removeFromJobRooms: function(roomname) {
        if (this.debug) console.log("trying to remove "+roomname+" from Memory.jobrooms");
        if (Memory.jobrooms.indexOf(roomname) !== -1) {
            if (this.debug) console.log("removed "+roomname+" from Memory.jobrooms");
            Memory.jobrooms.splice(Memory.jobrooms.indexOf(roomname),1);
        }
    },
    addToReservingRooms: function(roomname) {
        if (this.debug) console.log("trying to add "+roomname+" to Memory.reserving");
        if (Memory.avoid.indexOf(roomname) === -1 && Memory.whitelistrooms.indexOf(roomname) !== -1) {
            if (Memory.reserving.indexOf(roomname) === -1) {
                if (this.debug) console.log("added "+roomname+" to Memory.reserving");
                Memory.reserving = Memory.reserving.concat(roomname);
            }
        } else {
            this.removeFromReservingRooms(roomname);
        }
    },
    removeFromReservingRooms: function(roomname) {
        if (this.debug) console.log("trying to remove "+roomname+" from Memory.reserving");
        if (Memory.reserving.indexOf(roomname) !== -1) {
            if (this.debug) console.log("removed "+roomname+" from Memory.reserving");
            Memory.reserving.splice(Memory.reserving.indexOf(roomname),1);
        }
    },
    addToReservingInfrastructureRooms: function(roomname) {
        if (this.debug) console.log("trying to add "+roomname+" to Memory.reservinginfrastructure");
        if (Memory.avoid.indexOf(roomname) === -1 && Memory.whitelistrooms.indexOf(roomname) !== -1) {
            if (Memory.reservinginfrastructure.indexOf(roomname) === -1) {
                if (this.debug) console.log("added "+roomname+" to Memory.reservinginfrastructure");
                Memory.reservinginfrastructure = Memory.reservinginfrastructure.concat(roomname);
            }
        } else {
            this.removeFromReservingInfrastructureRooms(roomname);
        }
    },
    removeFromReservingInfrastructureRooms: function(roomname) {
        if (this.debug) console.log("trying to remove "+roomname+" from Memory.reservinginfrastructure");
        if (Memory.reservinginfrastructure.indexOf(roomname) !== -1) {
            if (this.debug) console.log("removed "+roomname+" from Memory.reservinginfrastructure");
            Memory.reservinginfrastructure.splice(Memory.reservinginfrastructure.indexOf(roomname),1);
        }
    },
    exploreHostiles: function(room) {
        room.my.enemies = room.find(FIND_HOSTILE_CREEPS);
        if (_.size(_.filter(room.my.enemies, c => c.owner.username != "Source Keeper")) == 0) {
            if (room.areThereEnemyConstructionSites()) {
                Game.my.managers.strategy.sendDefenseSquad(new RoomPosition(25,25,room.name));
            }
            room.memory.exploreHostilesTick = Game.time;
            delete room.memory.DefenseWalls;
            delete room.memory.DefenseRamparts;
            if (!room.controller) {
                // kein controller
                this.addToReservingInfrastructureRooms(room.name);
                this.addToJobRooms(room.name);
                if (room.name.substr(2,1) == 0 || room.name.substr(5,1) == 0) {
//                    console.log('checking for power in '+room.name);
                    const target = room.find(FIND_STRUCTURES, {
                        filter: (structure) =>
                            (structure.structureType === STRUCTURE_POWER_BANK)
                    });
                    if (target.length > 0 && this.doPower) {
                        console.log('power found');
                        if (target[0].hits / 666 < target[0].ticksToDecay) {
                            console.log('harvesting it');
                            if (Memory.powerRooms.indexOf(room.name) === -1) {
                                Memory.powerRooms.push(room.name);
                            }
                        } else {
                            console.log('not worth it');
                            if (Memory.powerRooms.indexOf(room.name) !== -1) {
                                Memory.powerRooms.splice(Memory.powerRooms.indexOf(room.name),1);
                            }
                        }
                    }
                }
            } else {
                if (!room.controller.owner && (!room.controller.reservation || room.controller.reservation.ticksToEnd < 1000)) {
                    this.addToReservingRooms(room.name);
                } else {
                    this.removeFromReservingRooms(room.name);
                }
                if (room.controller.my || room.controller.reservation && room.controller.reservation.username == "KamiKatze") {
                    // mein controller, oder meine reservierung
                    this.addToJobRooms(room.name);
                    this.addToReservingInfrastructureRooms(room.name);
                } else if (!room.controller.owner) {
                    // nicht mein controller aber auch ein feindlicher controller
                    this.addToJobRooms(room.name);
                    this.addToReservingInfrastructureRooms(room.name);
                } else {
                    // feindlicher raum ohne tower und spawn (mostlikely ne leiche)
                    if (room.find(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_TOWER || s.structureType == STRUCTURE_SPAWN}).length == 0) {
                        this.addToJobRooms(room.name);
                        this.removeFromReservingRooms(room.name);
                        this.removeFromReservingInfrastructureRooms(room.name);
                    } else {
                        // there is an enemy spawn or tower
                        this.removeFromJobRooms(room.name);
                        this.removeFromReservingRooms(room.name);
                        this.removeFromReservingInfrastructureRooms(room.name);
                        room.addToAvoidList();
                    }
                }
            }
        } else {
            // TODO: remove core rooms from jobs list if none of the rooms SK squads are active.
            const combat = room.find(FIND_HOSTILE_CREEPS, {filter: c => c.getActiveBodyparts(ATTACK) > 0 || c.getActiveBodyparts(RANGED_ATTACK) > 0});
            let isspawn = room.find(FIND_MY_STRUCTURES, {filter: s => s.structureType == STRUCTURE_SPAWN}).length > 0;
            let removefromfriendlist = false;
            if (isspawn || combat.length == 0) {
                if (isspawn) {
                    removefromfriendlist = true;
                    Game.my.managers.infrastructure.findrepairsforroom(room.name);
                }
                this.addToJobRooms(room.name);
            } else {
                if (combat.length >= 5) {
                    removefromfriendlist = true;
                }
                this.removeFromJobRooms(room.name);
            }
            if (removefromfriendlist) {
                // remove this guy from the friendly list
                if (Memory.friendly.indexOf(room.my.enemies[0].owner.username) !== -1) {
                    Memory.friendly.splice(Memory.friendly.indexOf(room.my.enemies[0].owner.username),1);
                    let data = [];
                    data.push(JSON.stringify(room.my.enemies[0].owner));
                    data.push(JSON.stringify(room.my.enemies[0].body));;
                    data.push(JSON.stringify(room.my.enemies[0].room.name)); 
                    
                    Game.notify('Master, I removed '+room.my.enemies[0].owner.username+' from the friendly list in '+room.name+' at '+Game.time+' because of '+JSON.stringify(data)+'!');
                }
            }
            console.log('There are '+room.my.enemies.length+' enemies in room ' + room.name + ' from ' + room.my.enemies[0].owner.username);
            if (!room.my.enemies[0].pos.isExit() && room.find(FIND_STRUCTURES,{filter: (s) => s.structureType == STRUCTURE_TOWER && !s.my}).length == 0) {
                if (
                    room.my.enemies[0].owner.username != "Source Keeper"
                    && !Game.my.managers.strategy.isFriendly(room.my.enemies[0].owner.username)
                ) {
                    Game.my.managers.strategy.sendDefenseSquad(room.my.enemies[0].pos);
                }
            }
            if (
                room.my.enemies[0].owner.username != "Invader" 
                && room.my.enemies[0].owner.username != "Source Keeper" 
                && !Game.my.managers.strategy.isFriendly(room.my.enemies[0].owner.username)
                && !room.controller.safeMode
            ) { 
                // awake the spawns
                Memory.skipSpawnsUntil = 0;
                if (Game.my.managers.strategy.getHighestSpawnLevel() >= 5) {
                    delete Memory.squads['0'].configsquadsize['squadsk'];
                    Memory.squads['0'].configsquadsize['squadskirmisher'] = Math.min(3,room.my.enemies.length);
                    Memory.squads['0'].configsquadsize['squadbuddy'] = Math.min(3,room.my.enemies.length);
                    Game.notify('Master! There are '+room.my.enemies.length+' enemies in room ' + room.name + ' from ' + room.my.enemies[0].owner.username); 
                    if (Game.flags['squad0target'])
                        Game.flags['squad0target'].setPosition(room.my.enemies[0].pos);
                    else
                        room.my.enemies[0].pos.createFlag('squad0target');
                    let nearbyspawn = cachedSearch.nearbySpawn(room.my.enemies[0].pos.roomName,room.my.enemies[0].pos.x,room.my.enemies[0].pos.y);
                    nearbyspawn = Game.spawns[nearbyspawn];
                    Game.flags['squad0staging'].setPosition(nearbyspawn.pos);
                    if (nearbyspawn.room.controller.level === 8) {
                        // lvl 8 are strong enough to spawn their own defense
                        if (Game.flags['squad0recruiting'])
                            Game.flags['squad0recruiting'].setPosition(nearbyspawn.pos);
                        else
                            nearbyspawn.pos.createFlag('squad0recruiting');
                    } else {
                        if (Game.flags['squad0recruiting'])
                            Game.flags['squad0recruiting'].remove();
                    }
                    strategyManager.revive(0);
                }
            }
        }
    },
    updateContainers: function(room) {
        const containers = room.find(FIND_STRUCTURES, {
            filter: function (s) {
                return s.structureType === STRUCTURE_CONTAINER
            }
        });
        if (containers.length > 0) {
            for(let key in containers) {
                let energy = containers[key].pos.findInRange(FIND_DROPPED_RESOURCES,0);
                let amount = containers[key].store[RESOURCE_ENERGY];
                let stats = "";
                if (energy.length > 0) {
                    stats = " > "+energy[0].resourceType+" laying around: "+energy[0].amount;
                    amount += energy[0].amount;
                    Memory.energylayingaround += energy[0].amount;
                }
                let jobkey1 = room.name+"$"+containers[key].pos.x+"x"+containers[key].pos.y+"$1"
                let jobkey2 = room.name+"$"+containers[key].pos.x+"x"+containers[key].pos.y+"$12"
                let color = "#FF0000";
                let job1 = Memory.jobs[jobFinder.getQueueForJobtype(jobFinder.getJobtypeFromID(jobkey1))][jobkey1];
                let job2 = Memory.jobs[jobFinder.getQueueForJobtype(jobFinder.getJobtypeFromID(jobkey2))][jobkey2];
                if (job1) {
                    stats = " > Container > in storage " +containers[key].store[RESOURCE_ENERGY]+stats;
                    stats = stats + " > creeps otw: "+job1.assigned.length;
                    if (job1.assigned.length == 0) {
                        color = "#FF0000";
                    } else if (job1.assigned.length == 1) {
                        color = "#FFA500";
                    } else {
                        color = "#12ba00";
                    }
                    job1.meta2 = amount;
                    stats += " > "+job1.meta2;
                    Memory.energyInContainer += containers[key].store[RESOURCE_ENERGY];
                    Memory.energyMinContainer = Math.min(Memory.energyMinContainer,containers[key].store[RESOURCE_ENERGY]);
                    Memory.energyMaxContainer = Math.max(Memory.energyMaxContainer,containers[key].store[RESOURCE_ENERGY]);
                } 
                if (job2) {
                    stats = " > Mineral Container > in storage " +_.sum(containers[key].store)+stats;
                    stats = stats + " > creeps otw: "+job2.assigned.length;
                    if (job2.assigned.length == 0) {
                        color = "#FF0000";
                    } else if (job2.assigned.length == 1) {
                        color = "#FFA500";
                    } else {
                        color = "#12ba00";
                    }
                    amount = _.sum(containers[key].store)*5;
                    job2.meta2 = amount;
                    stats += " > "+job2.meta2;
                } 
                if (!job1 && !job2)
                    stats = stats + " empty container > nojob";
                let reservation = "-";
                if (room.controller)
                    reservation = (room.controller.reservation?room.controller.reservation.ticksToEnd:'/');
                this.output = this.output.concat({amount: amount, output: '<span style="color:'+color+'">'+room.name+" ("+reservation+") "+stats+'</span>'});
            }
        }
        var energy = room.find(FIND_DROPPED_RESOURCES);
        if (energy.length > 0) {
            for(let key in energy) {
                if (energy[key].pos.findInRange(FIND_STRUCTURES,0,{filter: (s) => s.structureType == STRUCTURE_CONTAINER}).length == 0) {
                    let stats = room.name + " > Energy";
                    stats = stats + " > laying arount " +energy[key].amount;
                    let amount = energy[key].amount;
                    let jobkey = room.name+"$"+energy[key].pos.x+"x"+energy[key].pos.y+"$1"
                    console.log(jobkey);
                    let job = Memory.jobs[jobFinder.getQueueForJobtype(jobFinder.getJobtypeFromID(jobkey))][jobkey];
                    let color = "#FF0000";
                    if (job) {
                        stats = stats + " > creeps otw: "+job.assigned.length;
                        if (job.assigned.length == 0) {
                            color = "#FF0000";
                        } else if (job.assigned.length == 1) {
                            color = "#FFA500";
                        } else {
                            color = "#12ba00";
                        }
                        job.meta2 = amount;
                        stats += " > "+job.meta2;
                    } else
                        stats = stats + " > nojob";
                    this.output = this.output.concat({amount: amount, output: '<span style="color:'+color+'">'+stats+'</span>'});
                    
                    Memory.energylayingaround += energy[key].amount;
                }
            }
        }
    },
    manageRoom: function(roomname) {
        mydebugger.enable({name: 'manageRoom '+roomname});
        if (!this.init) {            this.doInit();        }
        mydebugger.str("roommanager doinit");
        var debug = false;
        var VERBOSE = false;
        let room = Game.rooms[roomname];
        
        //let c = _.filter(Game.creeps, (creep) => (creep.memory.role == 'transporter' || creep.memory.role == 'upgrader' || creep.memory.role == 'extractor') && creep.pos.roomName == roomname);
//        let c = cachedSearch.getRoomCreeps(room.name);
        let c = _.filter(Game.creeps, (creep) => creep.pos.roomName == room.name && (creep.memory.role == 'transporter' || creep.memory.role == 'upgrader' || creep.memory.role == 'extractor'));
        mydebugger.str("roommanager prefiltered for room creeps");
        this.transporterInThisRoom[roomname]    = _.filter(c, (creep) => creep.memory.role == 'transporter'&& (creep.ticksToLive > 200 || !creep.ticksToLive));
        this.upgraderInThisRoom[roomname]       = _.filter(c, (creep) => creep.memory.role == 'upgrader');
        this.extractorInThisRoom[roomname]      = _.filter(c, (creep) => creep.memory.role == 'extractor');
        this.roomslaves[roomname]               = _.filter(Game.my.creeps.slave, (creep) => creep.memory.roomslave == roomname);
        let roomslavesamount = 2;
        if (room.controller.level <= 3) {
            roomslavesamount = 4;
        }
        if (room.controller.level <= 4) {
            this.roomslaves[roomname].forEach(e => console.log(e.name+" > "+e.pos+" > "+e.memory.job+" > " + _.sum(e.carry)+ "/"+ e.carryCapacity +" > "+e.ticksToLive));
        }
        let roomslavesneeded = Math.max(1,_.filter(Game.spawns, (s) => s.pos.roomName == roomname).length)*roomslavesamount;
        if (this.roomslaves[roomname].length < roomslavesneeded) {
            let pot = _.filter(Game.my.creeps.slave, (creep) => !creep.memory.roomslave && Game.my.managers.jobFinder.GeneralValidateJob({roomName: roomname},creep));
            if (pot.length > 0) _.sortBy(pot, ['ticksToLive'])[(pot.length - 1)].memory.roomslave = roomname;
        }
        if (room.memory.forceroomhauler > 0) {
            this.roomhauler[roomname]               = _.filter(Game.my.creeps.hauler, (creep) => creep.memory.roomhauler == roomname);
//            this.roomhauler[roomname].forEach(e => console.log(e.name+" > "+e.pos+" > "+e.memory.job+" > " + _.sum(e.carry)+ "/"+ e.carryCapacity +" > "+e.ticksToLive));
            if (this.roomhauler[roomname].length < room.memory.forceroomhauler) {
                let pot = _.filter(Game.my.creeps.hauler, (creep) => !creep.memory.roomhauler);
                if (pot.length > 0) _.sortBy(pot, ['ticksToLive'])[(pot.length - 1)].memory.roomhauler = roomname;
            }
        }
        mydebugger.str("roommanager filtered for room creeps");
        if (!room.memory.targetWallHealth)           {  room.memory.targetWallHealth = 10000;}
        if (!Memory.infrastructureRooms)        {  Memory.infrastructureRooms = new Array();}
        let output = "";
//        output += roomname;
//        output += ' RCL '+ room.controller.level +' | ';
//        output += Math.round((room.controller.progress / room.controller.progressTotal) *100000)/1000 + '% | ';
//        output += 'roomslaves: '+this.roomslaves[roomname].length+'/'+roomslavesamount+' | ';
//        if (room.memory.forceroomhauler > 0) {
//            output += 'roomhauler: '+this.roomhauler[roomname].length+'/'+room.memory.forceroomhauler+' | ';
//        }
//        output += 'transporter: '+this.transporterInThisRoom[roomname].length+'/'+room.memory.configtransporter+' | ';
//        output += 'upgrader: '+this.upgraderInThisRoom[roomname].length+' | ';
//        output += 'extractor: '+this.extractorInThisRoom[roomname].length + ' | ';
//        output += 'targetWallHealth: '+Math.floor(room.memory.targetWallHealth/1000)+'k | ';
//        output += 'incoming sources: '+room.my.sources.length;
//        console.log(output);
        let str = roomname + " has " + room.energyAvailable + "/" + room.energyCapacityAvailable + " Energy Available";
        var storage = cachedSearch.storageOfRoom(roomname);
        if (typeof storage != "undefined") {   
            let jobkey = roomname+"$"+storage.pos.x+"x"+storage.pos.y+"$3";
            if (Memory.jobs[jobkey]) {
                Memory.jobs[jobkey].meta2 = storage.store[RESOURCE_ENERGY];
            }
            str += " + "+storage.store[RESOURCE_ENERGY] + " in Storage";
            if (VERBOSE || storage.store[RESOURCE_ENERGY] <= 50000) {
                let assigned   = _.filter(this.sh, (creep) => creep.memory.job == jobkey);
                str += " + " + assigned.length + " deliveries / " + _.sum(assigned,(o) => o.carry[RESOURCE_ENERGY]) + " energy incoming";
            } 
        }
        var terminal = cachedSearch.terminalOfRoom(roomname);
        if (typeof terminal != "undefined") {
            str += " + "+terminal.store[RESOURCE_ENERGY] + " in Terminal";
            if (VERBOSE) {
                jobkey = roomname+"$"+terminal.pos.x+"x"+terminal.pos.y+"$3";
                assigned   = _.filter(this.sh, (creep) => creep.memory.job == jobkey);
                str += " + " + assigned.length + " deliveries / " + _.sum(assigned,(o) => o.carry[RESOURCE_ENERGY]) + " energy incoming";
            }
        }
        console.log(str);
        mydebugger.str("links of room");
        room.memory.links = room.memory.links || {};
        if (_.keys(room.memory.links).length == 0) {
            room.memory.links.borderlinks = [];
            // TODO caching
            let links = _.filter(Game.structures, (s) => s.structureType == STRUCTURE_LINK && s.pos.roomName == roomname);
            for (let key in links) {
                let link = links[key];
                // Am I a storage link?
                if (link.pos.findInRange(FIND_STRUCTURES, 3, { filter: (s) => (s.structureType == STRUCTURE_STORAGE) }).length > 0) {
                    // I am a storage link!
                    room.memory.links.storagelink = link.id;
                // Am I a controller link?
                } else if (link.pos.findInRange(FIND_STRUCTURES, 4, { filter: (s) => (s.structureType == STRUCTURE_CONTROLLER) }).length > 0) {
                    // I am a controller link!
                    room.memory.links.controllerlink = link.id;
                } else {
                    // I am a border link!
                    room.memory.links.borderlinks.push(link.id);
                }
            }     
        }
        mydebugger.str("links of room defined");
        if (room.memory.links.borderlinks && (room.memory.links.storagelink || room.memory.links.controllerlink)) {
            let storagelink = Game.structures[room.memory.links.storagelink];
            let controllerlink = Game.structures[room.memory.links.controllerlink];
            for (let key in room.memory.links.borderlinks) {
                let borderlink = Game.structures[room.memory.links.borderlinks[key]];
                if (borderlink && borderlink.energy > 0) {
                    if (controllerlink && controllerlink.energy < controllerlink.energyCapacity * 0.25) {
                        borderlink.transferEnergy(controllerlink);
                    } else if (storagelink && storagelink.energy < storagelink.energyCapacity * 0.25) {
                        borderlink.transferEnergy(storagelink);
                    }
                }
            }
        }
        if (room.memory.links.storagelink && room.memory.links.controllerlink) {
            let storagelink = Game.structures[room.memory.links.storagelink];
            if (!storagelink) delete room.memory.links.storagelink;
            let controllerlink = Game.structures[room.memory.links.controllerlink];
            if (!controllerlink) delete room.memory.links.controllerlink;
            if (controllerlink && controllerlink.energy < 750 && storagelink && storagelink.energy > 0) {
                storagelink.transferEnergy(controllerlink);
            }
        }

        mydebugger.str("links of room DONE");
        mydebugger.end(false);
    }
}
profiler.registerObject(spawnManager,'spawnManager');
module.exports = spawnManager;
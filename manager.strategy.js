"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');
var WorldPosition = require('x.warinternal.WorldPosition');
var cachedSearch = require('cachedSearch');
const makeButton = require('x.helam.makeButton');

var strategyManager = {
    // Game.my.managers.strategy.resetRooms();
    resetRooms: function() {
        delete Memory.getCoreRooms;
        delete Memory.priorityOfRooms;
        delete Memory.whitelistrooms;
    },
    // Game.my.managers.strategy.increaseHowManyRooms();
    increaseHowManyRooms: function() {
        Memory.howmanyrooms++;
        this.resetRooms();
    },
    // Game.my.managers.strategy.decreaseHowManyRooms();
    decreaseHowManyRooms: function() {
        Memory.howmanyrooms--;
        this.resetRooms();
    },
    getSquadRoles: function() {
        return [
            'squadskirmisher',
            'squadsk',
            'squadbuddy',
            'squadboostedskirmisher',
            'squadboostedsk',
            'squadboostedbuddy',
            'squadsiegetank',
            'squadsiegereserver'
            ];
    },
    // Game.my.managers.strategy.isFriendly('NixNutz');
    isFriendly: function(name) {
        return (!(Memory.friendly.indexOf(name) == -1 && Memory.allied.indexOf(name) == -1));
    },
    // Game.my.managers.strategy.isAllied('NixNutz');
    isAllied: function(name) {
        return (Memory.allied.indexOf(name) !== -1);
    },
// Game.my.managers.strategy.getCoreRooms();
    getCoreRooms: function() {
        if (!Memory.getCoreRooms) {
            Memory.getCoreRooms = [];
            for (let key in Game.rooms) {
                let addit = false;
                if (Game.rooms[key].isMineClaimed()) {
                    addit = true;
                }
                if (addit) {
                    Memory.getCoreRooms = Memory.getCoreRooms.concat(key);
                }
            }
        }
        return Memory.getCoreRooms;
    },
    // Game.my.managers.strategy.getHighestSpawnLevel();
    getHighestSpawnLevel: function() {
        return this.getHighestSpawn().room.controller.level;
    },
    getHighestSpawn: function() {
        let filter = _.filter(Game.spawns,s => _.size(_.filter(Game.constructionSites,c=>[STRUCTURE_EXTENSION, STRUCTURE_SPAWN].indexOf(c.structureType) !== -1 && c.room.name == s.room.name)) == 0);
        if (filter.length == 0) {
            filter = Game.spawns;
        }
        this.highestSpawn = this.highestSpawn || _.max(filter,s => s.room.controller.level);
        return this.highestSpawn;
    },
    getHighestSpawnRoom: function() {
        return this.getHighestSpawn().room;
    },
    showTowerDamage: function(roomName) {
        let towers = {
            "W86S68": [
                    {x: 4, y: 18}
                ],
            "W82S65": [
                    {x: 43, y: 12},
                    {x: 43, y: 14},
                    {x: 42, y: 15}
                ]
        }
        let roomvis = new RoomVisual(roomName);
        for(let x = 0; x <= 49; x++) {
            for(let y = 0; y <= 49; y++) {
                let pos = new RoomPosition(x,y,roomName);
                let dmg = 0;
                for(let key in towers[roomName]) {
                    let tower = towers[roomName][key];
                    let range = pos.getRangeTo(tower.x,tower.y);
                	let effect = TOWER_POWER_ATTACK;
                    if(range > TOWER_OPTIMAL_RANGE) {
                        if(range > TOWER_FALLOFF_RANGE) {
                            range = TOWER_FALLOFF_RANGE;
                        }
                        effect -= effect * TOWER_FALLOFF * (range - TOWER_OPTIMAL_RANGE) / (TOWER_FALLOFF_RANGE - TOWER_OPTIMAL_RANGE);
                    }
                    dmg += Math.floor(effect);
                }
                let color = this.dmgToColor(dmg,600*towers[roomName].length,150*towers[roomName].length);
                console.log(x+"x"+y+">"+color);
                roomvis.rect(x-0.5, y-0.5, 1, 1, {fill: color, opacity: 0.5});
            }
        }
    },
    dmgToColor: function(dmg,max,min) {
        return '#'+_.padLeft(Math.floor((dmg-min)/(max-min)*255).toString(16),2,'0')+"0000";
    },
    sendDefenseSquad: function(pos) {
        // Get a defense squad
        let defensesquads = _.filter(Memory.squads,s => s.isDefender == true && s.modus == "combat" && s.exploreHostilesMovementTick != Game.time);
        let choosensquad = false;
        let choosenkey = false;
        let choosendist = false;
        for(let key in defensesquads) {
            let squad = defensesquads[key];
            let dist = Game.my.managers.infrastructure.getRoomPathsLengthSimple(pos.roomName, squad.targetRoom);
            if (Game.rooms[squad.targetRoom] && (!choosensquad || dist < choosendist)) {
                choosensquad = squad.squad;
                choosenkey = squad.key;
                choosendist = dist;
            }
        }
        if (choosensquad) {
            let flag = "squad"+choosensquad+"target";
            try {
                Game.flags[flag].setPosition(pos);
            } catch (err) {
                Game.rooms[pos.roomName].createFlag(pos,flag);
            }
            console.log("moving defensesquad "+choosensquad+" to it (dist: "+choosendist+")");
            Memory.squads[choosenkey].targetRoom = pos.roomName;
            Memory.squads[choosenkey].exploreHostilesMovementTick = Game.time;
        }
    },
    // Game.my.managers.strategy.addRealWhitelistRoom("W84S71");
    addRealWhitelistRoom: function(roomName) {
        if (Memory.realwhitelistrooms.indexOf(roomName) !== -1) {
            return "addRealWhitelistRoom > "+roomName+" already added";
        }
        Memory.realwhitelistrooms.push(roomName);
        delete Memory.priorityOfRooms;
        delete Memory.whitelistrooms;
        return true;
    },
    // Game.my.managers.strategy.removeRealWhitelistRoom("E3S9");
    removeRealWhitelistRoom: function(roomName) {
        if (Memory.realwhitelistrooms.indexOf(roomName) === -1) {
            return "removeRealWhitelistRoom > "+roomName+" already not on list";
        }
        Memory.realwhitelistrooms.splice(Memory.realwhitelistrooms.indexOf(roomName),1);
        delete Memory.priorityOfRooms;
        delete Memory.whitelistrooms;
    },
    rateWhitelistRooms: function() {
        if (_.keys(Game.rooms).length == 1) {
            return false;
        }
        // wenn bucket > 9000 für 1000 ticks, füge einen raum dazu.
        // wenn bucket < 1000 für 1000 ticks, entferne einen raum.
        if(Game.cpu.bucket > 9000 && Memory.realwhitelistrooms.length > Memory.howmanyrooms) {
            Memory.over9000 = Memory.over9000 || 0;
            Memory.over9000++;
            Memory.below1000 = 0;
            if (Memory.over9000 >= 15000) {
                Memory.howmanyrooms++;
                Memory.over9000 = 0;
                delete Memory.whitelistrooms;
                delete Memory.jobrooms;
                delete Memory.reservinginfrastructure;
                delete Memory.reserving;
            }
        } else if(Game.cpu.bucket < 1000) {
            Memory.below1000 = Memory.below1000 || 0;
            Memory.below1000++;
            Memory.over9000 = 0;
            if (Memory.below1000 >= 5000) {
                Memory.howmanyrooms--;
                Memory.below1000 = 0;
                delete Memory.whitelistrooms;
                delete Memory.jobrooms;
                delete Memory.reservinginfrastructure;
                delete Memory.reserving;
            }
        } else {
            Memory.below1000 = 0;
            Memory.over9000 = 0;
        }

        let rooms = this.getCoreRooms();
        let worstprio = 0;
        Memory.realwhitelistrooms = Memory.realwhitelistrooms || Memory.whitelistrooms;
        let priorityOfRooms = Memory.priorityOfRooms || {};
        if (_.keys(priorityOfRooms).length != Memory.realwhitelistrooms.length) {
            console.log("priorityOfRooms will be done");
            priorityOfRooms = {};
            for(let key in rooms) {
                // gebe räumen die distance via roomroute als prio.
                // Update prio, wenn niedriger als aktuelle prio (kombinierte karte)
                let roomname = rooms[key];
                // Spawn rooms haben immer höchste Prio
                priorityOfRooms[roomname] = 0;
                for (let otherrooms in Memory.realwhitelistrooms) {
                    otherrooms = Memory.realwhitelistrooms[otherrooms];
                    if (typeof priorityOfRooms[otherrooms] == "undefined") priorityOfRooms[otherrooms] = Infinity;
//                    console.log("from "+roomname+" to "+otherrooms+" is "+Game.my.managers.infrastructure.getRoomPathsLengthSimple(roomname,otherrooms));
                	let parsed = otherrooms.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
                	if ((parsed[1] % 10 === 0) || (parsed[2] % 10 === 0)) {
                	    priorityOfRooms[otherrooms] = 99;
                	} else {
                        priorityOfRooms[otherrooms] = Math.max(0,Math.min(priorityOfRooms[otherrooms], Game.my.managers.infrastructure.getRoomPathsLengthSimple(roomname,otherrooms)+(2-cachedSearch.sourcesOfRoomCount(otherrooms))));
                	}
                }
            }
            Memory.priorityOfRooms = priorityOfRooms;
        }
        Memory.howmanyrooms = Memory.howmanyrooms || 10;
        if (!Memory.whitelistrooms || Memory.whitelistrooms.length != Memory.howmanyrooms) {
            for(let key in priorityOfRooms) {
                worstprio = Math.max(worstprio,priorityOfRooms[key]);
            }
            // sortiere die räume nach prio
            // gib alle räume mit prio 0 + übrige räume.
            let result = [];
            doprios: {
                for(let i = 0; i <= worstprio; i++) {
                    for(let key in priorityOfRooms) {
                        if (priorityOfRooms[key] == i) {
                            if (result.length < Memory.howmanyrooms || i == 0) {
                                let push = false;
                            	let parsed = key.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
                                if (_.inRange(parsed[1] % 10,4,7) && _.inRange(parsed[2] % 10,4,7)) {
                                    // Core rooms, only add if nearbyspawn RCL 7
                                    let near = cachedSearch.nearbySpawn(key,25,25);
                                    if (Game.spawns[near].room.controller.level >= 7) {
                                        push = true;
                                    }
                                } else {
                                    push = true;
                                }
                                if (push)   result.push(key);
                            } else {
                                break doprios;
                            }
                        }
                    }
                }
            }
            Memory.whitelistrooms = result;
            // whitelistrooms has changed, we need to recalc all other lists for accuracy
            for (let key in Memory.reservinginfrastructure) {
                let roomname = Memory.reservinginfrastructure[key];
                if (Memory.whitelistrooms.indexOf(roomname) === -1) {
                    Game.my.managers.spawn.removeFromReservingInfrastructureRooms(roomname);
                }
            }
            for (let key in Memory.jobrooms) {
                let roomname = Memory.jobrooms[key];
                if (Memory.whitelistrooms.indexOf(roomname) === -1) {
                    Game.my.managers.spawn.removeFromJobRooms(roomname);
                }
            }
            for (let key in Memory.reserving) {
                let roomname = Memory.reserving[key];
                if (Memory.whitelistrooms.indexOf(roomname) === -1) {
                    Game.my.managers.spawn.removeFromReservingRooms(roomname);
                }
            }
        }

        
        
//        Memory.showminimap = true;
        if (Memory.showMinimap != false && !Game.rooms['sim']) {
            let minimap = {};
            for(let key in Memory.realwhitelistrooms) {
                let roomname = Memory.realwhitelistrooms[key];
                let WP = WorldPosition.fromRoomPosition(new RoomPosition(25,25,roomname));
                minimap[Math.floor(WP.x/50)] = minimap[Math.floor(WP.x/50)] || {};
                let color = false;
                if (Memory.whitelistrooms.indexOf(roomname) === -1) {
                    // rot - not whitelisted
                    color = 'black';
                } else {
                    if (!Memory.jobrooms || Memory.jobrooms.indexOf(roomname) === -1) {
                        // orange - whitelisted but no jobs
                        color = 'orange';
                    } else {                        
                        // grün - whitelisted and jobs
                        color = 'green';
                    }
                }
                let textcolor = 'white';
                if(Game.rooms[roomname]) {
                    if (Game.rooms[roomname].isMineClaimed()) {
                        textcolor = 'lightblue';
                    } else if(Game.rooms[roomname].isMineReserved()) {
                        textcolor = 'limegreen';
                    } 
                } else {
                    textcolor = 'darkred';
                }
                
                minimap[Math.floor(WP.x/50)][Math.floor(WP.y/50)] = {color: color, textcolor: textcolor, roomname: roomname};
            }
    
            let minx = Math.min.apply(null,_.keys(minimap));
            let miny = Infinity;
            for (let x in minimap) {
                miny = Math.min(miny,Math.min.apply(null,_.keys(minimap[x])));
            }
            let writteny = {};
            for (let x in minimap) {
                new RoomVisual().text(this.minimapcoordx(x),x-minx+1.5, 0.7,{font: 0.5});
                for (let y in minimap[x]) {
                    if (typeof writteny[y] == "undefined") {
                        writteny[y] = true;
                        new RoomVisual().text(this.minimapcoordy(y),0.5, y-miny+1.7,{font: 0.5});
                    }
                    new RoomVisual().rect(x-minx+1, y-miny+1, 1, 1, {fill: minimap[x][y].color, opacity: 0.25 }); 
                    new RoomVisual().text(priorityOfRooms[minimap[x][y].roomname],x-minx+1.5, y-miny+1.7,{font: "bold 0.5", opacity: 0.5, color: minimap[x][y].textcolor});
                }
            }
        }
    },
    minimapcoordy: function(y) {
        return (y<0?"N"+Math.abs(Number(y)+1):"S"+y);
    },
    minimapcoordx: function(x) {
        return (x<0?"W"+Math.abs(Number(x)+1):"E"+x);
    },
    // Game.my.managers.strategy.revive('46');
    revive: function(squad) {
        squad = _.filter(Memory.squads,s => s.squad == squad);
        squad = squad[0].key;
        if(Memory.squads[squad].modus == 'dead') {
            Memory.squads[squad].modus = "recruiting";
            Memory.squads[squad].recruitingComplete = false;
            Memory.squads[squad].stagingComplete = false;
            // awake the spawns
            Memory.skipSpawnsUntil = 0;
            return true;
        }
        return false;
    },
    // Game.my.managers.strategy.kill("0");
    kill: function(squad) {
        if(Memory.squads[squad].modus != 'dead') {
            Memory.squads[squad].modus = "dead";
            Memory.squads[squad].recruitingComplete = true;
            Memory.squads[squad].stagingComplete = true;
            let members = _.filter(Game.creeps, c => c.memory.squad == squad);
            for(let key in members) {
                Game.creeps[members[key].name].suicide();
            }
            return true;
        }
        return false;
    },
    
    readinFlags: function(squad) {
        if (Game.flags["squad"+squad.squad+"staging"])   Memory.squads[squad.key].stagingRoom    = Game.flags["squad"+squad.squad+"staging"].pos.roomName;
        if (Game.flags["squad"+squad.squad+"target"])    Memory.squads[squad.key].targetRoom     = Game.flags["squad"+squad.squad+"target"].pos.roomName;
        if (Game.flags["squad"+squad.squad+"fallback"])  Memory.squads[squad.key].fallbackRoom   = Game.flags["squad"+squad.squad+"fallback"].pos.roomName;
        if (Game.flags["squad"+squad.squad+"recruiting"]) {
            Memory.squads[squad.key].recruitRoom    = Game.flags["squad"+squad.squad+"recruiting"].pos.roomName;
        } else {
            Memory.squads[squad.key].recruitRoom    = false;
        }
    },
    
    reviveIfOtherSquadIsLow: function(r,l) {
        let squadr = _.filter(Memory.squads,s => s.squad == r)[0];
        let squadl = _.filter(Memory.squads,s => s.squad == l)[0];
        if (squadr.modus == "dead" && squadl.ticksToLive <= 400 && squadl.modus != "recruiting") {
            this.revive(r);
        }
    },
    resetPatrolIfNotCombat: function(squadid,to,fallback) {
        // TODO: arrays sind böse, benutz gefälligst den squad namen
        let squad = Memory.squads[squadid];
        if (['combat','fallback'].indexOf(squad.modus) === -1 && squad.targetRoom != to) {
            let flag = "squad"+squadid+"target";
            let target = new RoomPosition(25,25,to);
            // If the flag gets lost, this is a fallback
            if (!Game.flags[flag]) {
//                target.createFlag(flag);
            } else {
                Game.flags[flag].setPosition(target);
            }
            flag = "squad"+squadid+"fallback";
            target = new RoomPosition(25,25,fallback);
            // If the flag gets lost, this is a fallback
            if (!Game.flags[flag]) {
//                target.createFlag(flag);
            } else {
                Game.flags[flag].setPosition(target);
            }
        }
    },
    patrol: function(squadid,from,to) {
        let squad = Memory.squads[squadid];
        // If squad is alive and not fleeing
        if (squad.modus == 'combat') {
            // and the squad has the from room as target room
            if (squad.targetRoom == from) {
                // and we have visibility of that room
                if (Game.rooms[from]) {
                    // and there are no enemy creeps
                    if (Game.rooms[from].find(FIND_HOSTILE_CREEPS,{filter: (c) => c.owner.username != "Invader"}).length == 0) {
                        // move target flag to next room
                        let flag = "squad"+squadid+"target";
                        let target = new RoomPosition(25,25,to);
                        // If the flag gets lost, this is a fallback
                        if (!Game.flags[flag]) {
//                            target.createFlag(flag);
                        } else {
                            Game.flags[flag].setPosition(target);
                        }
                        // move fallback flag to this room
                        flag = "squad"+squadid+"fallback";
                        target = new RoomPosition(25,25,from);
                        // If the flag gets lost, this is a fallback
                        if (!Game.flags[flag]) {
//                            target.createFlag(flag);
                        } else {
                            Game.flags[flag].setPosition(target);
                        }
                    }
                }
            }
        }
    },
    addSquad: function(args,doit=true) {
        Memory.squadid = Memory.squadid || 0;
        if (!args.fallbackRoom)                         { console.log("addSquad - args missing: fallbackRoom: "+JSON.stringify(args.fallbackRoom)); return;}
        if (!args.targetRoom)                           { console.log("addSquad - args missing: targetRoom: "+JSON.stringify(args.targetRoom)); return;}
        if (!args.stagingRoom)                          { console.log("addSquad - args missing: stagingRoom: "+JSON.stringify(args.stagingRoom)); return;}
        if (!args.recruitRoom)                          { console.log("addSquad - args missing: recruitRoom, assuming false"); args.recruitRoom = false;}
        if (!args.configsquadsize)                      { console.log("addSquad - args missing: configsquadsize: "+JSON.stringify(args.configsquadsize)); return;}
        if (typeof args.boost == "undefined")           { console.log("addSquad - args missing: boost, assuming false"); args.boost = false;}
        if (typeof args.isDefender == "undefined")      { console.log("addSquad - args missing: isDefender, assuming false"); args.isDefender = false;}
        if (typeof args.isSK == "undefined")            { console.log("addSquad - args missing: isSK, assuming false"); args.isSK = false;}
        if (typeof args.revive == "undefined")          { console.log("addSquad - args missing: revive, assuming false"); args.revive = false;}
        if (typeof args.reviveIfOtherSquadIsLow == "undefined")
                                                        { console.log("addSquad - args missing: reviveIfOtherSquadIsLow, assuming false"); args.reviveIfOtherSquadIsLow = false;}
        if (!doit) {
            console.log('addSquad - dry run - configsquadsize: '+JSON.stringify(args.configsquadsize));
            console.log('addSquad - dry run - aborting');
            return;
        }
        let squad = {
            squad: Memory.squadid,
            fallbackRoom: args.fallbackRoom,
            targetRoom: args.targetRoom,
            stagingRoom: args.stagingRoom,
            recruitRoom: args.recruitRoom,
            recruitingComplete: false,
            stagingComplete: false,
            modus: 'dead',
            configsquadsize: args.configsquadsize,
            ticksToLive: 0,
            boost: args.boost,
            isDefender: args.isDefender,
            isSK: args.isSK,
            revive: args.revive,
            reviveIfOtherSquadIsLow: args.reviveIfOtherSquadIsLow
        }
        if(Game.rooms[args.fallbackRoom]) {
            let fallbackRoomFlag = new RoomPosition(25,25,args.fallbackRoom);
            fallbackRoomFlag.createFlag("squad"+Memory.squadid+"fallback");
        }
        if(Game.rooms[args.targetRoom]) {
            let targetRoomFlag = new RoomPosition(25,25,args.targetRoom);
            targetRoomFlag.createFlag("squad"+Memory.squadid+"target");
        }
        if(Game.rooms[args.stagingRoom]) {
            let stagingRoomFlag = new RoomPosition(25,25,args.stagingRoom);
            stagingRoomFlag.createFlag("squad"+Memory.squadid+"staging");
        }
        if(Game.rooms[args.recruitRoom]) {
            let recruitRoomFlag = new RoomPosition(25,25,args.recruitRoom);
            recruitRoomFlag.createFlag("squad"+Memory.squadid+"recruiting");
        }
        Memory.squads[Memory.squadid] = squad;
        Memory.squadid++;
        console.log("addSquad - Squad created for "+args.targetRoom);
    },
    // Game.my.managers.strategy.addDefenseSquad();
    addDefenseSquad: function() {
        let args = {
            fallbackRoom: this.getHighestSpawnRoom().name,
            targetRoom: this.getHighestSpawnRoom().name,
            stagingRoom: this.getHighestSpawnRoom().name,
            configsquadsize: {
                'squadskirmisher': 1
            },
            boost: false,
            isDefender: true,
            revive: true,
            reviveIfOtherSquadIsLow: false
        }
        this.addSquad(args);
    },
    // Game.my.managers.strategy.addMainDefenseSquad();
    addMainDefenseSquad: function() {
        let args = {
            fallbackRoom: this.getHighestSpawnRoom().name,
            targetRoom: this.getHighestSpawnRoom().name,
            stagingRoom: this.getHighestSpawnRoom().name,
            configsquadsize: {
                'squadsk': 2,
                'squadbuddy': 2
            },
            boost: true,
            isDefender: false,
            revive: false,
            reviveIfOtherSquadIsLow: false
        }
        this.addSquad(args);
    },
    // Game.my.managers.strategy.addSKSquads('W86S64');
    addSKSquads: function(roomName) {
        Memory.squadid = Memory.squadid || 0;
        let squads = _.filter(Memory.squads, s => s.targetRoom == roomName && s.isSK == true);
        if(squads.length != 0) {
            console.log("addSKSquad for "+roomName+" - there are already squads: "+JSON.stringify(squads));
            return;
        }
        let room = Game.spawns[cachedSearch.nearbySpawn(roomName,25,25)].room;
        let args = {
            fallbackRoom: room.name,
            targetRoom: roomName,
            stagingRoom: room.name,
            recruitRoom: room.name,
            configsquadsize: {
                'squadsk': 1,
                'squadbuddy': 1
            },
            boost: false,
            isDefender: false,
            isSK: true,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) + 1
        }
        this.addSquad(args);
        args = {
            fallbackRoom: room.name,
            targetRoom: roomName,
            stagingRoom: room.name,
            recruitRoom: room.name,
            configsquadsize: {
                'squadsk': 1,
                'squadbuddy': 1
            },
            boost: false,
            isDefender: false,
            isSK: true,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) - 1
        }
        this.addSquad(args);
    },   
    // Game.my.managers.strategy.addHarasserSquad('W85S73','W85S70',true);
    addHarasserSquad: function(attackRoom,stagingRoom,dryrun=false) {
        let configsquadsize = {
            'squadskirmisher': 2,
        }
        let args = {
            fallbackRoom: stagingRoom,
            targetRoom: attackRoom,
            stagingRoom: stagingRoom,
            configsquadsize: configsquadsize,
            boost: false,
            isDefender: false,
            isSK: false,
            revive: true
        }
        this.addSquad(args,dryrun);
    },
    // Game.my.managers.strategy.addDrainSquads('E5S8','E4S8',true);
    addDrainSquads: function(drainRoom,healRoom,dryrun=false) {
        let args = {
            fallbackRoom: healRoom,
            targetRoom: drainRoom,
            stagingRoom: healRoom,
            configsquadsize: {
                'squadsiegetank': 2,
            },
            boost: false,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) + 1
        }
        this.addSquad(args,dryrun);
        args = {
            fallbackRoom: healRoom,
            targetRoom: drainRoom,
            stagingRoom: healRoom,
            configsquadsize: {
                'squadsiegetank': 2,
            },
            boost: false,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) - 1
        }
        this.addSquad(args,dryrun);
        args = {
            fallbackRoom: healRoom,
            targetRoom: healRoom,
            stagingRoom: healRoom,
            configsquadsize: {
                'squadbuddy': 2
            },
            boost: false,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) + 1
        }
        this.addSquad(args,dryrun);
        args = {
            fallbackRoom: healRoom,
            targetRoom: healRoom,
            stagingRoom: healRoom,
            configsquadsize: {
                'squadbuddy': 2
            },
            boost: false,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) - 1
        }
        this.addSquad(args,dryrun);
    },
    // Game.my.managers.strategy.addBoostedAttackSquads("W85S71","W85S70");
    addBoostedAttackSquads: function(attackRoom,stagingRoom,dryrun=false) {
        let room = Game.spawns[cachedSearch.nearbySpawn(stagingRoom,25,25,10000)].room;
        let labs = _.filter(Game.my.managers.labmanager.labconfig[room.name],l => l.produce == RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE);
        let configsquadsize = {
            'squadsk': 3,
            'squadbuddy': 3
        }
        if (labs.length > 0) {
            configsquadsize = {
                'squadboostedsk': 3,
                'squadboostedbuddy': 3
            }
        }
        let args = {
            fallbackRoom: stagingRoom,
            targetRoom: attackRoom,
            stagingRoom: stagingRoom,
            recruitRoom: room.name,
            configsquadsize: configsquadsize,
            boost: true,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) + 1
        }
        this.addSquad(args,dryrun);
        args = {
            fallbackRoom: stagingRoom,
            targetRoom: attackRoom,
            stagingRoom: stagingRoom,
            recruitRoom: room.name,
            configsquadsize: configsquadsize,
            boost: true,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) - 1
        }
        this.addSquad(args,dryrun);
    },
    // Game.my.managers.strategy.addBoostedSmallRangedAttackSquads("W89S71","W86S69");
    addBoostedSmallRangedAttackSquads: function(attackRoom,stagingRoom,dryrun=false) {
        let room = Game.spawns[cachedSearch.nearbySpawn(stagingRoom,25,25,10000)].room;
        let labs = _.filter(Game.my.managers.labmanager.labconfig[room.name],l => l.produce == RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE);
        let configsquadsize = {
            'squadskirmisher': 2,
            'squadbuddy': 2
        }
        if (labs.length > 0) {
            configsquadsize = {
                'squadboostedskirmisher': 2,
                'squadboostedbuddy': 2 
            }
        }
        let args = {
            fallbackRoom: stagingRoom,
            targetRoom: attackRoom,
            stagingRoom: stagingRoom,
            recruitRoom: room.name,
            configsquadsize: configsquadsize,
            boost: true,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) + 1
        }
        this.addSquad(args,dryrun);
        args = {
            fallbackRoom: stagingRoom,
            targetRoom: attackRoom,
            stagingRoom: stagingRoom,
            recruitRoom: room.name,
            configsquadsize: configsquadsize,
            boost: true,
            isDefender: false,
            isSK: false,
            revive: false,
            reviveIfOtherSquadIsLow: Number(Memory.squadid) - 1
        }
        this.addSquad(args,dryrun);
    },
    manage: function() {
        if (Game.rooms['sim']) return;

/*
        this.resetPatrolIfNotCombat(1,"W86S67","W86S66")
        this.patrol(1,"W86S67","W85S67");
        this.patrol(1,"W85S67","W85S68");
        
        this.patrol(1,"W85S68","W85S69");
        this.patrol(1,"W85S69","W86S69");
        this.patrol(1,"W86S69","W85S69");
        this.patrol(1,"W85S69","W84S69");
        
        this.resetPatrolIfNotCombat(2,"W86S67","W86S66")
        this.patrol(2,"W86S67","W85S67");
        this.patrol(2,"W85S67","W85S68");
        
        this.patrol(2,"W85S68","W85S69");
        this.patrol(2,"W85S69","W86S69");
        this.patrol(2,"W86S69","W85S69");
        this.patrol(2,"W85S69","W84S69");
*/        
        for(let key in Memory.squads) {
            let squad = Memory.squads[key];
            // restore data;
            squad.key = key;
            if (!squad.squad) squad.squad = key;
            if (!squad.reviveIfOtherSquadIsLow) squad.reviveIfOtherSquadIsLow = false;
            // load data from flags
            this.readinFlags(squad);
            // revive squads
            if(squad.modus == "dead") {
                // revive only if its not SK or SK target room is whitelisted.
                if (!squad.isSK || Memory.whitelistrooms.indexOf(squad.targetRoom) !== -1) {
                    if (squad.revive) {
                        // revive
                        this.revive(squad.squad);
                    }
                    if (squad.reviveIfOtherSquadIsLow != false) {
                        this.reviveIfOtherSquadIsLow(squad.squad,squad.reviveIfOtherSquadIsLow);
                    }
                }
            }
            // reset defense flags
            if (squad.isDefender) {
                let targetflag = "squad"+squad.squad+"target";
                if (squad.exploreHostilesMovementTick != Game.time && Game.flags[targetflag] && Game.flags[targetflag].room && !Game.flags[targetflag].room.areThereEnemies() && !Game.flags[targetflag].room.areThereEnemyConstructionSites()) {
//                    console.log("in room "+Game.flags[targetflag].room.name+" there are no enemies: "+Game.flags[targetflag].room.areThereEnemies())
                    // we see the room, and there are no enemies
                    let stagingflag = "squad"+squad.squad+"staging";
                    if (Game.flags[stagingflag] && Game.flags[stagingflag].pos.roomName != Game.flags[targetflag].pos.roomName) {
                        console.log('setting target flag of defense squad '+squad.squad+' to '+Game.flags[stagingflag].pos);
                        Game.flags[targetflag].setPosition(Game.flags[stagingflag]);
                    }

                }
            }
        }

        let buttons = ""
        if (Memory.squads[0]) buttons += makeButton.makeButton('reviveSquad5','revive Squad 0: '+Memory.squads[0].modus,'Game.my.managers.strategy.revive(0);');
        console.log(buttons);
    },
    
}
profiler.registerObject(strategyManager,'strategyManager');
module.exports = strategyManager; 
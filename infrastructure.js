"use strict";
const profiler = require('screeps-profiler');
var cachedSearch = require('cachedSearch');

var infrastructure = {
    done: false,
    drawFirstSpawn: function(room) {
        if (room && room.controller && room.controller.my) {
            let spawns = cachedSearch.spawnsOfRoom(room.name);
            if (spawns.length < 1) {
                let spawn = this.placeFirstSpawn(room);
            }
        }
    },
    planWalls: function(room) {
        if (!room.memory.alreadyPlannedWalls) {
            let exits = room.find(FIND_EXIT);
            let walls = [];
            let range = 4;
            for(let exit of exits) {
                // get all fields in range two
                let top = Math.max(0,exit.y-range);
                let left = Math.max(0,exit.x-range);
                let bottom = Math.min(49,exit.y+range);
                let right = Math.min(49,exit.x+range);
                let candidates = _.filter(room.lookForAtArea(LOOK_TERRAIN,top,left,bottom,right,true), (terrain) => (terrain.terrain == 'plain' || terrain.terrain == 'swamp'));
                for(let candidate of candidates) {
                    if (typeof _.find(walls, p => p.x == candidate.x && p.y == candidate.y)  == "undefined") {
                        if (exit.getRangeTo(candidate.x,candidate.y) == range) {
                            if (room.getPositionAt(candidate.x,candidate.y).findInRange(FIND_EXIT,range-1).length == 0) {
                                walls.push({x: candidate.x,y: candidate.y});
                            }
                        }
                    }
                }  
            }
    //        console.log('drawWalls > before: '+walls.length);
    //        walls = _.uniq(walls, p => p.x+"$"+p.y);
    //        console.log('drawWalls > after: '+walls.length);
            let i = 0;
            for(let wall of walls) {
                let color = '#FF0000';
                let struc = STRUCTURE_WALL;
                if (i % 2 == 0) {
                    color = '#0000FF';
                    struc = STRUCTURE_RAMPART;
                }
                this.planWall(struc,room.name,Number(wall.x),Number(wall.y));
                i++;
            }
            room.memory.alreadyPlannedWalls = true;
        }
    },
	planWall: function(struc,roomName,x,y) {
	    Memory.rooms[roomName].plannedWalls = Memory.rooms[roomName].plannedWalls || [];
        let push = {struc: struc, x: x,y: y};
        if (typeof _.find(Memory.rooms[roomName].plannedWalls, p => p.x == push.x && p.y == push.y)  == "undefined") {
            Memory.rooms[roomName].plannedWalls.push(push);
        }
        return true;
	},
    placeFirstSpawn: function(room) {
        if (!room || _.size(_.filter(Game.constructionSites, s => s.structureType == STRUCTURE_SPAWN && s.room.name == room.name)) != 0 || Memory.realwhitelistrooms.indexOf(room.name) === -1) {
            return false;
        }
        console.log('doing placeFirstSpawn for '+room.name);
        let potential = {};
        for(let x = 7;x <= 42; x++) {
            potential[x] = {};
            for(let y = 7;y <= 42; y++) {
                potential[x][y] = true;
            }
        }
        let map = room.lookForAtArea(LOOK_TERRAIN,0,0,49,49,true);
        for(let entry in map) {
            if (map[entry].terrain == "wall")
                potential = this.placeFirstSpawnIgnoreArea(potential,map[entry].x,map[entry].y);
        }
        let roomposes = [];
        for(let x in potential) {
            for (let y in potential[x]) {
                if (potential[x][y]) {
                    room.visual.circle(Number(x),Number(y), {color: '#FF0000', fill: 'transparent', radius: 0.35, stroke: 'red'});
                }
            }
        }
    },
    placeFirstSpawnIgnoreArea: function(potential,centerx,centery,room = false) {
        for (let avoidx = -7; avoidx <= 7; avoidx++) {
            for (let avoidy = -7; avoidy <= 7; avoidy++) {
                let realx = Math.min(49,Math.max(0,(Number(centerx)+avoidx)));
                let realy = Math.min(49,Math.max(0,(Number(centery)+avoidy)));
                if (potential[realx]) {
                    if (potential[realx][realy]) {
                        potential[realx][realy] = false;
                        if (room)
                            room.visual.text('x',Number(realx),Number(realy), {color: '#FF0000', fill: 'transparent', radius: 0.35, stroke: 'red'});
                    }
                }
            }
        }
        return potential;
    },
    drawExtensions: function(room) {
        if (room) {
            let spawns = cachedSearch.spawnsOfRoom(room.name);
            if ((spawns.length > 0 || room.memory.plannedExtensions) && (!room.memory.placeExtensionsControllerLevel || room.memory.placeExtensionsControllerLevel < room.controller.level || Memory.showPlannedExtensions)) {
                let extensions = this.placeExtensions(room);
                room.memory.placeExtensionsControllerLevel = room.controller.level;
            }
            if (room.memory.placeExtensionsControllerLevel >= 3) {
                // Plan roads for first flower
                this.placeExtensionsRoads(room,1);
            }
            if (room.memory.placeExtensionsControllerLevel >= 4) {
                // Plan roads for second flower
                this.placeExtensionsRoads(room,2);
            }
            if (room.memory.placeExtensionsControllerLevel >= 5) {
                // Plan roads for third flower
                this.placeExtensionsRoads(room,3);
            }
        }
    },
    placeExtensionsRoads: function(room,flower) {
        flower = (flower - 1) * 12;
        console.log(flower);
        let start = room.memory.plannedExtensions[flower];
        this.planRoad(room.name,(start.x)-1,(start.y)  );
        this.planRoad(room.name,(start.x)-1,(start.y)+1);
        this.planRoad(room.name,(start.x)  ,(start.y)+2);
        this.planRoad(room.name,(start.x)+1,(start.y)+3);
        this.planRoad(room.name,(start.x)+2,(start.y)+3);
        this.planRoad(room.name,(start.x)+3,(start.y)+2);
        this.planRoad(room.name,(start.x)+4,(start.y)+1);
        this.planRoad(room.name,(start.x)+4,(start.y)  );
        this.planRoad(room.name,(start.x)+3,(start.y)-1);
        this.planRoad(room.name,(start.x)+2,(start.y)-2);
        this.planRoad(room.name,(start.x)+1,(start.y)-2);
        this.planRoad(room.name,(start.x)  ,(start.y)-1);
    },
    placeExtensionsIgnoreArea: function(potential,centerx,centery,room = false) {
        for (let avoidx = -2; avoidx <= 3; avoidx++) {
            for (let avoidy = -3; avoidy <= 2; avoidy++) {
                let realx = Math.min(49,Math.max(0,(Number(centerx)+avoidx)));
                let realy = Math.min(49,Math.max(0,(Number(centery)+avoidy)));
                if (potential[realx]) {
                    if (potential[realx][realy]) {
                        potential[realx][realy] = false;
                        if (room)
                            room.visual.text('x',Number(realx),Number(realy), {color: '#FF0000', fill: 'transparent', radius: 0.35, stroke: 'red'});
                    }
                }
            }
        }
        return potential;
    },
    placeExtensionsPlaceIfNotExists: function(potential,x,y,room) {
        room.visual.circle(Number(x),Number(y), {color: '#FF0000', fill: 'transparent', radius: 0.35, stroke: 'yellow'});
        room.memory.plannedExtensions.push(new RoomPosition(x,y,room.name));
        potential = this.placeExtensionsIgnoreArea(potential,x,y,room);
        return potential;
    },
    placeExtensionsFlower: function(potential,x,y,room) {
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-2,y,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-1,y,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-0,y,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x+1,y,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-2,y+1,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-1,y+1,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-0,y+1,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x+1,y+1,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-1,y+2,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-0,y+2,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-0,y-1,room);
        potential = this.placeExtensionsPlaceIfNotExists(potential,x-1,y-1,room);
        return potential;
    },
    placeExtensionsNum: 0,
    placeExtension: function(x,y,room) {
        let look = room.lookAt(x,y);
        if (!look.constructionSite) {
            room.createConstructionSite(x,y,STRUCTURE_EXTENSION);
            this.placeExtensionsNum ++;
        }
    },
    placeExtensions: function(room) {
        if (!room) {
            return false;
        }
        let extensionsPerRose = 12;
        let extensionsMax = 60;
        let potential = {};
        room.memory.plannedExtensions = room.memory.plannedExtensions || [];

        let extensionssum = 
              _.size(_.filter(Game.constructionSites, (f) => f.pos.roomName == room.name && f.structureType == STRUCTURE_EXTENSION)) 
            + _.size(_.filter(Game.structures, (f) => f.pos.roomName == room.name && f.structureType == STRUCTURE_EXTENSION)) 
            + this.placeExtensionsNum;

        if (room.memory.plannedExtensions.length >= extensionsMax) {
            for (let pos in room.memory.plannedExtensions) {
                pos = room.memory.plannedExtensions[pos];
                room.visual.circle(pos.x,pos.y, {color: '#FFFF00', fill: 'transparent', radius: 0.35, stroke: 'green'});
                if (extensionssum < CONTROLLER_STRUCTURES[STRUCTURE_EXTENSION][room.controller.level]) {
                    this.placeExtension(pos.x,pos.y,room);
                }
            }
            return true;
        }
        for(let x = 3;x <= 46; x++) {
            potential[x] = {};
            for(let y = 3;y <= 46; y++) {
                potential[x][y] = true;
            }
        }
        let map = room.lookForAtArea(LOOK_TERRAIN,0,0,49,49,true);
        for(let entry in map) {
            if (map[entry].terrain == "wall")
                potential = this.placeExtensionsIgnoreArea(potential,map[entry].x,map[entry].y);
        }
        let structures = _.filter(Game.structures, (f) => f.pos.roomName == room.name);
        for (let structure in structures) {
            structure = structures[structure];
            if (OBSTACLE_OBJECT_TYPES.indexOf(structure.structureType) !== -1)
                potential = this.placeExtensionsIgnoreArea(potential,structure.pos.x,structure.pos.y);
        }
        let constructionsites = _.filter(Game.constructionSites, (f) => f.pos.roomName == room.name);
        for (let constructionsite in constructionsites) {
            constructionsite = constructionsites[constructionsite];
            if (OBSTACLE_OBJECT_TYPES.indexOf(constructionsite.structureType) !== -1)
                potential = this.placeExtensionsIgnoreArea(potential,constructionsite.pos.x,constructionsite.pos.y);
        }
        for (let plannedExtension in room.memory.plannedExtensions) {
            plannedExtension = room.memory.plannedExtensions[plannedExtension];
            potential = this.placeExtensionsIgnoreArea(potential,plannedExtension.x,plannedExtension.y);
        }
        let spawns = cachedSearch.spawnsOfRoom(room.name);
        for(let i = 0; i < extensionsMax/extensionsPerRose; i++) {
            let roomposes = [];
            for(let x in potential) {
                for (let y in potential[x]) {
                    if (potential[x][y]) {
                        room.visual.circle(Number(x),Number(y), {color: '#FF0000', fill: 'transparent', radius: 0.35, stroke: 'red'});
                        roomposes.push(new RoomPosition(Number(x),Number(y),room.name));
                    }
                }
            }
            let closest = spawns[0].pos.findClosestByPytRange(roomposes);
            room.visual.circle(closest.x,closest.y, {color: '#FFFF00', fill: 'transparent', radius: 0.35, stroke: 'green'});
            potential = this.placeExtensionsFlower(potential,closest.x,closest.y,room);
        }
    },
    closestFreeAroundPosCache: {},
    closestFreeAroundPos: function(pos) {
        let key = pos.x+'>'+pos.y;
        if (typeof this.closestFreeAroundPosCache[key] == 'undefined') {
            let nearbySpawn = cachedSearch.nearbySpawn(pos.roomName,pos.x,pos.y);
            let path = this.getRoomPath(pos,Game.spawns[nearbySpawn].pos);
            if (path)
                this.closestFreeAroundPosCache[key] = path.path[0];
            else
                this.closestFreeAroundPosCache[key] = false;
        }
        return this.closestFreeAroundPosCache[key];
    },
    /** @param {Creep} creep **/
    doInfrastructureForSpawn: function(spawn,storage) {
        console.log("doing infrastructure for spawn "+spawn);
        if(!Game.spawns[spawn].room.controller.my || Game.spawns[spawn].room.controller.level < 3) {
            return false;
        }
        var towers = cachedSearch.towersOfRoom(Game.spawns[spawn].room.name);
        if (towers.length > 0) {
            this.buildRampart(Game.spawns[spawn].pos.roomName,Game.spawns[spawn].pos.x,Game.spawns[spawn].pos.y);
        }
    },
    findrepairsforroom: function(name) {
        const targetWallHealth = cachedSearch.getTargetWallHealthOfRoom(name);
        Game.rooms[name].memory.toBeRepaired = [];
        let repair = Game.rooms[name].find(
            FIND_STRUCTURES, {
                filter: (structure) => 
                     (structure.structureType === STRUCTURE_ROAD        && structure.hits < structure.hitsMax * 0.5)
                ||   (structure.structureType === STRUCTURE_CONTAINER   && structure.hits < 225000)
                ||   (structure.structureType === STRUCTURE_WALL        && structure.hits < targetWallHealth)
                ||   (structure.structureType === STRUCTURE_RAMPART     && structure.hits < targetWallHealth)
                ||    (structure.structureType !== STRUCTURE_ROAD
                    && structure.structureType !== STRUCTURE_CONTAINER
                    && structure.structureType !== STRUCTURE_WALL
                    && structure.structureType !== STRUCTURE_POWER_BANK
                    && structure.structureType !== STRUCTURE_RAMPART)   && structure.hits < structure.hitsMax
            });
        let debug = false;
//        if (name == "W89S62")   debug = true;
        if (debug) console.log('findrepairsforroom > '+name+' > repair array length before slicing: '+repair.length);
        let newrepair = [];
        for(let key in repair) {
            let splice = false;
            // remove roads below obstructing buildings
            if (repair[key].structureType == STRUCTURE_ROAD) {
                if (Game.flags['donotrepairroads'] && Game.flags['donotrepairroads'].pos.roomName == name) {
                    if (debug) console.log('findrepairsforroom > '+name+' > splice road because donotrepairroads-flag');
                    splice = true;
                } else {
                    let stuff = repair[key].pos.look()		// collection of things at our potential target
                    if (_.findIndex(stuff, p => 
                            (p.structure && (p.structure && OBSTACLE_OBJECT_TYPES.indexOf(p.structure.structureType) !== -1)))
                        !== -1) { // longhand for 'is there an obstacle there?'
                        splice = true;
                        if (debug) console.log('findrepairsforroom > '+name+' > splice road because obsticle building above');
                    }
                }
            }
            // remove buildings which actually are not mine
            if (typeof repair[key].my !== "undefined" && !repair[key].my) {
                if (debug) console.log('findrepairsforroom > '+name+' > splice '+repair[key].structureType+' because its not mine');
                splice = true;
            }
            // remove the storagecontainer if the actual storage is built
            if (repair[key].id == Game.rooms[name].memory.storagecontainer && (!Game.rooms[name].storage || Game.rooms[name].storage.structureType == STRUCTURE_STORAGE)) {
                splice = true;
            }
            // remove hard coded 
            if (['58fd8a0e468afb2d3f6cc0cd'].indexOf(repair[key].id) !== -1) {
                splice = true;
            }
            if (splice) {
                
            } else {
                newrepair.push(repair[key]);
                if (debug) console.log('findrepairsforroom > '+name+' > NOT splicing '+repair[key].structureType+' because donotrepairroads-flag');
            }
        }    
        repair = newrepair;
        if (debug) console.log('findrepairsforroom > '+name+' > repair array length after slicing: '+repair.length);
        for (let key in repair) {
            let targethealth = false;
            if(repair[key].structureType == STRUCTURE_RAMPART || repair[key].structureType == STRUCTURE_WALL)       targethealth = targetWallHealth;
            else if(repair[key].structureType == STRUCTURE_ROAD)                                                     targethealth = repair[key].hitsMax * 0.5;
            else if(repair[key].structureType == STRUCTURE_CONTAINER)                                                targethealth = 225000;
            else                                                                                                    targethealth = repair[key].hitsMax;
            Game.rooms[name].memory.toBeRepaired = Game.rooms[name].memory.toBeRepaired.concat([{
                x: repair[key].pos.x,
                y: repair[key].pos.y,
                id: repair[key].id,
                targethealth: targethealth
            }]);
        }
    },
    findrepairs: function() {
        for (let name in Game.rooms) {
            this.findrepairsforroom(name);
        }
    },
    // Game.my.managers.infrastructure.doWallRampartCheckForRoom("W85S71");
    doWallRampartCheckForRoom: function(roomname) {
        console.log('DOING RAMPART WALL CHECK FOR '+roomname);
        var somethingdestroyed = false;
        let room = Game.rooms[roomname];
        var walls = room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_WALL});
        room.memory.DefenseWalls = room.memory.DefenseWalls || {}
        var aliveWalls = {};
        for (let key in walls) {
            room.memory.DefenseWalls[walls[key].pos.x] = room.memory.DefenseWalls[walls[key].pos.x] || {};
            room.memory.DefenseWalls[walls[key].pos.x][walls[key].pos.y] = 1;
            aliveWalls[walls[key].pos.x] = aliveWalls[walls[key].pos.x] || {};
            aliveWalls[walls[key].pos.x][walls[key].pos.y] = 1;
        }
        for (let x in room.memory.DefenseWalls) {
            for (let y in room.memory.DefenseWalls[x]) {
                var roompos = new RoomPosition(x,y,roomname);
                if (typeof aliveWalls[x] === 'undefined') {
                    room.createConstructionSite(roompos,STRUCTURE_WALL);
                    somethingdestroyed = true;
                } else if (typeof aliveWalls[x][y] === 'undefined') {
                    room.createConstructionSite(roompos,STRUCTURE_WALL);
                    somethingdestroyed = true;
                }
            }
        }
        var ramparts = room.find(FIND_STRUCTURES, {filter: s => s.structureType == STRUCTURE_RAMPART});
        room.memory.DefenseRamparts = room.memory.DefenseRamparts || {}
        var aliveramparts = {};
        for (let key in ramparts) {
            room.memory.DefenseRamparts[ramparts[key].pos.x] = room.memory.DefenseRamparts[ramparts[key].pos.x] || {};
            room.memory.DefenseRamparts[ramparts[key].pos.x][ramparts[key].pos.y] = 1;
            aliveramparts[ramparts[key].pos.x] = aliveramparts[ramparts[key].pos.x] || {};
            aliveramparts[ramparts[key].pos.x][ramparts[key].pos.y] = 1;
        }
        for (let x in room.memory.DefenseRamparts) {
            for (let y in room.memory.DefenseRamparts[x]) {
                var roompos = new RoomPosition(x,y,roomname);
                if (typeof aliveramparts[x] === 'undefined') {
                    room.createConstructionSite(roompos,STRUCTURE_RAMPART);
                    somethingdestroyed = true;
                } else if (typeof aliveramparts[x][y] === 'undefined') {
                    room.createConstructionSite(roompos,STRUCTURE_RAMPART);
                    somethingdestroyed = true;
                }
            }
        }
        if (somethingdestroyed) {
            Game.notify("Master, I would like to call the safemode in "+roomname);
            Game.rooms[roomname].controller.activateSafeMode();
        }
    },
    // Game.my.managers.infrastructure.doInfrastructureForSpawnRoom(Game.rooms["W85S71"]);
    doInfrastructureForSpawnRoom: function(room) {
        console.log("doing infrastructure for spawn room "+room);
        if(!room.controller.my || room.controller.level < 3) {
            return false;
        }
        // roads around every extension, spawn, storage
        var structures = room.find(FIND_MY_STRUCTURES, {
                filter: (structure) => 
                        structure.structureType === STRUCTURE_SPAWN
                    ||  structure.structureType === STRUCTURE_STORAGE 
                    ||  structure.structureType === STRUCTURE_LINK
                    ||  structure.structureType === STRUCTURE_EXTRACTOR
                    ||  structure.structureType === STRUCTURE_TERMINAL
            }); 
        for(var structure in structures) {
            structure = structures[structure];
            var top = structure.pos.y-1;
            var left = structure.pos.x-1;
            var bottom = structure.pos.y+1;
            var right = structure.pos.x+1;
            var terrain = _.filter(Game.rooms[structure.pos.roomName].lookForAtArea(LOOK_TERRAIN,top,left,bottom,right,true), (terrain) => terrain.terrain == 'plain' || terrain.terrain == 'swamp');
            for (let key in terrain) {
                Memory.infraReason = "roads around every spawn, storage";
                this.buildRoad(structure.pos.roomName,terrain[key].x,terrain[key].y);
            }
        }
        // roads from this rooms storage to this rooms nearest link
        // roads from this rooms storage to this rooms controller
        if (room.storage) {  
            // roads from terminal to storage
            this.buildRampart(room.storage.pos.roomName,room.storage.pos.x,room.storage.pos.y);
            if (room.terminal) {
                Memory.infraReason = "storage > terminal";
                this.buildWay(room.storage.pos, room.terminal.pos);
                this.buildRampart(room.terminal.pos.roomName,room.terminal.pos.x,room.terminal.pos.y);
            }
            var targetWallHealth = cachedSearch.getTargetWallHealthOfRoom(room.name);
            var structures = room.find(FIND_STRUCTURES, {
                    filter: (structure) => 
                            (structure.structureType === STRUCTURE_WALL 
                        ||  structure.structureType === STRUCTURE_RAMPART) 
                        && structure.hits < targetWallHealth
                }); 
            if (room.storage.store[RESOURCE_ENERGY] >= 100000 && structures.length == 0) {
                room.memory.targetWallHealth = _(room.find(FIND_STRUCTURES)).filter(s => s instanceof StructureWall || s instanceof StructureRampart).min(s => s.hits).hits + 10000;
            } else if (structures.length != 0 && room.memory.targetWallHealth < structures[0].hits) {
                room.memory.targetWallHealth = structures[0].hits;
            }
            var link = room.storage.pos.findClosestByPath(LOOK_STRUCTURES, {                    
                filter: function(structure) {
                    return (structure.type == STRUCTURE_LINK);
               }
            });
            if (link) {
                Memory.infraReason = "storage > link";
                this.buildWay(room.storage.pos, link.pos);
            }
            Memory.infraReason = "storage > controller";
            this.buildWay(room.storage.pos, room.controller.pos);
        } else {
            let spawns = cachedSearch.spawnsOfRoom(room.name);
            if (spawns.length > 0) {
                let spawn = spawns[0];
                if (!this.isthereacontainer(spawn.pos.roomName,spawn.pos.x,spawn.pos.y)) {
                    let pos = new RoomPosition(spawn.pos.x-1,spawn.pos.y,spawn.pos.roomName)
                    spawn.room.createConstructionSite(pos,STRUCTURE_CONTAINER);
                }
            }
        }
        if (!room.memory.controllercontainer) {
            var top = Math.max(0,room.controller.pos.y-3);
            var left = Math.max(0,room.controller.pos.x-3);
            var bottom = Math.min(49,room.controller.pos.y+3);
            var right = Math.min(49,room.controller.pos.x+3);
            let container = false;
            room.lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true).forEach(function(lookObject) {
                if(lookObject.structure.structureType == STRUCTURE_CONTAINER) {
                    container = lookObject.structure;
                }
            });
            if (!container) {
                let nearbySpawn = cachedSearch.nearbySpawn(room.controller.pos.roomName,room.controller.pos.x,room.controller.pos.y);
                let path = this.getRoomPath(room.controller.pos,Game.spawns[nearbySpawn].pos);
                if (!this.isthereacontainer(room.name,path.path[2].x,path.path[2].y,0)) {
                    room.createConstructionSite(path.path[2],STRUCTURE_CONTAINER)
                }
            } else {
                room.memory.controllercontainer = container.id;
                container.addToTransportertargets();
            }
        }
        
        // roads from every source in this spawners room to this spawner
        // roads from every source to this spawners room controller
        var towers = cachedSearch.towersOfRoom(room.name);
        if (towers != "") {
            for(let tower in towers) {
                tower = towers[tower];
                this.buildRampart(tower.pos.roomName,tower.pos.x,tower.pos.y);
            }
        }
        var sources = cachedSearch.sourcesOfRoom(room.name);
        for(var source in sources) {
            source = sources[source];
            // roads from every spawn in reserved rooms to nearest spawn
            // roads around every source
            let pos = this.closestFreeAroundPos(source.pos);
            if (!this.isthereacontainer(source.pos.roomName,source.pos.x,source.pos.y) && typeof room.storage !== "undefined") {
                if (towers.length > 0) {
                    Game.rooms[source.pos.roomName].createConstructionSite(pos,STRUCTURE_CONTAINER);                    
                }
            }
            Memory.infraReason = "source > controller";
            this.buildWay(pos, room.controller.pos);
            // roads from every source to this rooms storage
            if (typeof room.storage != "undefined") {
                Memory.infraReason = "source > storage";
                this.buildWay(pos, room.storage.pos);
            }
        }
        if (room.controller.level >= 6) {
            let mineral = room.find(FIND_MINERALS)[0];
            let pos = this.closestFreeAroundPos(mineral.pos);
            if(pos) {
                let nearbySpawn = cachedSearch.nearbySpawn(pos.roomName,pos.x,pos.y);
                this.buildWay(pos, Game.spawns[nearbySpawn].pos);
                if (!this.isthereacontainer(mineral.pos.roomName,mineral.pos.x,mineral.pos.y)) {
                    room.createConstructionSite(pos,STRUCTURE_CONTAINER);
                }
            }
            let extractor = cachedSearch.extractorOfRoom(room); 
            if (extractor.length == 0) {
                room.createConstructionSite(mineral.pos,STRUCTURE_EXTRACTOR);
            }
        }
    },
    doInfrastructureForReservedRoom: function(room) {
//        return;
        if (!Game.rooms[room]) {
            return false;
        }
        if (Memory.infrastructureRooms.indexOf(room) === -1 && !this.done) {
            this.done = true;
            console.log("doing infrastructure for reserved "+room);
            // roads from every spawn in reserved rooms to this spawn
            // roads from every controller in reserved rooms to this spawn
            // roads from this controller in reserved to nearest spawn
            if (Game.rooms[room].controller) {
                var nearbyspawn = cachedSearch.nearbySpawn(Game.rooms[room].controller.pos.roomName,Game.rooms[room].controller.pos.x,Game.rooms[room].controller.pos.y);
                Memory.infraReason = "spawns > controller";
                this.buildWay(Game.spawns[nearbyspawn].pos,Game.rooms[room].controller.pos);
            }
            var sources = cachedSearch.sourcesOfRoom(room);
            for(var source in sources) {
                source = sources[source];
                let pos = this.closestFreeAroundPos(source.pos);
                let nearbySpawn = cachedSearch.nearbySpawn(pos.roomName,pos.x,pos.y);
                this.buildWay(pos, Game.spawns[nearbySpawn].pos);
                if (!this.isthereacontainer(source.pos.roomName,source.pos.x,source.pos.y) && Game.my.managers.strategy.getHighestSpawnLevel() >= 4) {
                    Game.rooms[source.pos.roomName].createConstructionSite(pos,STRUCTURE_CONTAINER);                    
                }
            }
            var extractor = cachedSearch.extractorOfRoom(room); 
            if (extractor.length > 0) {
                let pos = this.closestFreeAroundPos(extractor[0].pos);
                if(pos) {
                    let nearbySpawn = cachedSearch.nearbySpawn(pos.roomName,pos.x,pos.y);
                    this.buildWay(pos, Game.spawns[nearbySpawn].pos);
                    if (!this.isthereacontainer(extractor[0].pos.roomName,extractor[0].pos.x,extractor[0].pos.y) && Game.my.managers.strategy.getHighestSpawnLevel() >= 6) {
                        Game.rooms[extractor[0].pos.roomName].createConstructionSite(pos,STRUCTURE_CONTAINER);
                    }
                }
            }
            Memory.infrastructureRooms = Memory.infrastructureRooms.concat(Array(room));
        } else {
            console.log("NOT doing infrastructure for reserved "+room);
        }
    },
    getRoomPath: function(start,end) {
        var paths = PathFinder.search(start,{pos: end, range:1},{
          // We need to set the defaults costs higher so that we
          // can set the road cost lower in `roomCallback`
          plainCost: 2,
          swampCost: 2,
          maxOps: 8000,
          roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            // In this example `room` will always exist, but since PathFinder 
            // supports searches which span multiple rooms you should be careful!
            if (!room) return;
            let costs = new PathFinder.CostMatrix;
            room.find(FIND_STRUCTURES).forEach(function(structure) {
              if (structure.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(structure.pos.x, structure.pos.y, 1);
              }
            });
            room.find(FIND_CONSTRUCTION_SITES).forEach(function(structure) {
              if (structure.structureType === STRUCTURE_ROAD) {
                // Favor roads over plain tiles
                costs.set(structure.pos.x, structure.pos.y, 1);
              }
            });
            // todo: load planned roads from memory.
            room.memory.plannedRoads = room.memory.plannedRoads || [];
            room.memory.plannedRoads.forEach(function(r) {
                costs.set(r.x, r.y, 1);
            });
            return costs;
          }
        });
        if (paths.incomplete) {
            return false;
        }
        return paths;
    },
    
    
    getRoomPathsLengthSimple: function(from,to,VERBOSE = false) {
        let origFrom = from;
        if (from == to) return 0;
        if (!Game.my.managers.memory.roompathlength[from]) Game.my.managers.memory.roompathlength[from] = {};
        if (!Game.my.managers.memory.roompathlength[from][to]) {
            let path = Game.map.findRoute(from,to,{
                routeCallback(roomName, fromRoomName) {
                    let result = 2;
                    if (Memory.whitelistrooms.indexOf(roomName) !== -1)                             result = 1;
                    else if (Memory.realwhitelistrooms.indexOf(roomName) !== -1)                    result = 1;
                    if (Memory.avoid.indexOf(roomName) !== -1 && roomName != to)      result = Infinity;
                    // todo: favor highways, make SK rooms more expensive.
                    return result;
            	}}
        	);

            if (!path) {
                return Infinity;
            }
            for(let key in path) {
                console.log(key+" > to go from "+from+" to "+to+" i should go to "+path[key].room);
                if (!Game.my.managers.memory.roompathlength[from]) Game.my.managers.memory.roompathlength[from] = {};
                if (!Game.my.managers.memory.roompathlength[from][to]) Game.my.managers.memory.roompathlength[from][to] = "";
                Game.my.managers.memory.roompathlength[from][to] = path.length - key;
                from = path[key].room;
            }
//            console.log('getRoomPathsLengthSimple - :( - new calculation');
        } else {
//            console.log('getRoomPathsLengthSimple - :) - cached value');
        }
        return Game.my.managers.memory.roompathlength[origFrom][to];
    },
    
    
    getRoomPathsLength: function(start,end,VERBOSE = false) {
        var cachekey = start.roomName+"|"+end.roomName;
        var cache = {};
        if (Memory.pathCostsCache) {
            if (Memory.pathCostsCache[cachekey]) {
                if (!Game.varMemory.pathCostsCache) {
                    Game.varMemory.pathCostsCache = {};
                }
                Game.varMemory.pathCostsCache[cachekey] = JSON.parse(Memory.pathCostsCache[cachekey]);
            }
        }
        if (Game.varMemory.pathCostsCache) {
            if (Game.varMemory.pathCostsCache[cachekey]) {
                cache = Game.varMemory.pathCostsCache[cachekey];
            }
        }
        var pathkey = start.roomName+"$"+start.x+"x"+start.y+"|"+end.roomName+"$"+end.x+"x"+end.y;
        var cachedPath = cache[pathkey];
        if (cachedPath) {
            var paths = cachedPath.path;
            if (VERBOSE) console.log("cachedPath!!! |"+pathkey+"|"+paths);
        } else {
            var paths = PathFinder.search(start,{pos: end, range:1},{
              // We need to set the defaults costs higher so that we
              // can set the road cost lower in `roomCallback`
              plainCost: 2,
              swampCost: 2,
              roomCallback: function(roomName) {
                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since PathFinder 
                // supports searches which span multiple rooms you should be careful!
                if (!room) return;
                let costs = new PathFinder.CostMatrix;
                room.find(FIND_STRUCTURES).forEach(function(structure) {
                  if (structure.structureType === STRUCTURE_ROAD) {
                    // Favor roads over plain tiles
                    costs.set(structure.pos.x, structure.pos.y, 1);
                  }
                });
                return costs;
              }
            });
            paths = paths.cost;
            if (VERBOSE) console.log("searchPath!!! |"+pathkey+"|"+paths);
            var cachedPath = {
                path: paths,
            }
            cache[pathkey] = cachedPath;
            if (!Memory.pathCostsCache) {
                Memory.pathCostsCache = {};
            }
            Memory.pathCostsCache[cachekey] = JSON.stringify(cache);
        }
        return paths;        
    },
    buildWay: function(start,end) {
        Memory.infraReason = Memory.infraReason + " from " + start + " to " + end;
        var paths = this.getRoomPath(start,end);
        if (paths) {
            for(var path in paths.path) {
                if (!(paths.path[path].y === 0 || paths.path[path].x === 0 || paths.path[path].y === 49 || paths.path[path].x === 49) && Game.rooms[paths.path[path].roomName]) {
                    // Is there already a known cached road or structure?
                    this.planRoad(paths.path[path].roomName,paths.path[path].x,paths.path[path].y);
                }
            }
        }
	},
	isthereacontainer: function(roomName,x,y,range=1) {
        var cachekey = roomName+"$"+x+"x"+y;
        var isthereacontainer = false;
        var top = Math.max(0,y-range);
        var left = Math.max(0,x-range);
        var bottom = Math.min(49,y+range);
        var right = Math.min(49,x+range);
        Game.rooms[roomName].lookForAtArea(LOOK_STRUCTURES,top,left,bottom,right,true).forEach(function(lookObject) {
            if(lookObject.structure.structureType == STRUCTURE_CONTAINER) {
                isthereacontainer = true;
            }
        });
        Game.rooms[roomName].lookForAtArea(LOOK_CONSTRUCTION_SITES,top,left,bottom,right,true).forEach(function(lookObject) {
            if(lookObject.constructionSite.structureType == STRUCTURE_CONTAINER) {
                isthereacontainer = true;
            }
        });
        return isthereacontainer;
	},
	isthereabuilding: function(roomName,x,y) {
	    let isthereastructure = false;
        Game.rooms[roomName].lookAt(x,y).forEach(function(lookObject) {
            if(lookObject.type == LOOK_STRUCTURES && lookObject.structure.structureType != STRUCTURE_RAMPART) {
                isthereastructure = true;
            } 
        });
        return isthereastructure;
	},
	isthereaconstructionsite: function(roomName,x,y) {
	    let isthereaconstructionorder = false;
        Game.rooms[roomName].lookAt(x,y).forEach(function(lookObject) {
            if(lookObject.type == LOOK_CONSTRUCTION_SITES) {
                isthereaconstructionorder = true;
            }
        });
        return isthereaconstructionorder;
	},
	planRoad: function(roomName,x,y) {
        var isthereaconstructionorder = this.isthereaconstructionsite(roomName,x,y);
        var isthereastructure = this.isthereabuilding(roomName,x,y);
        Memory.rooms[roomName].plannedRoads = Memory.rooms[roomName].plannedRoads || [];
        if(!isthereastructure) {
            if (!isthereaconstructionorder) {
                let push = {x: x,y: y};
                if (typeof _.find(Memory.rooms[roomName].plannedRoads, p => p.x == push.x && p.y == push.y)  == "undefined") {
                    Memory.rooms[roomName].plannedRoads.push(push);
                }
            }
            return true;
        }
        return false;
	},
	buildRoad: function(roomName,x,y) {
        var isthereaconstructionorder = this.isthereaconstructionsite(roomName,x,y);
        var isthereastructure = this.isthereabuilding(roomName,x,y);
        if(!isthereastructure) {
            if (!isthereaconstructionorder) {
                Game.rooms[roomName].createConstructionSite(x,y,STRUCTURE_ROAD);
            }
            return true;
        }
        return false;
	},
	buildRampart: function(roomName,x,y) {
        var isthereastructure = false;
        var structtype = "none";
        Game.rooms[roomName].lookAt(x,y).forEach(function(lookObject) {
            if(lookObject.type == LOOK_STRUCTURES) {
                if (lookObject.structure.structureType == STRUCTURE_RAMPART)
                    isthereastructure = true;
                else if(structtype == "none" && lookObject.structure.structureType == STRUCTURE_ROAD )
                    structtype = lookObject.structure.structureType;
                else
                    structtype = lookObject.structure.structureType;
            }
        });
        if(!isthereastructure) {
            Game.notify(
                'Master! I\'m proud, I build a rampart ('+x+'x'+y+') above '+structtype+' in ' +roomName, 
                15  // group these notifications for 3 hours
            ); 
            var result = Game.rooms[roomName].createConstructionSite(x,y,STRUCTURE_RAMPART);
            return true;
        }
        return false;
	    
	}
};
profiler.registerObject(infrastructure,'infrastructure');
module.exports = infrastructure;
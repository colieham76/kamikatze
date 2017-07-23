"use strict";
const profiler = require('screeps-profiler');
const cachedSearch = {
    /** @param {Creep} creep **/
    cleanUpCache: function (force = false) {
        if (Game.time % 50 === 0 || force) {
            for(var name in Memory.creeps) {
               if(!Game.creeps[name]) {
                    delete Memory.creeps[name];
                    console.log('Clearing non-existing creep memory:', name);
                }
            }
            for(var name in Memory.flags) {
               if(!Game.flags[name]) {
                    delete Memory.flags[name];
                    console.log('Clearing non-existing flag memory:', name);
                }
            }
            for(var name in Memory.market) {
               if(!Game.market.orders[name]) {
                    delete Memory.market[name];
                    console.log('Clearing non-existing market memory:', name);
                }
            }
            for(var name in Memory.structures) {
               if(!Game.structures[name]) {
                    delete Memory.structures[name];
                    console.log('Clearing non-existing structures memory:', name);
                }
            }
            let coreroom = Game.my.managers.strategy.getHighestSpawnRoom();
            for(let roomname in Memory.rooms) {
                if (Game.map.getRoomLinearDistance(roomname,coreroom.name) > 40) {
                    delete Memory.rooms[roomname];
                }
            }
        }
    },
    cacheSizeToConsole: function() {
        console.log("pathCache Size: "+_.keys(Memory.pathCache).length);
        console.log("pathCostsCache Size: "+_.keys(Memory.pathCostsCache).length);
        console.log("nearbySpawn Size: " +_.keys(Memory.nearbySpawn).length);
        console.log("jobs Size: " +_.keys(Memory.jobs).length);
        console.log("infrastructureRoadCache Size: " +_.keys(Memory.infrastructureRoadCache).length);

        console.log("SourcesInRooms Size: " +_.keys(Memory.SourcesInRooms).length);
        console.log("mySources Size: " +_.keys(Memory.mySources).length);
    },
    reallyKillAllCache: function() {
        console.log("killcache");
        Memory.pathCache = {};
        Memory.SourcesInRooms = {};
        Memory.pathCostsCache = {};
        Memory.ExtractorOfRoom = {};
        Memory.nearbySpawn = {};
    },
    sourcesOfRoom: function (roomName) {
        var Return = this.getSearchCache('SourcesInRooms', roomName);
        if (!Return) {
            var Return = Game.rooms[roomName].find(FIND_SOURCES);
            this.setSearchCache('SourcesInRooms', roomName, Return);
            delete Memory.priorityOfRooms;
        }
        return Return;
    },
    // cachedSearch.sourceDeliveresToRoom('5873bbd511e3e4361b4d691d');
    sourceDeliveresToRoom: function (sourceID) {
        var Return = this.getCache('sourceDeliveresToRoom', sourceID, Memory, 25000);
        if (!Return) {
            let source = Game.getObjectById(sourceID);
            let rooms = Game.my.managers.strategy.getCoreRooms();
            let closestroom = false;
            let closestdistance = false;
            for (let room of rooms) {
                let distance = Game.my.managers.infrastructure.getRoomPathsLengthSimple(source.pos.roomName,room);
                if (!closestroom || closestdistance > distance) {
                    closestroom = room;
                    closestdistance = distance;
                }
            }
            Return = closestroom;
            this.setCache('sourceDeliveresToRoom', sourceID, Return);
        }
        return Return;
    },
    sourcesOfRoomCount: function(roomName) {
        var Return = this.getSearchCacheAmount('SourcesInRooms', roomName);
        if (!Return) {
            if (!Game.rooms[roomName]) return false;
            var Return = Game.rooms[roomName].find(FIND_SOURCES);
            this.setSearchCache('SourcesInRooms', roomName, Return);
            // deleting priorityOfRooms, because we see more sources :)
            delete Memory.priorityOfRooms;
            Return = Return.length;
        }
        return Return;
    },
    extractorOfRoom: function (roomName) {
        return (Game.rooms[roomName] ? Game.rooms[roomName].find(FIND_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_EXTRACTOR}) : []);
    },
    spawnsOfRoom: function (roomName) {
        let Return = this.getCache('mySpawns', roomName, Game.varMemory);
        if (!Return) {
            Return = _.filter(Game.spawns, s => s.room.name === roomName && s.isActive());
            this.setCache('mySpawns', roomName, Return, Game.varMemory);
        }
        return Return;
    },
    mySources: function () {
        let Return = this.getCache('mySources', 'a1', Game.varMemory);
        if (!Return) {
            console.log("!!!!!!!!!!!!!!!!!!!!!!!!!!!!! mySources not set!")
        }
        return Return;
    },
    storageOfRoom: function (roomName) {
        return Game.rooms[roomName].storage;
    },
    terminalOfRoom: function (roomName) {
        return Game.rooms[roomName].terminal;
    },
    linksOfRoom: function (roomName) {
        return Game.rooms[roomName].find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_LINK});
    },
    towersOfRoom: function (roomName) {
        return Game.rooms[roomName].find(FIND_MY_STRUCTURES, {filter: (s) => s.structureType === STRUCTURE_TOWER});
    },
    getTargetWallHealthOfRoom: function (roomName) {
        if (Game.rooms[roomName].isMineClaimed()) {
            if (Game.rooms[roomName].controller.level == 8) {
                Game.rooms[roomName].memory.targetWallHealth = Math.max(2000000,Math.min(5000000,Game.rooms[roomName].memory.targetWallHealth)) || 10000;
            } else if (Game.rooms[roomName].controller.level == 7) {
                Game.rooms[roomName].memory.targetWallHealth = Math.max(500000,Math.min(5000000,Game.rooms[roomName].memory.targetWallHealth)) || 10000;
            } else {
                Game.rooms[roomName].memory.targetWallHealth = Math.max(50000,Math.min(50000,Game.rooms[roomName].memory.targetWallHealth)) || 10000;
            }
        } else {
            Game.rooms[roomName].memory.targetWallHealth = 0;
        }

        return Game.rooms[roomName].memory.targetWallHealth;
    },
    constructionsidesOfRoom: function(roomName) {
        var Return
                = this.getSearchCache('constructionsidesOfRoom',roomName,Game.varMemory);
        if (!Return) {
            var Return = Game.rooms[roomName].find(FIND_CONSTRUCTION_SITES);
            this.setSearchCache('constructionsidesOfRoom',roomName,Return,Game.varMemory);
        }
        return Return;
	},

    clearCache: function(cache) {
        delete Memory[cache];
    },
    nearbySpawn: function(roomName,x,y,minEnergyCapacityAvailable = 0) {
        let corerooms = Game.my.managers.strategy.getCoreRooms();
        let returnDistance = Infinity;
        let returnSpawn = false;
        for(let room in corerooms) {
            room = corerooms[room];
            if (Game.rooms[room].energyCapacityAvailable >= minEnergyCapacityAvailable) {
                if (this.spawnsOfRoom(room).length > 0) {
                    var distance = Game.my.managers.infrastructure.getRoomPathsLengthSimple(roomName,room);
                    if(!returnSpawn || returnDistance > distance) {
                        returnDistance = distance;
                        returnSpawn = room;
                    }
                }
            }
        }
        if (returnSpawn)
            return this.spawnsOfRoom(returnSpawn)[0].name;
        else
            return false;
	},

    getSearchCache: function(cachename, cachekey, useMemory = Memory) {
	    if (!useMemory[cachename]) {
	        useMemory[cachename] = {};
	    }
        const cache = useMemory[cachename][cachekey] || {};
        if (cache.cachecontent) {
            cache.uses += 1;
            useMemory[cachename][cachekey] = cache;
            let cacheResult = new Array();
            for(let key in cache.cachecontent) {
                let tmp = Game.getObjectById(cache.cachecontent[key]);
                if (tmp)
                    cacheResult = cacheResult.concat(new Array(tmp));
            }
            return cacheResult;
        } else {
            return false;
        }
	},
	getSearchCacheAmount: function(cachename, cachekey, useMemory = Memory) {
	    if (!useMemory[cachename]) {
	        useMemory[cachename] = {};
	    }
        const cache = useMemory[cachename][cachekey] || {};
        if (cache.cachecontent) {
            cache.uses += 1;
            useMemory[cachename][cachekey] = cache;
            return cache.cachecontent.length;
        } else {
            return false;
        }
	},
    setSearchCache: function(cachename, cachekey, cachecontent, useMemory = Memory) {
        let cacheIDs = new Array();
        for(let key in cachecontent) {
            cacheIDs = cacheIDs.concat(new Array(cachecontent[key].id));
        }
        const cache = useMemory[cachename] || {};
        const cachedObj = {
            cachecontent: cacheIDs,
            uses: 1
        };
        cache[cachekey] = cachedObj;
        useMemory[cachename] = cache;
	},

    getCache: function(cachename, cachekey, useMemory = Memory, maxUses = Infinity) {
        const cache = useMemory[cachename] || {};
        if (cache[cachekey]) {
            if (useMemory === Memory) {
                if (cache[cachekey].uses > maxUses) {
                    delete cache[cachekey];
                    return null;
                }
                cache[cachekey].uses += 1;
                useMemory[cachename] = cache;
            }
            return cache[cachekey].cachecontent;
        } else {
            return null;
        }
	},

    setCache: function(cachename, cachekey, cachecontent, useMemory = Memory) {
        const cache = useMemory[cachename] || {};
        const cachedObj = {
            cachecontent: cachecontent,
            uses: 1
        };
        cache[cachekey] = cachedObj;
        useMemory[cachename] = cache;
	}

};
profiler.registerObject(cachedSearch,'cachedSearch');
module.exports = cachedSearch;
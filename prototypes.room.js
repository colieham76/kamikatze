"use strict";
Room.prototype.isMine = function() {
    if (typeof this.cacheIsMine == "undefined") {
        this.cacheIsMine = false;
        if (Memory.realwhitelistrooms.indexOf(this.name) !== -1) {
            this.cacheIsMine = true;
        }
        if (this.controller) {
            // Raum hat controller
            if (this.controller.owner) {
                // ist geclaimt
                if (this.controller.owner.username == "KamiKatze") {
                    this.cacheIsMine = true;
                } else {
                    this.cacheIsMine = false;
                }
            } else if (this.controller.reservation) {
                if (this.controller.reservation.username == "KamiKatze") {
                    this.cacheIsMine = true;
                } else {
                    this.cacheIsMine = false;
                }
            } else {
                if (Memory.realwhitelistrooms.indexOf(this.name) !== -1) {
                    this.cacheIsMine = true;
                } else {
                    this.cacheIsMine = false;
                }
            }
        }
    }
    return this.cacheIsMine;
}

Room.prototype.getEnemies = function() {
    this.my = this.my || {};
    this.my.enemies = this.my.enemies || this.find(FIND_HOSTILE_CREEPS);
    return this.my.enemies;
}

Room.prototype.areThereEnemies = function() {
    this.my = this.my || {};
    this.my.enemies = this.my.enemies || this.find(FIND_HOSTILE_CREEPS);
    return (this.my.enemies.length > 0);
}

Room.prototype.areThereEnemyConstructionSites = function() {
    return (this.find(FIND_HOSTILE_CONSTRUCTION_SITES, {filter: c => (Memory.friendly.indexOf(c.owner.username) == -1 && Memory.allied.indexOf(c.owner.username) == -1 && c.progress > 0)}).length > 0);
}

Room.prototype.isMineClaimed = function() {
    if (typeof this.cacheIsMineClaimed == "undefined") {
        this.cacheIsMineClaimed = false;
        if (this.controller && this.controller.my) {
            this.cacheIsMineClaimed = true;
        }
    }
    return this.cacheIsMineClaimed;
}

Room.prototype.isMineReserved = function() {
    if (typeof this.cacheIsMineReserved == "undefined") {
        this.cacheIsMineReserved = false;
        if (this.controller && this.controller.reservation && this.controller.reservation.username == "KamiKatze") {
            this.cacheIsMineReserved = true;
        }
    }
    return this.cacheIsMineReserved;
}

Room.prototype.isHighway = function() {
	let parsed = this.name.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
	return (parsed[1] % 10 === 0) || (parsed[2] % 10 === 0);
}

Room.prototype.isSK = function() {
	let parsed = this.name.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
	return (_.inRange(parsed[1] % 10,4,7)) && (_.inRange(parsed[2] % 10,4,7) && !(parsed[1] == 5 && parsed[2] == 5));
}


Room.prototype.addToAvoidList = function() {
    if (Memory.avoid.indexOf(this.name) === -1) {
        Memory.avoid = Memory.avoid.push(this.name);
        delete Memory.roomroute;
        delete Memory.priorityOfRooms;
        delete Memory.jobfindroutecache;
    }
}

Room.prototype.buildPlannedRoad = function() {
    // abort if the room is not whitelisted, and no highway room - highway rooms mostlikely never get whitelisted :)
    if (
        Memory.whitelistrooms.indexOf(this.name) === -1
        && !this.isHighway()
    ) {
        return false;
    }
    if (this.isMineClaimed() && this.controller.level < 3) {
        return false;
    }
    if (Game.flags['donotrepairroads'] && Game.flags['donotrepairroads'].pos.roomName == this.name) return false;
    this.memory.plannedRoads = _.uniq(this.memory.plannedRoads, p => p.x+"$"+p.y) || [];
    if (this.memory.plannedRoads.length > 0 && _.filter(Game.constructionSites,s=>s.pos.roomName == this.name && s.structureType == STRUCTURE_ROAD).length < 4) {
        let p = _.first(this.memory.plannedRoads);
        this.createConstructionSite(p.x,p.y,STRUCTURE_ROAD);
        this.memory.plannedRoads.splice(0,1);
    }
}


Room.prototype.buildPlannedWall = function() {
    // abort if the room is not whitelisted.
    if (Memory.whitelistrooms.indexOf(this.name) === -1) return false;
    this.memory.plannedWalls = _.uniq(this.memory.plannedWalls, p => p.x+"$"+p.y) || [];
    if (this.memory.plannedWalls.length > 0 && _.filter(Game.constructionSites,s=>s.pos.roomName == this.name && [STRUCTURE_WALL,STRUCTURE_RAMPART].indexOf(s.structureType) != -1).length < 8) {
        let p = _.first(this.memory.plannedWalls);
        console.log(this.createConstructionSite(p.x,p.y,p.struc));
        this.memory.plannedWalls.splice(0,1);
    }
}

Room.prototype.getConstructionSites = function() {
    if (typeof this.cacheGetConstructionSites == "undefined") {
        this.cacheGetConstructionSites = _.filter(Game.constructionSites, (cs) => cs.pos.roomName == this.name);
    }
    return this.cacheGetConstructionSites;
}
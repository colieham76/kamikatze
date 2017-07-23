"use strict";
RoomPosition.prototype.isExit = function() {
    return (this.x == 0 || this.x == 49 || this.y == 0 || this.y == 49);
}

RoomPosition.prototype.findClosestByPytRange = function(poses) {
    let returnrange = false;
    let returnpos = false
    for(let key in poses) {
        let range = this.getPytDistance(poses[key]);
        if (!returnpos || returnrange > range) {
            returnpos = poses[key];
            returnrange = range;
        }
    }
    return returnpos;
    
}

RoomPosition.prototype.getPytDistance = function(pos) {
    return Math.sqrt(Math.pow(this.x-pos.x,2)+Math.pow(this.y-pos.y,2));
}

RoomPosition.prototype.findMyPathToSerialize = function(path) {
    if (!path) return false;
    
    /*
    TOP: 1,
    TOP_RIGHT: 2,
    RIGHT: 3,
    BOTTOM_RIGHT: 4,
    BOTTOM: 5,
    BOTTOM_LEFT: 6,
    LEFT: 7,
    TOP_LEFT: 8,
    */
    
    let dirlibrary = {
        '-1': {
            '-1': 8, // TOP_LEFT
            '0': 7, // LEFT
            '1': 6 // BOTTOM_LEFT 
        },
        '0': {
            '-1': 1, // TOP
            '0': false,
            '1': 5 // BOTTOM
        },
        '1': {
            '-1': 2, // TOP_RIGHT 
            '0': 3, // RIGHT
            '1': 4  // BOTTOM_RIGHT
        },
    }
    let ser = _.padLeft(path[0].x,2,0)+_.padLeft(path[0].y,2,0);
    for(let key = 0; key < path.length; key++) {
        if (path[key].roomName != this.roomName) {
            console.log("multiroompath - break: path roomName: "+path[key].roomName+" this.roomName "+this.roomName);
            break;
        }
        let x = this.x
        let y = this.y;
        if (key != 0) {
            x = path[key-1].x
            y = path[key-1].y;
        } 
        ser = ser + "" + dirlibrary[path[key].x-x][path[key].y-y];
    }
    return ser;
}


RoomPosition.prototype.findMyPathTo = function(pos, opts = {}, debug = false) {
    var start = this;
    let path = [];
    let PathFinderOpts = {
        maxRooms: opts.maxRooms || 16,
        plainCost: opts.plainCost || 2,
        swampCost: opts.swampCost || 10,
        maxOps: opts.maxOps || 2000,
        roomCallback: function(roomName) {
            let room = Game.rooms[roomName];
            if (!room) return;
            let max = 1;
            if (opts.ignoreDestructibleStructures)
                max = _(room.find(FIND_STRUCTURES)).filter(s => OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1).max(s => s.hits).hits;
            let costs = false;
            
            if (Game.my.managers.memory.cacheRoadCostMatrix[room.name]) {
                costs = PathFinder.CostMatrix.deserialize(Game.my.managers.memory.cacheRoadCostMatrix[room.name]);
            } else {
                costs = new PathFinder.CostMatrix;
                room.find(FIND_STRUCTURES).forEach(function(s) {
                    if (s.structureType === STRUCTURE_ROAD) {
                        costs.set(s.pos.x, s.pos.y, opts.roadCost || 1);
                    }
                    if (s.structureType === STRUCTURE_PORTAL) {
                        costs.set(s.pos.x, s.pos.y, 255);
                    }
                });
                if (!opts.roadCost || opts.roadCost == 1) {
                    Game.my.managers.memory.cacheRoadCostMatrix[room.name] = costs.serialize();
                }
            }
            room.find(FIND_STRUCTURES).forEach(function(s) {
                if (OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1 || (s.structureType == STRUCTURE_RAMPART && (!s.isPublic && !s.my))) {
                    if (opts.ignoreDestructibleStructures && s.hits) {
                        costs.set(s.pos.x, s.pos.y, ((s.hits/max)*245)+10);
                    } else {
                        costs.set(s.pos.x, s.pos.y, 255);
                    }
                }
            });
            // Avoid constructionsites
            room.find(FIND_CONSTRUCTION_SITES).forEach(function(s) {
                if (OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1 || !s.my) {
                    costs.set(s.pos.x, s.pos.y, 255);
                }
            });
            // Avoid exits
            if (opts.maxRooms == 1 && !pos.isExit()) {
                room.find(FIND_EXIT).forEach(function(e) {
                    if (start.x != e.x && start.y != e.y) {
                        costs.set(e.x, e.y, 255);
                    }
                });
            }
            // Avoid creeps in the room
            room.find(FIND_CREEPS).forEach(function(creep) {
                // If my target is the creep, i might want to move into it, so we should not block that field.
                if (creep.pos.x == pos.x && creep.pos.y == pos.y) {
                    if (debug) console.log('NOT adding creep at '+creep.pos+' to cost matrix because of pos: '+pos);
                } else {
                    if (debug) console.log('adding creep at '+creep.pos+' to cost matrix');
                    if (creep.my && creep.memory.role == "squadbuddy" ) {
                        costs.set(creep.pos.x, creep.pos.y, 10);
                    } else {
                        costs.set(creep.pos.x, creep.pos.y, 255);
                        if (opts.avoid && !creep.my) {
                            if (creep.getActiveBodyparts(RANGED_ATTACK) != 0) {
                                costs.set(creep.pos.x-3, creep.pos.y-3, 255);
                                costs.set(creep.pos.x-3, creep.pos.y-2, 255);
                                costs.set(creep.pos.x-3, creep.pos.y-1, 255);
                                costs.set(creep.pos.x-3, creep.pos.y, 255);
                                costs.set(creep.pos.x-3, creep.pos.y+1, 255);
                                costs.set(creep.pos.x-3, creep.pos.y+2, 255);
                                costs.set(creep.pos.x-3, creep.pos.y+3, 255);
                                
                                costs.set(creep.pos.x+3, creep.pos.y-3, 255);
                                costs.set(creep.pos.x+3, creep.pos.y-2, 255);
                                costs.set(creep.pos.x+3, creep.pos.y-1, 255);
                                costs.set(creep.pos.x+3, creep.pos.y, 255);
                                costs.set(creep.pos.x+3, creep.pos.y+1, 255);
                                costs.set(creep.pos.x+3, creep.pos.y+2, 255);
                                costs.set(creep.pos.x+3, creep.pos.y+3, 255);
                                
                                costs.set(creep.pos.x-2, creep.pos.y-3, 255);
                                costs.set(creep.pos.x-1, creep.pos.y-3, 255);
                                costs.set(creep.pos.x, creep.pos.y-3, 255);
                                costs.set(creep.pos.x+1, creep.pos.y-3, 255);
                                costs.set(creep.pos.x+2, creep.pos.y-3, 255);
                                
                                costs.set(creep.pos.x-2, creep.pos.y+3, 255);
                                costs.set(creep.pos.x-1, creep.pos.y+3, 255);
                                costs.set(creep.pos.x, creep.pos.y+3, 255);
                                costs.set(creep.pos.x+1, creep.pos.y+3, 255);
                                costs.set(creep.pos.x+2, creep.pos.y+3, 255);
                            } else if (creep.getActiveBodyparts(ATTACK) != 0) {
                                costs.set(creep.pos.x-1, creep.pos.y-1, 255);
                                costs.set(creep.pos.x-1, creep.pos.y, 255);
                                costs.set(creep.pos.x-1, creep.pos.y+1, 255);
                                
                                costs.set(creep.pos.x+1, creep.pos.y-1, 255);
                                costs.set(creep.pos.x+1, creep.pos.y, 255);
                                costs.set(creep.pos.x+1, creep.pos.y+1, 255);
        
                                costs.set(creep.pos.x, creep.pos.y-1, 255);
                                
                                costs.set(creep.pos.x, creep.pos.y+1, 255);
        
                            }
                        }
                    }
                } 
            });
            // the target should not be blocked, even if it was blocked before :D
            costs.set(pos.x,pos.y,0);
            return costs;
        }
    }
    let PathFinderTarget = {
        pos: pos,
        range: opts.range || 0
    }
    
    var paths = PathFinder.search(this,PathFinderTarget,PathFinderOpts);
    
    if (paths.incomplete && opts.onlyMoveOnCompletePath) {
        return false;
    }
    
    if (paths.incomplete) { 
        if (  paths.path.length == 0  || !paths.path[paths.path.length-1].getRangeTo(PathFinderTarget.pos) <= opts.range + 2) {
            console.log('incomplete last path pos: '+JSON.stringify(paths.path[paths.path.length-1]));
            console.log('incomplete pos: '+JSON.stringify(this));
            console.log('incomplete target: '+JSON.stringify(PathFinderTarget));
            console.log('incomplete opts: '+JSON.stringify(PathFinderOpts));
//            console.log('incomplete return: '+JSON.stringify(paths));
     //       console.log('incomplete target distance to pathend: '+paths.path[paths.path.length-1].getRangeTo(PathFinderTarget.pos));
            console.log('incomplete allowed target distance: '+(opts.range + 2));
            console.log('INCOMPLETE');
            return false;
        } 
    }
    
/*    delete opts.maxRooms;
    delete opts.plainCost;
    delete opts.swampCost;
    delete opts.roadCost;
    delete opts.maxOps;
    delete opts.range;
    delete opts.ignoreDestructibleStructures;
    delete opts.avoid; // not supported by PathFinder anyway
    if (_.keys(opts).length > 0) {
        Game.notify("there are opts missing: "+JSON.stringify(opts));
        console.log("there are opts missing: "+JSON.stringify(opts));
    }*/
    return paths.path;
}
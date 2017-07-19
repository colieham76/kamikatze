"use strict";
Creep.prototype.roomroute = function(from,to,debug = false, avoid = true) {
    if (typeof to == "undefined") return false;
    if (this.name ==  'harvesterHauler-467') {
        debug = true;
    }
    if (debug) console.log('roomroute start');
    if (debug) console.log(from,to)
    if (debug) console.log(this.memory.role);
    let origFrom = from;
    let result = false;
    if (avoid) {
        if (!Game.my.managers.memory.roomroute) Game.my.managers.memory.roomroute = {};
        if (!Game.my.managers.memory.roomroute[from]) Game.my.managers.memory.roomroute[from] = {};
        if (!Game.my.managers.memory.roomroute[from][to]) {
            let path = Game.map.findRoute(from,to,{
                routeCallback(roomName, fromRoomName) {
                    let result = 4;
                    if (Memory.whitelistrooms.indexOf(roomName) !== -1)                             result = 1;
                    else if (Memory.realwhitelistrooms.indexOf(roomName) !== -1)                    result = 1;
                	let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
	                if ((parsed[1] % 10 === 0) || (parsed[2] % 10 === 0)) {
	                    result = 2;
	                }
                    if (Memory.avoid.indexOf(roomName) !== -1 && roomName != to)      result = Infinity;
                    // todo: favor highways, make SK rooms more expensive.
                    return result;
            	}}
        	);
            for(let key in path) {
                Game.my.managers.memory.roomroute[from] = Game.my.managers.memory.roomroute[from] || {};
                Game.my.managers.memory.roomroute[from][to] = path[key].exit;
                from = path[key].room;
            }
        }
        if(this.memory._roomroute) {
            if (this.memory._roomroute.exit != Game.my.managers.memory.roomroute[origFrom][to] || this.memory._roomroute.room != this.pos.roomName) {
                delete this.memory._roomroute;
            } else {
                result = this.memory._roomroute.result;
            }
        }
        if (!result) {
            if (debug) console.log(this.name+" findClosestByRange from "+origFrom+" to "+to+" > "+Game.my.managers.memory.roomroute[origFrom][to]);
            result = this.pos.findClosestByPath(Game.my.managers.memory.roomroute[origFrom][to]);
            if (debug) console.log(this.name+" result "+JSON.stringify(result));
            if (!result) {
                delete this.memory._roomroute;
                try {
                    delete Game.my.managers.memory.roomroute[from][to];
                } catch (e) {
                    
                }
                console.log("DELETING roomroute for some route")
                return false;
            }
            this.memory._roomroute = this.memory._roomroute || {};
            this.memory._roomroute.result = result;
            this.memory._roomroute.room = this.pos.roomName;
            this.memory._roomroute.exit = Game.my.managers.memory.roomroute[origFrom][to];
        }
        if (debug) console.log(JSON.stringify(result));
        if (debug) console.log('roomroute end');
        return new RoomPosition(result.x,result.y,result.roomName);
    } else {
        if(this.memory._roomroute) {
            if (this.memory._roomroute.room != this.pos.roomName) {
                delete this.memory._roomroute;
            } else {
                result = this.memory._roomroute.result;
            }
        }
        if (!result) {
            let path = Game.map.findRoute(from,to,{
                routeCallback(roomName, fromRoomName) {
                    let result = 2;
                    if (Memory.whitelistrooms.indexOf(roomName) !== -1)                             result = 1;
                    else if (Memory.realwhitelistrooms.indexOf(roomName) !== -1)                    result = 1;
                	let parsed = roomName.match(/^[WE]([0-9]+)[NS]([0-9]+)$/);
	                if ((parsed[1] % 10 === 0) || (parsed[2] % 10 === 0)) {
	                    result = 2;
	                }
    //                if (Memory.avoid.indexOf(roomName) !== -1 && roomName != to)      result = Infinity;
                    // todo: favor highways, make SK rooms more expensive.
                    return result;
            	}}
        	);
    /*    	if (this.name == "squadskirmisher-993") {
        	    console.log(this.name+" in "+this.room.name+" not avoiding!")
        	    console.log(JSON.stringify(path));
        	}*/
            result = this.findClosestByRange(path[0].exit);
            if (!result) return false;
    
            this.memory._roomroute = this.memory._roomroute || {};
            this.memory._roomroute.result = result;
            this.memory._roomroute.room = this.pos.roomName;
            this.memory._roomroute.exit = path[0].exit;
        }
        return new RoomPosition(result.x,result.y,result.roomName);
    }
}

Creep.prototype.isOnExit = function() {
    return this.pos.isExit();
    
}



Creep.prototype.findClosestByRange = function(target) {
    if (typeof target == "undefined")
        return false;
    let result = this.pos.findClosestByPath(target);
    if (!result) return false;
    let x = result.x;
    let y = result.y;
    return new RoomPosition(x,y,this.room.name);;
}

Creep.prototype.findClosestByPathCached = function(target) {
    if (typeof target == "undefined")
        return false;
    let from = this.pos.x+"x"+this.pos.y;
    let x = false;
    let y = false;
    let result = false;
    if (!Memory.pathroute)
        Memory.pathroute = {};
    if (!Memory.pathroute[this.room.name])           
        Memory.pathroute[this.room.name] = JSON.stringify({});
    if (!Game.varMemory.pathroute)                      
        Game.varMemory.pathroute = {};
    if (!Game.varMemory.pathroute[this.room.name])  {  
        Game.varMemory.pathroute[this.room.name] = JSON.parse(Memory.pathroute[this.room.name]);
    }
    if (!Game.varMemory.pathroute[this.room.name][from])   
        Game.varMemory.pathroute[this.room.name][from] = {};
    if (!Game.varMemory.pathroute[this.room.name][from][target]) {
        result = this.pos.findClosestByPath(target,{ignoreCreeps:true});
        if (!result) return false;
        Game.varMemory.pathroute[this.room.name][from][target] = result.x+"x"+result.y;
        Memory.pathroute[this.room.name] = JSON.stringify(Game.varMemory.pathroute[this.room.name]);
        x = result.x;
        y = result.y;
    } else {
        result = Game.varMemory.pathroute[this.room.name][from][target].split('x');
        x = result[0];
        y = result[1];
    }
    return new RoomPosition(x,y,this.room.name);;
}

Creep.prototype.followMovePredefined = function(debug) {
    let result = false;
    this.memory.__opts = this.memory.__opts || {};
    if (this.memory.__path) { 
        if (this.name == debug) console.log(this.name+ " is a happy "+this.memory.role+", cached path")
        let path = [];
        try {
            path = Room.deserializePath(this.memory.__path);
        } catch (err) {
            console.log('catched error with deserializePath, deleting path');
            delete this.memory.__path;
            return false;
        }
        if(path.length == 0) {
            if (this.name == debug) console.log(this.name+ " is a sad "+this.memory.role+", path length is 0: "+JSON.stringify(this.memory.__path));
            delete this.memory.__path;
            delete this.memory.__step;
            delete this.memory.__lastmovetarget;
            delete this.memory.__opts;
            return false;
        }
        let targetPos = path[path.length-1];
        targetPos = new RoomPosition(targetPos.x,targetPos.y,this.room.name);
        if (path[this.memory.__step]) {
            let dir = path[this.memory.__step].direction;
            let blocked = this.dirIsBlocked(dir,(debug==this.name),this.memory.__opts.ignoreCreeps); 
            if (blocked || path[this.memory.__step].x-path[this.memory.__step].dx != this.pos.x || path[this.memory.__step].y-path[this.memory.__step].dy != this.pos.y) {
                if (this.name == debug && blocked) 
                    console.log("is blocked? "+blocked);
                if (this.name == debug && (path[this.memory.__step].x-path[this.memory.__step].dx != this.pos.x || path[this.memory.__step].y-path[this.memory.__step].dy != this.pos.y))
                    console.log("is offpath!");
                // aber eigentlich müsste man doch sagen können "wenn dein bewegungsziel im aktuellem raum ist, dann check ob die nächste direction dich in einen exit laufen lässt"
                // wenn ja, lösch den pfad, und bleib stehen
                let stopBecauseExit = false;
                if (!targetPos.isExit()) {
                    stopBecauseExit = this.dirIsExit(dir,(debug==this.name));
                }
                if(!stopBecauseExit) {
                    if (!this.memory.__opts.checkIfSave || this.dirIsSave(dir)) {
                        result = this.move(dir);
                    }
                }
                delete this.memory.__path;
                delete this.memory.__step;
                delete this.memory.__lastmovetarget;
                delete this.memory.__opts;
            } else {
                // aber eigentlich müsste man doch sagen können "wenn dein bewegungsziel im aktuellem raum ist, dann check ob die nächste direction dich in einen exit laufen lässt"
                // wenn ja, lösch den pfad, und bleib stehen
                let stopBecauseExit = false;
                if (!targetPos.isExit()) {
                    if (this.name == debug) console.log(this.name+" at "+this.pos+" going in dir "+dir+" to "+targetPos+" is checking if the path is Exit: "+JSON.stringify(targetPos.isExit()));
                    stopBecauseExit = this.dirIsExit(dir,(debug==this.name));
                }
                if(!stopBecauseExit) {
                    if (!this.memory.__opts.checkIfSave || this.dirIsSave(dir)) {
                        result = this.move(dir);
                    }
                } else {
                    if (this.name == debug) console.log(this.name+" at "+this.pos+" going in dir "+dir+" to "+targetPos+" deletes its path because "+JSON.stringify(stopBecauseExit));
                    delete this.memory.__path;
                    delete this.memory.__step;
                    delete this.memory.__lastmovetarget;
                    delete this.memory.__opts;
                }
                if (this.name == debug) console.log(this.name+" has move result > "+result);
                this.room.visual.poly(path, {stroke: '#fff', strokeWidth: .15, opacity: .2, lineStyle: 'dashed'}); 
                if (result == OK) {
                    this.memory.__step++;
                    this.hasMoveOrder = true;
                }
            }
            let last = path[path.length-1];
            if (path.length == this.memory.__step || path.length == 0) {
                if (this.name == debug) console.log("real delete");
                delete this.memory.__path;
                delete this.memory.__step;
                delete this.memory.__lastmovetarget;
                delete this.memory.__opts;
            }
        } else {
            delete this.memory.__path;
            delete this.memory.__step;
            delete this.memory.__lastmovetarget;
            delete this.memory.__opts;
        }
        return true;
    }
    return false;
}

Creep.prototype.movePredefined = function(targetPos, opts = {}, debug = false) {
    if (debug)
        debug = this.name;
    if (this.name == debug) console.log('. ');
    if (this.name == debug) console.log('. ');
    if (this.name == debug) console.log('------- debug movepredefined of '+this.name+' start ------- ');
    if (this.name == debug) console.log(' my memory: '+JSON.stringify(this.memory));
    if (this.hasMoveOrder == true) {
        console.log("!!!!! movepredefined: doppelbuchung!");
        console.log("!!!!! "+this.name);
        console.log("!!!!! "+this.pos);
    }
    if(this.fatigue > 0) {
        if (this.name == debug) console.log('fatigue return false');
        return false;
    }
    if(!targetPos) {
        if (this.name == debug) console.log('targetPos equals like false return false');
        return false;
    }
    if (this.name == debug) console.log("my orig targetpos "+targetPos);
    if (this.name == debug) console.log("my orig opts are "+JSON.stringify(opts));
    if (targetPos.pos) {
        targetPos = targetPos.pos;
    }
    let origTarget = targetPos;
    if (this.name == debug) console.log("i want to go to "+targetPos);
    if (this.name == debug) console.log("i am in "+this.pos);

    if (this.pos.roomName == targetPos.roomName && this.pos.x == targetPos.x && this.pos.y == targetPos.y) {
        if (this.name == debug) console.log('already at target return false');
        return false;
    }
    if (opts.range && this.pos.getRangeTo(targetPos) <= opts.range) {
        if (this.name == debug) console.log('already in range return false');
        return false;
    }
    if (typeof opts.avoid === "undefined" || opts.avoid) {
        opts.avoid = true;
    } else {
        opts.avoid = false;
    }
    if (typeof opts.onlyMoveOnCompletePath === "undefined") {
        opts.onlyMoveOnCompletePath = false;
    }
    if (this.pos.roomName != targetPos.roomName && !opts.noShortCuts) {
        let tmp = this.roomroute(this.pos.roomName,targetPos.roomName,this.name == debug,opts.avoid)
        if (debug) console.log("roomroute result: "+JSON.stringify(tmp));
        if (tmp) {
            if (this.name == debug) console.log("using shortcut");
            if (this.name == debug) console.log(this.name+" avoid: "+opts.avoid);
            targetPos = tmp;
            opts.range = 0;
        }
    }
    delete opts.noShortCuts;
    if (this.pos.inRangeTo(targetPos,(!opts.range?0:opts.range))) {
        if (this.name == debug) console.log("i am in range!");
        if (this.name == debug) console.log(JSON.stringify(targetPos));
        if (this.name == debug) console.log(JSON.stringify(this.pos));
        if (
            (this.pos.y == 0 || this.pos.y == 49 || this.pos.x == 0 || this.pos.x == 49)
            &&
            (targetPos.y != 0 && targetPos.y != 49 && targetPos.x != 0 && targetPos.x != 49 && targetPos.room != this.pos.roomName)
        ) {
            if (this.name == debug) console.log("but i need to go to mid!");
            this.move(this.pos.getDirectionTo(25,25));
        }
        delete this.memory.__path;
        delete this.memory.__step;
        delete this.memory.__lastmovetarget;
        delete this.memory.__opts;
        return false;
    }

    let result = false;
    if (targetPos.roomName == this.pos.roomName) {
        opts.maxRooms = 1;
    }
    if (!targetPos) {
        return false;
    }
    let start = this.pos.x+"x"+this.pos.y;
    let target = targetPos.x+"x"+targetPos.y;
//        console.log(target+" > "+this.memory.__lastmovetarget);
    if (!this.memory.__lastmovetarget || this.memory.__lastmovetarget != target || !this.memory.__path) {
        this.memory.__lastmovetarget = target;
        let usenewpathfinder = true;
        let path = false;
        if (this.name == debug) console.log('trying to find a path to: '+JSON.stringify(targetPos));
        if (this.name == debug) console.log('trying to find a path with opts: '+JSON.stringify(opts));
        path = this.pos.findMyPathTo(targetPos,opts,debug);
        if (!path && !opts.onlyMoveOnCompletePath) {
            usenewpathfinder = false;
            delete opts.avoid;
            path = this.pos.findPathTo(targetPos,opts);
            // fallback!
            console.log("PATHFINDER DID NOT FIND WAY...");
            console.log("name: "+this.name);
            console.log("pos: "+this.pos);
            console.log("targetPos: "+JSON.stringify(targetPos));
            console.log("opts: "+JSON.stringify(opts));
        }
        if (this.name == debug) console.log('path found: '+JSON.stringify(path));
        // Evtl. habe ich ein Target hinter einer Wand, dann finde ich keinen Pfad.
        // In dem Fall ist die endposition ungleich der zielposition
        // dann lauf durch wände ^^
        if((this.getActiveBodyparts(ATTACK) > 0 || this.getActiveBodyparts(RANGED_ATTACK) > 0) && (!path.length || targetPos.getRangeTo(new RoomPosition(path[path.length - 1].x,path[path.length - 1].y,this.room.name)) > (!opts.range?0:opts.range))) {
            if (this.name == debug) console.log("Rambo: ignoreDestructibleStructures!");
            opts.ignoreDestructibleStructures = true;
            // TODO use PathFinder with Costmatrix taking Wall Health into account.
            if (!usenewpathfinder) {
                delete opts.avoid;
                path = this.pos.findPathTo(targetPos,opts);
                if (!path && !opts.onlyMoveOnCompletePath) {
                    usenewpathfinder = false;
                    delete opts.avoid;
                    path = this.pos.findPathTo(targetPos,opts);
                    // fallback!
                    console.log("PATHFINDER DID NOT FIND WAY...");
                    console.log("name: "+this.name);
                    console.log("pos: "+this.pos);
                    console.log("targetPos: "+JSON.stringify(targetPos));
                    console.log("opts: "+JSON.stringify(opts));
                }
            } else {
                path = this.pos.findMyPathTo(targetPos,opts,debug);
            }
        }
        
        if (!usenewpathfinder) {
            path = Room.serializePath(path);
        } else {
            path = this.pos.findMyPathToSerialize(path);
        }
        if (this.name == debug) console.log(this.room.name+" > "+path);
        this.memory.__path = path;
        this.memory.__step = 0;
    }
    this.memory.__opts = opts;
    let followMovePredefined = this.followMovePredefined(debug);
    if (!followMovePredefined && !opts.onlyMoveOnCompletePath) {
        opts.maxOps = 16000;
        console.log(this.name+ " is a sad "+this.memory.role+" in "+this.pos+", moveTo "+targetPos+" with opts "+JSON.stringify(opts));
        delete opts.serialize;
        try {
            result = this.moveTo(targetPos,opts);
            console.log('result: '+result);
            this.hasMoveOrder = true; 
        } catch (err) {
            Game.notify("moveTo happend again: targetPos: "+JSON.stringify(targetPos)+" opts: "+JSON.stringify(opts)+" thispos: "+JSON.stringify(this.pos));
        }
    }
    if (this.name == debug) console.log("i wanted to go to "+JSON.stringify(targetPos));
    if (this.name == debug) console.log("my moveto opts were "+JSON.stringify(opts));
    if (this.name == debug) console.log("my moveto result was "+result);
    if (this.name == debug) console.log('------- debug movepredefined end ------- ');
    return result;
}

Creep.prototype.dirToPos = function(dir) {
    this.cacheDirToPos = this.cacheDirToPos || [];
    if (!this.cacheDirToPos[dir]) {
        let positionsx = [ 0, 1, 1, 1, 0,-1,-1,-1];
        let positionsy = [-1,-1, 0, 1, 1, 1, 0,-1];
        this.cacheDirToPos[dir] = new RoomPosition(
            Math.min(49,Math.max(0,this.pos.x + positionsx[dir-1])),
            Math.min(49,Math.max(0,this.pos.y + positionsy[dir-1])),
            this.room.name
        );
    }
    return this.cacheDirToPos[dir];
}
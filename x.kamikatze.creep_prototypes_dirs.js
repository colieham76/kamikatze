
Creep.prototype.dirNameToDirNumber = function(goto) {
    if (goto == "TOP")          goto = 1;
    else if (goto == "TOP_RIGHT")    goto = 2;
    else if (goto == "RIGHT")        goto = 3;
    else if (goto == "BOTTOM_RIGHT") goto = 4;
    else if (goto == "BOTTOM")       goto = 5;
    else if (goto == "BOTTOM_LEFT")  goto = 6;
    else if (goto == "LEFT")         goto = 7;
    else if (goto == "TOP_LEFT")     goto = 8;
    return goto;
}

Creep.prototype.dirIsBlocked = function(dir, debug = false, ignoreCreeps = false)  {
    if (typeof ignoreCreeps == "undefined") {
        ignoreCreeps = false;
    }
    let pos = this.dirToPos(dir);

//    console.log(this.name+">"+this.ticksToLive,dir,typeof x, typeof y,x,y,this.pos.roomName);    
    if (pos.isExit()) {
        return false;
    }
    
    //console.log(dir,x,y, this.pos.roomName);
    
    let stuff = pos.look()		// collection of things at our potential target
    
    if (ignoreCreeps) {
        if (_.findIndex(stuff, p => 
                (p.structure && (p.structure && OBSTACLE_OBJECT_TYPES.indexOf(p.structure.structureType) !== -1)) || 
                p.terrain == 'wall')
            !== -1) { // longhand for 'is there an obstacle there?'
            if (debug) console.log("there is a obsticle");
            return true;
        } else {
            if (debug) console.log("there is no obsticle");
            return false;
        }
    } else {
        if (_.findIndex(stuff, p => 
                p.type == 'creep' || 
                (p.structure && (p.structure && OBSTACLE_OBJECT_TYPES.indexOf(p.structure.structureType) !== -1)) || 
                p.terrain == 'wall')
            !== -1) { // longhand for 'is there an obstacle there?'
            if (debug) console.log("there is a obsticle");
            return true;
        } else {
            if (debug) console.log("there is no obsticle");
            return false;
        }
    }
}

Creep.prototype.dirIsExit = function(dir, debug = false)  {
    let result = this.dirToPos(dir);
    let x = result.x;
    let y = result.y;
//    console.log(this.name+">"+this.ticksToLive,dir,typeof x, typeof y,x,y,this.pos.roomName);    
    if (x > 0 || x < 49 || y > 0 || y < 49) {
        return false;
    } else {
        return true;
    }
}

Creep.prototype.dirIsSave = function(dir)  {
    let pos = this.dirToPos(dir);
    let melee = _.filter(this.room.getEnemies(), c => pos.getRangeTo(c) <= 2 && c.body.indexOf(ATTACK) > 0);
    if (melee.length > 0) {
        return false;
    } else {
        return true;
    }
    
}
// Game.creeps[].posIsMyRampart(new RoomPosition(4,31,'W85S71'));
Creep.prototype.posIsMyRampart = function(pos)  {
    let stuff = pos.lookFor(LOOK_STRUCTURES);
    if (_.filter(stuff, s => s.structureType == STRUCTURE_RAMPART && s.my == true).length > 0) {
        return true;
    } else {
        return false;
    }
}

Creep.prototype.dirIsMyRampart = function(dir)  {
    return this.posIsMyRampart(this.dirToPos(dir))
}


Creep.prototype.dirIsSwamp = function(dir)  {
    let pos = this.dirToPos(dir);
    let stuff = pos.lookFor(LOOK_TERRAIN);
    if (stuff[0] == "swamp") {
        return true;
    } else {
        return false;
    }
}

Creep.prototype.dirIsRoad = function(dir)  {
    let pos = this.dirToPos(dir);
    let stuff = pos.lookFor(LOOK_STRUCTURES);
    //console.log(JSON.stringify(stuff));
    if (_.filter(stuff, p => p.structureType === STRUCTURE_ROAD).length > 0) {
        return true;
    } else {
        return false;
    }
}
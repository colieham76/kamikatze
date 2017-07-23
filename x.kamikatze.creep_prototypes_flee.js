Creep.prototype.fleeYouFools = function(debug = false, allowRoomLeave = false) {
    if (!this.pos || this.fatigue > 0 || this.getActiveBodyparts(MOVE) == 0) {
        return false;
    }
    if (this.posIsMyRampart(this.pos)) {
        return false;
    }
    var top = Math.max(this.pos.y-2,0);
    var left = Math.max(this.pos.x-2,0);
    var bottom = Math.min(this.pos.y+2,49);
    var right = Math.min(this.pos.x+2,49);
    
    var hostiles = _.filter(this.room.lookForAtArea(LOOK_CREEPS,top,left,bottom,right,true), 
        (c) => (
            !c.creep.my 
            && (
                    c.creep.getActiveBodyparts(ATTACK) > 0 
                 || c.creep.getActiveBodyparts(RANGED_ATTACK) > 0
                )
            && (
                    !c.owner 
                || (
                        Memory.friendly.indexOf(c.owner.username) == -1 
                     && Memory.allied.indexOf(c.owner.username) == -1
                    )
                )
            )
        );
    if (hostiles.length > 0) {
        let go = {
            TOP: 0,
            TOP_RIGHT: 0,
            RIGHT: 0,
            BOTTOM_RIGHT: 0,
            BOTTOM: 0,
            BOTTOM_LEFT: 0,
            LEFT: 0,
            TOP_LEFT: 0,
        }
        for(let key in hostiles) {
            let hostile = hostiles[key].creep;
            let newgo = this.fleeYouFoolsInt(hostile,allowRoomLeave);
            for(let key in _.keys(newgo)) {
                let o = _.keys(newgo)[key];
                go[o] += newgo[o];
            }
        }
        var nearbycreeps = [];
        var nearbystructures = [];
        for(let key in _.keys(go)) {
            key = _.keys(go)[key];
            if (go[key] != 0) {
                let dir = this.dirNameToDirNumber(key);
                if (this.dirIsSwamp(dir,debug)) {
                    go[key] = go[key] - 2;
                }
                if (this.dirIsRoad(dir,debug)) {
                    go[key] = go[key] + 2;
                }
                if (this.dirIsMyRampart(dir,debug)) {
                    go[key] = go[key] + 4;
                }
                if (!this.dirIsSave(dir,debug)) {
                    go[key] = go[key] - 2;
                }
                if (this.dirIsExit(dir,debug)) {
                    go[key] = 0;
                }
                if (this.dirIsBlocked(dir,debug)) {
                    go[key] = -10;
                }
            }
        }
        let goto = false;
        var arr = Object.keys( go ).map(function ( key ) { return go[key]; });
        var max = Math.max.apply( null, arr );

        for(let key in _.keys(go)) {
            key = _.keys(go)[key];
            let pos = this.dirToPos(this.dirNameToDirNumber(key));
            if (debug) this.room.visual.text(go[key],pos.x,pos.y);
            if (go[key] == max) goto = key;
        }
        goto = this.dirNameToDirNumber(goto);
        this.move(goto);
        return true;
    } else {
        return false;
    }
}

Creep.prototype.fleeYouFoolsInt = function(target,allowRoomLeave) {
    let go = {
        TOP: 2,
        TOP_RIGHT: 2,
        RIGHT: 2,
        BOTTOM_RIGHT: 2,
        BOTTOM: 2,
        BOTTOM_LEFT: 2,
        LEFT: 2,
        TOP_LEFT: 2,
    }
    let direction = this.pos.getDirectionTo(target);
    if (direction == TOP) {
        go.TOP = 0;
        go.TOP_RIGHT = 0;
        go.RIGHT= 1,
        go.BOTTOM_RIGHT= 2,
        go.BOTTOM= 2,
        go.BOTTOM_LEFT= 2,
        go.LEFT= 1,
        go.TOP_LEFT = 0;
    }
    if (direction == TOP_RIGHT) {
        go.TOP = 0;
        go.TOP_RIGHT = 0;
        go.RIGHT= 0,
        go.BOTTOM_RIGHT= 1,
        go.BOTTOM= 2,
        go.BOTTOM_LEFT= 2,
        go.LEFT= 2,
        go.TOP_LEFT = 1;
    }
    if (direction == RIGHT) {
        go.TOP = 1;
        go.TOP_RIGHT = 0;
        go.RIGHT= 0,
        go.BOTTOM_RIGHT= 0,
        go.BOTTOM= 1,
        go.BOTTOM_LEFT= 2,
        go.LEFT= 2,
        go.TOP_LEFT = 2;
    }
    if (direction == BOTTOM_RIGHT) {
        go.TOP = 2;
        go.TOP_RIGHT = 1;
        go.RIGHT= 0,
        go.BOTTOM_RIGHT= 0,
        go.BOTTOM= 0,
        go.BOTTOM_LEFT= 1,
        go.LEFT= 2,
        go.TOP_LEFT = 2;
    }
    if (direction == BOTTOM) {
        go.TOP = 2;
        go.TOP_RIGHT = 2;
        go.RIGHT= 1,
        go.BOTTOM_RIGHT= 0,
        go.BOTTOM= 0,
        go.BOTTOM_LEFT= 0,
        go.LEFT= 1,
        go.TOP_LEFT = 2;
    }
    if (direction == BOTTOM_LEFT) {
        go.TOP = 2;
        go.TOP_RIGHT = 2;
        go.RIGHT= 2,
        go.BOTTOM_RIGHT= 1,
        go.BOTTOM= 0,
        go.BOTTOM_LEFT= 0,
        go.LEFT= 0,
        go.TOP_LEFT = 1;
    }
    if (direction == LEFT) {
        go.TOP = 1;
        go.TOP_RIGHT = 2;
        go.RIGHT= 2,
        go.BOTTOM_RIGHT= 2,
        go.BOTTOM= 1,
        go.BOTTOM_LEFT= 0,
        go.LEFT= 0,
        go.TOP_LEFT = 0;
    }
    if (direction == TOP_LEFT) {
        go.TOP = 0;
        go.TOP_RIGHT = 1;
        go.RIGHT= 2,
        go.BOTTOM_RIGHT= 2,
        go.BOTTOM= 2,
        go.BOTTOM_LEFT= 1,
        go.LEFT= 0,
        go.TOP_LEFT = 0;
    }
    if (allowRoomLeave) {
        if (this.pos.x<=1) {
            go.TOP_LEFT = 0;
            go.LEFT = 0;
            go.BOTTOM_LEFT = 0;
        }
        if (this.pos.x>=49) {
            go.TOP_RIGHT = 0;
            go.RIGHT = 0;
            go.BOTTOM_RIGHT = 0;
        }
    
        if (this.pos.y<=1) {
            go.TOP_LEFT = 0;
            go.TOP = 0;
            go.TOP_RIGHT = 0;
        }
        if (this.pos.y>=49) {
            go.BOTTOM_LEFT = 0;
            go.BOTTOM = 0;
            go.BOTTOM_RIGHT = 0;
        }
    }
    return go;
}
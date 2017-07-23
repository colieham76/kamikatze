"use strict";
Creep.prototype.HealSomebody = function() {
    let result = this.HealMeOrClose();
    if (!result) {
        result = this.HealACreepRanged();
    }
    return result;
}

Creep.prototype.HealACreepRanged = function() {
    var toHeal = false;
    var toHealCreep = false;
    var targets = this.pos.findInRange(FIND_CREEPS,3, {
        filter: (c) => 
         (c.id != this.id && c.hits < c.hitsMax) && (c.my || c.owner && (Memory.friendly.indexOf(c.owner.username) !== -1 || Memory.allied.indexOf(c.owner.username) !== -1))
     });
    for(let key in targets) {
        var target = targets[key];
        var hp = target.hits / target.hitsMax;
        if(!toHeal || toHeal > hp) {
            toHealCreep = target;
            toHeal = hp;
        }
    }
    if (toHealCreep != false) {
        return this.rangedHeal(toHealCreep);
    }
    return false;
}

Creep.prototype.Medic = function(debug = false) {
    var toHeal = false;
    var toHealCreep = false;
    // ,{filter: (c) => !c.owner || Memory.friendly.indexOf(c.owner.username) == -1}
    let healbodyparts = BODYPARTS_ALL;
    if (this.room.areThereEnemies()) {
        // focus on healing military untis only!
        if (debug) console.log('Medic > '+this.room.name+' > Military only');
        healbodyparts = [ATTACK,HEAL,RANGED_ATTACK,TOUGH];
    }
    var targets = this.pos.findInRange(FIND_CREEPS, 1, {filter: (f) => 
        f.hits / f.hitsMax < 1 
        && (f.my || f.owner && Game.my.managers.strategy.isFriendly(f.owner.username))
        && _.filter(f.body, b => healbodyparts.indexOf(b.type) !== -1).length > 0
    });
    for(let key in targets) {
        var target = targets[key];
        var hp = target.hits / target.hitsMax;
        if (hp < 1) {
            if(!toHeal || toHeal > hp) {
                toHealCreep = target;
                toHeal = hp;
            }
        }
    }
    if (!toHealCreep) {
        var targets = this.pos.findInRange(FIND_CREEPS, 3, {filter: (f) => 
            f.hits / f.hitsMax < 1 
            && (f.my || f.owner && Game.my.managers.strategy.isFriendly(f.owner.username))
            && _.filter(f.body, b => healbodyparts.indexOf(b.type) !== -1).length > 0
        });
        for(let key in targets) {
            var target = targets[key];
            var hp = target.hits / target.hitsMax;
            if (hp < 1) {
                if(!toHeal || toHeal > hp) {
                    toHealCreep = target;
                    toHeal = hp;
                }
            }
        }
    }

    if (!toHealCreep) {
        var all = this.room.find(FIND_CREEPS, {filter: (f) => 
            f.hits / f.hitsMax < 1 
            && (f.my || f.owner && Game.my.managers.strategy.isFriendly(f.owner.username))
            && _.filter(f.body, b => healbodyparts.indexOf(b.type) !== -1).length > 0
        });
        // first heal healers, then heal fighters, then heal anybody
        let targets = _.filter(all, f => (f.getActiveBodyparts(HEAL)) > 0);
        if (targets.length == 0) {
            targets = _.filter(all, f => (f.getActiveBodyparts(RANGED_ATTACK) > 0 || f.getActiveBodyparts(ATTACK) > 0));
            if (targets.length == 0) {
                targets = all;
            }
        }
        for(let key in targets) {
            var target = targets[key];
            var hp = target.hits / target.hitsMax;
            if (hp < 1) {
                if(!toHeal || toHeal > hp) {
                    toHealCreep = target;
                    toHeal = hp;
                }
            }
        }
    }
    if (debug) console.log(this.name + " " + toHealCreep + " " + toHeal);
    if (toHealCreep != false) {
        if (this.pos.inRangeTo(toHealCreep,1)) {
            if (debug) console.log(this.name + " i heal "+toHealCreep);
            this.heal(toHealCreep);
        } else {
            if (this.pos.inRangeTo(toHealCreep,3)) {
                if (debug) console.log(this.name + " i range heal "+toHealCreep);
                this.rangedHeal(toHealCreep);
            } else {
                if (this.hits!=this.hitsMax) this.heal(this);
            }
        }
        if (toHealCreep.pos === this.pos) {
            if (this.isOnExit()) {
                this.movePredefined(new RoomPosition(25,25,this.room.name));
            }
        } else {
            if (!toHealCreep.isOnExit()) {
                this.movePredefined(toHealCreep,{maxRooms: 1});
            }
        }
        this.room.visual.drawCross(toHealCreep.pos.x,toHealCreep.pos.y, {color: '#12ba00', width:0.1, opacity: 1});
        return toHealCreep;
    } else {
        return false;
    }
}

Creep.prototype.HealMeOrClose = function() {
    if (this.hits < this.hitsMax) {
        return(this.heal(this));
    } else {
        var targets = this.pos.findInRange(FIND_CREEPS, 1, {
            filter: (c) => 
             (c.hits < c.hitsMax) && (c.my || c.owner && Game.my.managers.strategy.isFriendly(c.owner.username))
         });
        if (targets.length > 0) {
            return this.heal(targets[0]);
        }
    }
    return false;
}
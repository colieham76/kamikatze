/**
 * Set the unit to idle-mode until recall tick
 *
 * @type {int}
 */
Object.defineProperty(Creep.prototype, "idle", {
    get: function () {
        if (this.memory.idle === undefined) return 0;
        if(this.memory.idle <= Game.time) {
            this.idle = undefined;
            return 0;
        }
        return this.memory.idle;
    },
    set: function (val) {
        if (!val && this.memory.idle) {
            delete(this.memory.idle);
        }
        else {
            this.memory.idle = val;
        }
    }
});

/**
 * Set the unit to idle-mode for ticks given
 *
 * @type {int}
 */
Creep.prototype.idleFor = function(ticks = 0){
    if(ticks > 0) {
//        console.log("Suspend",this,"for",ticks,"in",this.room.name);
        this.idle = Game.time + ticks;
    }
    else {
        this.idle = undefined;
    }
};

/* Usage: 
     In the loop that executes all creeps, add something like: 
     if(creep.idle) continue;

     And if you want to idle something, for example between mineral mine actions you just do:
     creep.idleFor(6);
*/
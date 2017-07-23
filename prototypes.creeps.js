"use strict";
Creep.prototype.repairNearby = function(debug = false) {
    var memrepair = [];
    if  (this.carry[RESOURCE_ENERGY] > 0 && this.getActiveBodyparts(WORK) > 0) {
        memrepair = _.filter(this.room.memory.toBeRepaired, (r) => (
               r.x <= Math.min(this.pos.x + 3,48) 
            && r.y <= Math.min(this.pos.y + 3,48) 
            && r.x >= Math.max(this.pos.x - 3,1) 
            && r.y >= Math.max(this.pos.y - 3,1)));
        if (memrepair.length > 0) {
            // TODO repair the one with the least amount of HP in memrepairlist
            let repair = Game.getObjectById(memrepair[0].id)
            if (repair) {
    //            console.log(this.name+" repairs "+repair.structureType+" with targethealth: "+memrepair[0].targethealth);
                if (repair.hits > memrepair[0].targethealth) {
                    this.room.memory.toBeRepaired.splice(this.room.memory.toBeRepaired.indexOf(memrepair[0]),1);
                } else {
                    this.repair(repair);
                }
            } else {
                this.room.memory.toBeRepaired.splice(this.room.memory.toBeRepaired.indexOf(memrepair[0]),1);
            }
        } 
    } 
}

Creep.prototype.buildNearby = function(debug = false) {
    var membuild = [];
    if  (this.carry[RESOURCE_ENERGY] > 0) {
        membuild = _.filter(this.room.getConstructionSites(), (r) => (
               r.pos.x <= Math.min(this.pos.x + 3,48) 
            && r.pos.y <= Math.min(this.pos.y + 3,48) 
            && r.pos.x >= Math.max(this.pos.x - 3,1) 
            && r.pos.y >= Math.max(this.pos.y - 3,1)
            && r.structureType != STRUCTURE_RAMPART
        ));
        if (membuild.length > 0) {
            return this.build(membuild[0]);
        } 
    } 
    return false;
}

Creep.prototype.dismantleNearby = function(debug = false) {
    if (this.getActiveBodyparts(WORK) >= 4 && _.sum(this.carry) < this.carryCapacity && !this.room.isMineClaimed()) {
        let memdismantle = this.room.find(FIND_STRUCTURES, {filter: (r) =>  
        (
               r.pos.x <= Math.min(this.pos.x + 1,48) 
            && r.pos.y <= Math.min(this.pos.y + 1,48) 
            && r.pos.x >= Math.max(this.pos.x - 1,1) 
            && r.pos.y >= Math.max(this.pos.y - 1,1)
            && [STRUCTURE_WALL].indexOf(r.structureType) !== -1
        )});
        if (memdismantle.length > 0) {
            return this.dismantle(memdismantle[0]);
        } 
    } 
    return false;
}

Creep.prototype.pickupEnergyNearby = function(debug = false) {
    var mempickup = [];
    if  (_.sum(this.carry) < this.carryCapacity) {
        mempickup = _.filter(this.room.memory.toBePickedUp, (r) => (
               r.x <= Math.min(this.pos.x + 1,48) 
            && r.y <= Math.min(this.pos.y + 1,48) 
            && r.x >= Math.max(this.pos.x - 1,1) 
            && r.y >= Math.max(this.pos.y - 1,1)));
    } 
    if (mempickup.length > 0) {
        let target = new RoomPosition(mempickup[0].x,mempickup[0].y,this.pos.roomName);
        let stuff = target.lookFor(LOOK_RESOURCES)		// collection of things at our potential target
        this.pickup(stuff[0]);
        this.room.memory.toBePickedUp.splice(this.room.memory.toBePickedUp.indexOf(mempickup[0]),1);
        return true;
    } 
    return false;
}
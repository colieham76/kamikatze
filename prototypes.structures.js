"use strict";
OwnedStructure.prototype.run = function() {

}

Object.defineProperty(OwnedStructure.prototype, "memory", {
    get: function () {      
		if(!Memory.structures[this.id])
			Memory.structures[this.id] = {};
		return Memory.structures[this.id];
    },
	set: function(v) {
		return _.set(Memory, 'structures.' + this.id, v);
	},
	configurable: true,
	enumerable: false
});

StructureController.prototype.isEnemyReserved = function() {
    return (this.reservation && this.reservation.username != "KamiKatze");
}

Structure.prototype.getStoreHighestMineral = function() {
    if (!this.store) return false;
    let returnvalue = false;
    let returnamount = false;
    for(let res in this.store) {
        if (res === RESOURCE_ENERGY) continue;
        if (!returnvalue || returnamount < this.store[res]) {
            returnvalue = res;
            returnamount = this.store[res];
        }
    }
    return returnvalue;
}

Structure.prototype.addToTransportertargets = function() {
    this.room.memory.transportertargets = this.room.memory.transportertargets || [];
    if (this.room.memory.transportertargets.indexOf(this.id) === -1) {
        this.room.memory.transportertargets.push(this.id);
        delete this.room.memory.transporterpath;
    }
}

StructureTower.prototype.run = function() {
    this.addToTransportertargets();
}

StructureLab.prototype.run = function() {
    this.room.visual.text(this.mineralType,this.pos.x,this.pos.y,{font: "bold 0.7", opacity: 0.7, color: 'black'});
}

StructureExtension.prototype.run = function() {
    this.addToTransportertargets();
}

StructureSpawn.prototype.run = function() {
    this.addToTransportertargets();
    if (Game.my.managers.strategy.getCoreRooms().indexOf(this.room.name) === -1) {
        delete Memory.getCoreRooms;
    }
}

StructurePowerSpawn.prototype.run = function() {
    this.addToTransportertargets();
    if (this.power >= 1 && this.energy >= 50) {
        this.processPower();
    }  
}

StructureTower.prototype.run = function() {
    this.addToTransportertargets();
}

StructureRampart.prototype.run = function() {
    if (this.hits < 1000) {
        Game.my.managers.infrastructure.findrepairsforroom(this.room.name);
    }
}

StructureTerminal.prototype.run = function() {
    this.addToTransportertargets();
}

StructureLink.prototype.run = function() {
    if (this.room.memory.links) {
        let isuseful = false;
        // is this a border link?
        if (this.room.memory.links.borderlinks && this.room.memory.links.borderlinks.indexOf(this.id) !== -1) {
            isuseful = true;
        }
        // is this a storage link?
        if (this.room.memory.links.storagelink && this.room.memory.links.storagelink == this.id) {
            isuseful = true;
        }
        // is this a controller link?
        if (this.room.memory.links.controllerlink && this.room.memory.links.controllerlink == this.id) {
            isuseful = true;
        }
        if (!isuseful) {
            console.log('deleting links of '+this.room.name);
            delete this.room.memory.links;
        }
        if (this.room.memory.links && this.room.memory.links.storagelink && this.room.memory.links.storagelink == this.id) {
            this.addToTransportertargets();
        }
    }
}
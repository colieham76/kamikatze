StructureTerminal.prototype.registerNeededMineral = function(mineral) {
    this.memory.registerNeededMineral = this.memory.registerNeededMineral || [];
    if (this.memory.registerNeededMineral.indexOf(mineral) === -1) {
        this.memory.registerNeededMineral.push(mineral);
    }
}

StructureTerminal.prototype.requestAvailableMineralAmount = function(mineral) {
    let needed = 0;
    if (this.store[mineral]) {
        needed = _.sum(_.filter(Game.market.orders, o => o.type == ORDER_SELL && o.resourceType == mineral && o.roomName == this.room.name),'remainingAmount');
        this.memory.registerNeededMineral = this.memory.registerNeededMineral || [];
        if (this.memory.registerNeededMineral.indexOf(mineral) !== -1) {
            needed += 10000;
        } 
    }
    return Math.max(0,this.store[mineral] - needed);
}
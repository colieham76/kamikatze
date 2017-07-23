StructureObserver.prototype.run = function() {
    // give me all rooms from realwhitelist, which i don't see
    // sort them by room.memory.exploreHostilesTick asc
    // observe the xth room where x is the running number of this observer (only needed for multiple observers.)
    if (Game.cpu.bucket < 2400) {
        return;
    }
    if (typeof Game.my.managers.observer.observerooms == "undefined") {
        Game.my.managers.observer.observerooms = [];
        for (let room in Memory.realwhitelistrooms) {
            let index = _.keys(Game.rooms).indexOf(Memory.realwhitelistrooms[room]);
            if (index == -1) {
                Memory.rooms[Memory.realwhitelistrooms[room]] = Memory.rooms[Memory.realwhitelistrooms[room]] || {};
                Memory.rooms[Memory.realwhitelistrooms[room]].exploreHostilesTick = Memory.rooms[Memory.realwhitelistrooms[room]].exploreHostilesTick || 0;
                Game.my.managers.observer.observerooms.push({room: Memory.realwhitelistrooms[room], time: Memory.rooms[Memory.realwhitelistrooms[room]].exploreHostilesTick});
            }
        }
        Game.my.managers.observer.observerooms = _.sortBy(Game.my.managers.observer.observerooms,'time')
    }

    for(let room in Game.my.managers.observer.observerooms) {
        if (Game.map.getRoomLinearDistance(this.pos.roomName,Game.my.managers.observer.observerooms[room].room) <= 10) {
            let result = this.observeRoom(Game.my.managers.observer.observerooms[room].room);
            if (result === OK) {
                Game.my.managers.observer.observerooms.splice(room,1);
                break;
            }
        }
    }
}
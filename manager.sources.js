"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');

var sourcesManager = {
    // JSON.stringify(Game.my.managers.sources.giveMeMyPath('5873bbd511e3e4361b4d691d','W85S71'))
    giveMeMyPath: function(sourceId, debug = false) {
//        console.log(typeof this.sourcePaths);
        if (!Game.my.managers.memory.sourcePaths[sourceId]) {
            // create path
            let source = Game.getObjectById(sourceId);
            if (!source) return false;
            console.log('sourcepaths > creating new path for '+source+' at '+source.pos);
            if (!source) { return false; }
            let roomDeliverTo = Game.my.managers.cachedSearch.sourceDeliveresToRoom(sourceId);
            let startPos = Game.rooms[roomDeliverTo].storage.pos;
            let targetPos = false;
            let containers = source.pos.findInRange(FIND_STRUCTURES,1,{filter: s => s.structureType == STRUCTURE_CONTAINER})
            if (containers.length > 0) {
                targetPos = {pos: containers[0].pos, range:1}
            } else {
                targetPos = {pos: source.pos, range:2};
            }
            if (debug) {
                console.log('sourcepaths > start '+startPos);
                console.log('sourcepaths > target '+JSON.stringify(targetPos));
            }
            let paths = PathFinder.search(startPos,targetPos,{
              // We need to set the defaults costs higher so that we
              // can set the road cost lower in `roomCallback`
              plainCost: 2,
              swampCost: 10,
              maxOps: 4000,
              roomCallback: function(roomName) {
                let room = Game.rooms[roomName];
                // In this example `room` will always exist, but since PathFinder 
                // supports searches which span multiple rooms you should be careful!
                if (!room) return;
                let costs = new PathFinder.CostMatrix;
                room.find(FIND_STRUCTURES).forEach(function(s) {
                  if (s.structureType === STRUCTURE_ROAD) {
                    // Favor roads over plain tiles
                    costs.set(s.pos.x, s.pos.y, 1);
                  } else if (OBSTACLE_OBJECT_TYPES.indexOf(s.structureType) !== -1 || s.structureType == STRUCTURE_CONTAINER) {
                    costs.set(s.pos.x, s.pos.y, 255);
                  }
                });
                return costs;
              }
            });
            if (paths.incomplete) {
                console.log('!!!! INCOMPLETE SOURCE PATH: '+startPos+' (storage) to '+targetPos.pos);
                Game.notify('!!!! INCOMPLETE SOURCE PATH: '+startPos+' (storage) to '+targetPos.pos);
            }
            paths.path.unshift(startPos);
            Game.my.managers.memory.sourcePaths[sourceId] = paths.path;
        }
//        console.log(JSON.stringify(this.sourcePaths[sourceId]));
        return Game.my.managers.memory.sourcePaths[sourceId];
    },
    // Game.my.managers.sources.recalcMyPath('5873bbba11e3e4361b4d65d2');
    recalcMyPath: function(sourceId) {
        delete Game.my.managers.memory.sourcePaths[sourceId];
        Memory.memoryResetTime = Game.time;
        this.giveMeMyPath(sourceId,true);
        console.log(Game.my.managers.memory.sourcePaths[sourceId]);
    },
    // Game.my.managers.sources.recalcAllPaths();
    recalcAllPaths: function() {
        delete Game.my.managers.memory.sourcePaths;
    }
}
profiler.registerObject(sourcesManager,'sourcesManager');
module.exports = sourcesManager;
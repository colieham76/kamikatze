"use strict";
const profiler = require('screeps-profiler');
var cachedSearch = require('cachedSearch');
var roleTransporter = {
    /** @param {Creep} creep **/
    validatetarget: function(creep, target) {
        if (!target) {
            target = false;
        } else {
            if (target.energy && target.energy == target.energyCapacity) {
                delete creep.memory.target;
                target = false;
            } else if (target.structureType == STRUCTURE_LINK 
            && (
                !creep.room.memory.links
                 || creep.room.memory.links.borderlinks.length > 0 
                 && (
                    !creep.room.memory.links.controllerlink || Game.getObjectById(creep.room.memory.links.controllerlink).energy >= 750
                 || creep.room.memory.links.storagelink    && Game.getObjectById(creep.room.memory.links.storagelink).cooldown != 0
                 )
                )
            ) {
                delete creep.memory.target;
                target = false;
            } else if (target.structureType == STRUCTURE_TOWER && target.energy >= target.energyCapacity * 0.75) {
                delete creep.memory.target;
                target = false;
            } else if (target.structureType == STRUCTURE_CONTAINER && _.sum(target.store) >= 0 /* target.storeCapacity */) {
                delete creep.memory.target;
                target = false;
            } else if (target.structureType == STRUCTURE_TERMINAL && (creep.room.storage.store[RESOURCE_ENERGY] < 100000 || target.store[RESOURCE_ENERGY] > 90000)) {
                delete creep.memory.target;
                target = false;
            }
        }
        return target;
    },
    gettransportertargets: function(creep) {
        let targets = creep.room.find(FIND_STRUCTURES, {
            filter: function(structure) {
                return (structure.structureType == STRUCTURE_TOWER 
                || structure.structureType == STRUCTURE_EXTENSION
                || structure.structureType == STRUCTURE_SPAWN)
            }
        });
        if (room.memory.controllercontainer) {
            targets.push(creep.room.find(FIND_STRUCTURES, {
                filter: function(structure) {
                    return structure.id = room.memory.controllercontainer
                }
            }));
        }
        if (creep.room.memory.links.storagelink && creep.room.memory.links.controllerlink) {
            targets.push(creep.room.find(FIND_STRUCTURES, {
                filter: function(structure) {
                    return structure.id = creep.room.memory.links.storagelink
                }
            }));
        }
        let ids = [];
        for (let key in targets) {
            ids = ids.concat(targets[key].id);
        }
        creep.room.memory.transportertargets = ids;
    },
    gettarget: function(creep,debug = false) {
        let target = false;
        if (creep.memory.target) {
            target = this.validatetarget(creep,Game.getObjectById(creep.memory.target));
        }
        if (!target) {
            if (!creep.room.memory.transportertargetsCurrent || creep.room.memory.transportertargetsCurrent.length == 0) {
                if (!creep.room.memory.transportertargets) {
                    this.gettransportertargets(creep);
                }
                creep.room.memory.transportertargetsCurrent = _.clone(creep.room.memory.transportertargets);
            }
            let targetobjs = [];
            for (let key in creep.room.memory.transportertargetsCurrent) {
                let tmp = this.validatetarget(creep,Game.getObjectById(creep.room.memory.transportertargetsCurrent[key]));
                if (!tmp) {
                    creep.room.memory.transportertargetsCurrent.splice(key,1);
                } else {
                    targetobjs.push(tmp);
                } 
            }
            if (targetobjs.length == 0) {
                target = false;
            } else {
//                try {
                    target = creep.pos.findClosestByRange(targetobjs);
                    if(target) {
                        creep.memory.target = target.id;
                        creep.room.memory.transportertargetsCurrent.splice(creep.room.memory.transportertargetsCurrent.indexOf(target.id),1);
                    }
//                } catch(err) {

//                }
            }
        }
        return target;
    },
    run: function(creep) {
        var debug = false;
//        if (creep.room.name == "W88S61") debug = true;
        creep.room.memory.links = creep.room.memory.links || {};
        //if (creep.name == "Jasmine") debug = true;
        //if (creep.pos.roomName == "E76S21") debug = true;
        if (creep.ticksToLive < 50 && creep.room.storage) {
            if (creep.pos.inRangeTo(creep.room.storage,1)) {
                creep.transfer(creep.room.storage,RESOURCE_ENERGY);
                creep.suicide();
            } else {
                creep.movePredefined(creep.room.storage,{range:1});
            }
        } else {
    	    if(creep.memory.building && creep.carry.energy == 0) {
                if (debug) console.log(creep.name + " switches to no energy mode");
                creep.memory.building = false;
    	    }
    	    if(!creep.memory.building && _.sum(creep.carry) > 0) {
                if (debug) console.log(creep.name + " switches to energy mode");
    	        creep.memory.building = true;
    	        delete creep.memory.target;
    	    }
            if(creep.memory.building) {
                if (_.sum(creep.carry) - creep.carry[RESOURCE_ENERGY] > 0) {
                    if (debug) console.log(creep.name + " has minerals");
                    if(creep.room.terminal) {
                        if (creep.pos.inRangeTo(creep.room.terminal,1)) {
                            let key = false;
                            for(key in creep.carry) {
                                if (key != RESOURCE_ENERGY)
                                    break;
                            }
                            var result = creep.transfer(creep.room.terminal,key);
                            //this.getEnergy(creep,debug);
                        } else {
                            creep.movePredefined(creep.room.terminal,{range:1});
                        }
                    }
                } else {
                    if (debug) console.log(creep.name + " has energy");
                    // get my current target
                    let target = this.gettarget(creep,debug);
                    if (debug) console.log("target: "+JSON.stringify(target));
                    if (!target) {
// everything is filled 
//                        console.log("WTF fillup!"+creep.room.name);

                        if (_.sum(creep.room.storage.store) < 910000) {
                            if (creep.transfer(creep.room.storage,RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                                creep.movePredefined(creep.room.storage,{range:1});
                            }
                        } else {
                            if (creep.room.terminal) {
                                if (creep.transfer(creep.room.terminal,RESOURCE_ENERGY) == ERR_NOT_IN_RANGE) {
                                    creep.movePredefined(creep.room.terminal,{range:1});
                                }
                            }
                        }
                    // TODO wait for 5 ticks
                        
                    } else {
                        if (debug) console.log(creep.name + " has target: "+target.pos);
                        // if target, fillup target
                        if (creep.pos.inRangeTo(target,1)) {
                            creep.transfer(target,RESOURCE_ENERGY);
                            // if target full, remove target
                            target = false;
                        }
                        // if no target, get target
                        if (!target) {
                            target = this.gettarget(creep);
                        }
                        if (!target) {
                            console.log("WTF moveto!");
                        } else {
                            // if target, move to target
                            let result = creep.movePredefined(target,{range:1});
                            if (debug) console.log(creep.name + " moves to target with result: "+result);
                        }
                    }
                }
            } else {
                this.getEnergy(creep,debug);
    	    }
        }
//        creep.say("trans:" + _.sum(creep.carry));
	},
	getEnergy: function(creep,debug = false) {
        if (debug) console.log(creep.name + " has no energy");
        if (creep.room.storage) {
            if (creep.room.terminal && _.sum(creep.room.terminal.store) < 190000 && _.sum(creep.room.storage.store) - creep.room.storage.store[RESOURCE_ENERGY] > 0) {
                let result = creep.withdraw(creep.room.storage,creep.room.storage.getStoreHighestMineral());
//                console.log(creep.room.name+" > TRANSPORTER WANTS TO PICKUP MINERALS - result: "+result);
                if (result == ERR_NOT_IN_RANGE) {
                    creep.movePredefined(creep.room.storage,{range:1});
                }
                return;
            }
            if (!creep.memory.pickuptarget) {
                let takeenergyfromstorage = true;
                let takeaway = creep.pos.findInRange(FIND_MY_CREEPS,1,{filter: c => c.memory.role == 'harvesterHauler' && c.carry[RESOURCE_ENERGY] > 0});
                if (debug) console.log(creep.name+' > '+takeaway.length);
                if (takeaway.length > 0) {
                    takeaway[0].transfer(creep,RESOURCE_ENERGY);
                    takeenergyfromstorage = false;
                }
                if (takeenergyfromstorage && creep.room.memory.links.storagelink) {
                    let storagelink = Game.getObjectById(creep.room.memory.links.storagelink);
                    let controllerlink = Game.getObjectById(creep.room.memory.links.controllerlink);
                    if (storagelink.energy > 0 && (!controllerlink || controllerlink.energy > 750)) {
                        if (debug) console.log(creep.name+' > storage link energy amount: '+storagelink.energy);
                        takeenergyfromstorage = false;
                        creep.memory.pickuptarget = storagelink.id;
                    } 
                }
                if (debug) console.log(creep.name + " checks storagelink "+creep.memory.pickuptarget);
                if (takeenergyfromstorage && 
                    (
                        creep.room.storage.structureType == STRUCTURE_STORAGE  && creep.room.storage.store[RESOURCE_ENERGY] < 100000
                     || creep.room.storage.structureType == STRUCTURE_CONTAINER&& creep.room.storage.store[RESOURCE_ENERGY] < 1000
                    )
                 ) {
                    let container = creep.pos.findClosestByPath(FIND_STRUCTURES, {filter: (s) => s.structureType == STRUCTURE_CONTAINER && (s.store[RESOURCE_ENERGY] > creep.carryCapacity || (s.id == s.room.memory.storagecontainer && s.store[RESOURCE_ENERGY] > 0)) && s.id != s.room.memory.controllercontainer && s.id != s.room.storage.id})
                    if (container) {
                        if (creep.pos.inRangeTo(container,10)) {
                            takeenergyfromstorage = false;
                            creep.memory.pickuptarget = container.id;
                        }
                    } 
                }
                if (debug) console.log(creep.name + " checks containers "+creep.memory.pickuptarget);
                if (takeenergyfromstorage 
                 && creep.room.terminal 
                 && (
                        (creep.room.terminal.store[RESOURCE_ENERGY] > 30000 && creep.room.storage.store[RESOURCE_ENERGY] < 100000)
                     || (creep.room.terminal.store[RESOURCE_ENERGY] > 90000 && _.sum(creep.room.storage.store) < 910000)
                )){
                    takeenergyfromstorage = false;
                    creep.memory.pickuptarget = creep.room.terminal.id;
                }
                if (debug) console.log(creep.name + " checks terminal "+creep.memory.pickuptarget);
                if (takeenergyfromstorage && 
                    (
                        creep.room.storage.structureType == STRUCTURE_STORAGE  && creep.room.storage.store[RESOURCE_ENERGY] < 100000
                     || creep.room.storage.structureType == STRUCTURE_CONTAINER&& creep.room.storage.store[RESOURCE_ENERGY] < 1000
                    )
                ) {
                    let energy = creep.pos.findClosestByPath(FIND_DROPPED_RESOURCES,{filter: (e) => e.resourceType == RESOURCE_ENERGY && e.amount >= creep.carryCapacity})
                    if (energy) {
                        takeenergyfromstorage = false;
                        creep.memory.pickuptarget = energy.id;
                    }
                }
                if (debug) console.log(creep.name + " checks dropped energy "+creep.memory.pickuptarget);
                if (takeenergyfromstorage) {
                    creep.memory.pickuptarget = creep.room.storage.id;
                }
                if (debug) console.log(creep.name + " checks storage "+creep.memory.pickuptarget);
            }
            if (creep.memory.pickuptarget) {
                if (debug) console.log(creep.name + " goes to "+creep.memory.pickuptarget);
                let pickuptarget = Game.getObjectById(creep.memory.pickuptarget);
                if (pickuptarget) {
                    if (creep.pos.inRangeTo(pickuptarget,1)) {
                        if(pickuptarget instanceof Structure) {
                            creep.withdraw(pickuptarget,RESOURCE_ENERGY);
                        } else if(pickuptarget instanceof Creep) {
                            pickuptarget.transfer(creep,RESOURCE_ENERGY);
                        } else {
                            creep.pickup(pickuptarget);
                        }
                        delete creep.memory.pickuptarget;
                    } else {
                        if (pickuptarget.structureType == STRUCTURE_LINK && pickuptarget.energy == 0) {
                            delete creep.memory.pickuptarget;
                        } else {
                            if (debug) console.log(creep.name + ': go to '+pickuptarget.structureType+' '+pickuptarget.pos);
                            let result = creep.movePredefined(pickuptarget,{range:1},debug);
                            if (debug) console.log(creep.name + ': go to result: '+result);
                        }
                    }
                } else {
                    delete creep.memory.pickuptarget;
                }
            }
        } else {
            if (!creep.memory.targetSpawn) {
                var targetSpawn = false;
                var targetLength = 0;
                for(var name in Game.spawns) {
                    var paths = PathFinder.search(creep.pos,{pos: Game.spawns[name].pos, range:1},    {
                          // We need to set the defaults costs higher so that we
                          // can set the road cost lower in `roomCallback`
                          plainCost: 2,
                          swampCost: 10,
                          roomCallback: function(roomName) {
                            let room = Game.rooms[roomName];
                            // In this example `room` will always exist, but since PathFinder 
                            // supports searches which span multiple rooms you should be careful!
                            if (!room) return;
                            let costs = new PathFinder.CostMatrix;
                            room.find(FIND_STRUCTURES).forEach(function(structure) {
                              if (structure.structureType === STRUCTURE_ROAD) {
                                // Favor roads over plain tiles
                                costs.set(structure.pos.x, structure.pos.y, 1);
                              }
                            });
                            return costs;
                          },
                        });
                    console.log(creep.name + " considers going to " + name + " in distance " + paths.path.length);
                    if (!targetSpawn || paths.path.length < targetLength) {
                        targetSpawn = name;
                        targetLength = paths.path.length;
                    }
                }
                creep.movePredefined(Game.spawns[targetSpawn],{range:1});
                console.log(creep.name + " moves to " + targetSpawn);
            } else {
                var targetSpawn = creep.memory.targetSpawn;
                creep.movePredefined(Game.spawns[targetSpawn],{range:1});
            }
        }
	}
};
profiler.registerObject(roleTransporter,'roleTransporter');
module.exports = roleTransporter;
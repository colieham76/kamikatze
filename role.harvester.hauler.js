"use strict";
const profiler = require('screeps-profiler');
var cachedSearch = require('cachedSearch');
var roleHarvesterHauler = {
    sanityCheckForOffset: function(creep,path,step,offset) {
        return Math.min(path.length-1,Math.max(0,Number(step)+offset));
    },
    moveByPath: function(creep,path,reverse,debug) {
        let step = path.findIndex(x => x.x == creep.pos.x && x.y == creep.pos.y && x.roomName == creep.pos.roomName);
        if (debug) console.log(creep.name + ' > my pos is: '+creep.pos);
        // bin ich auf dem Pfad
        // aka ist eine der path Pos === meine Pos
        if (step != -1) {
            // wenn ja, folge dem Pfad in richtung Source
            // mama, bin ich schon daaaa?
            if (debug) console.log(creep.name + ' > i am on path: '+step);
            if (step == creep.memory.laststep && step != path.length -1) {
                creep.say(step+' doh');
                if (debug) console.log(creep.name + ' > irgendwas ging schief - step == laststep: '+creep.memory.laststep);
                let offset = false;
                if (reverse) offset = -2;
                else         offset = +2;
                let moveresult = false;
                let dohstep = this.sanityCheckForOffset(creep,path,step,offset);
                if (dohstep == 0) {
                    moveresult = creep.movePredefined(creep.room.storage,{range:1});
//                } else if (dohstep == path.length -1) {
//                    moveresult = creep.movePredefined(Game.getObjectById(creep.memory.container),{range:1});
                } else {
                    let targetstep = path[dohstep];
                    moveresult = creep.movePredefined(new RoomPosition(targetstep.x,targetstep.y,targetstep.roomName));
                }
            } else {
                if (reverse && step > 0 || !reverse && step <= path.length-1) {
                    // scheinbar noch nicht...
                    let offset = false;
                    if (reverse) offset = -1;
                    else         offset = +1;
                    if (debug) console.log(creep.name + ' > my step is: '+step+' my next step should be: '+this.sanityCheckForOffset(creep,path,step,offset));
                    if (debug) console.log(creep.name + ' > trying to get direction to: '+JSON.stringify(path[this.sanityCheckForOffset(creep,path,step,offset)]));
                    let dir = creep.pos.getDirectionTo(path[this.sanityCheckForOffset(creep,path,step,offset)].x,path[this.sanityCheckForOffset(creep,path,step,offset)].y);
                    if (debug) console.log(creep.name + ' > going to direction: '+dir);
                    let result = creep.move(dir);
                    if (debug) console.log(creep.name + ' > move result:  '+result);
                    creep.memory.laststep = step;
                }
            }
        } else {
            // wenn nein, dann suche die näheste (byRange) pos im pfad, und movePredefined da hin.
            let offset = false;
            if (reverse) offset = -2;
            else         offset = +2;
            let targetstep = path[this.sanityCheckForOffset(creep,path,creep.memory.laststep,offset)];
            if (debug) console.log(creep.name + ' > target to get to the path: '+JSON.stringify(targetstep));
            let moveresult = creep.movePredefined(new RoomPosition(targetstep.x,targetstep.y,targetstep.roomName));
            if (!moveresult) {
                if (reverse)    creep.memory.laststep--;
                else            creep.memory.laststep++;
            }
        }

    },
    run: function(creep) {
        delete creep.memory.debug;
        var debug = creep.memory.debug || false;
        creep.memory.laststep = creep.memory.laststep || 0;
        if (Game.rooms[creep.memory.sourcePos.roomName]) {
            Game.rooms[creep.memory.sourcePos.roomName].visual.drawCross(creep.memory.sourcePos.x,creep.memory.sourcePos.y, {color: '#12ba00', width:0.1, opacity: 1});
        }
        if (creep.carryCapacity == 0) {
            creep.moveTo(Game.spawns[cachedSearch.nearbySpawn(creep.room.name,creep.pos.x,creep.pos.y)]);
            return;
        }
        if (creep.fatigue == 0) {
            let sourceRoom = creep.memory.sourcePos.roomName;
            let path = Game.my.managers.sources.giveMeMyPath(creep.memory.source);
            if (!path) {
                let source = Game.getObjectById(creep.memory.source);
                console.log(creep.name+' in '+creep.room.name+': invalid path to source '+source);
                creep.movePredefined(creep.memory.sourcePos);
                return;
            }
            if (_.sum(creep.carry) == 0 && creep.ticksToLive < path.length) {
                creep.suicide();
            }

            if (debug) console.log(creep.name + ' > my path is long: '+path.length);
    
            if (_.sum(creep.carry) > 0) {
                // going home
                if (debug) console.log(creep.name + ' > going to storage');
                if (creep.room.memory.links && creep.room.memory.links.borderlinks) {
                    for(let key in creep.room.memory.links.borderlinks) {
                        let borderlink = Game.getObjectById(creep.room.memory.links.borderlinks[key]);
                        if (borderlink && creep.pos.inRangeTo(borderlink,1)) {
                            creep.transfer(borderlink,RESOURCE_ENERGY);
                        } 
                    }
                }
                let res = _.filter(_.keys(creep.carry), c => creep.carry[c] > 0)[0];
                let transfer = creep.transfer(creep.room.storage,res);
                if (transfer == ERR_FULL) {
                    transfer = creep.drop(res);
                }
                if (creep.name == 'harvesterHauler-972') {
                    console.log('harvesterHauler-972 > transfer result: '+transfer);
                    console.log('harvesterHauler-972 > creep.memory.laststep: '+creep.memory.laststep);
                }

                if (transfer == OK) {
                    this.moveByPath(creep,path,false,debug);
                } else {
                    if (creep.memory.laststep == 1) {
                        // ich stehe neben dem ort, an dem ich denke dass der storage ist - wenn er aber immer noch nicht in range ist, muss ich meinen pfad neu berechnen
                        if (transfer == ERR_NOT_IN_RANGE) {
                            console.log(creep.name+' at '+creep.pos+' needs a new path?');
                            Game.my.managers.sources.recalcMyPath(creep.memory.source);
                        }
                    }
                    this.moveByPath(creep,path,true,debug);
                }
            } else {
                if (debug) console.log(creep.name + ' > going to source in '+sourceRoom);
                // going to source
                this.moveByPath(creep,path,false,debug);
                if (debug) console.log(JSON.stringify(path[path.length-1]));
                if (debug) console.log(JSON.stringify(creep.pos));
                if (debug) console.log(JSON.stringify(creep.pos.x == path[path.length-1].x && creep.pos.y == path[path.length-1].y && creep.pos.roomName == path[path.length-1].roomName));
                if (creep.pos.x == path[path.length-1].x && creep.pos.y == path[path.length-1].y && creep.pos.roomName == path[path.length-1].roomName) {
                    let pos = path[path.length-1];
                    let container = false;
                    if (!creep.memory.container) {
                        let source = Game.getObjectById(creep.memory.source);
                        let containers = source.pos.findInRange(FIND_STRUCTURES,1, {filter: s => s.structureType == STRUCTURE_CONTAINER});
                        if (containers.length > 0) {
                            container = containers[0];
                            creep.memory.container = container.id;
                        } else {
                            let nearbypos = Game.my.managers.infrastructure.closestFreeAroundPos(source.pos);
                            if (_.filter(Game.constructionSites,s => s.structureType == STRUCTURE_CONTAINER 
                                && s.pos.x == nearbypos.x
                                && s.pos.y == nearbypos.y
                                && s.pos.roomName == nearbypos.roomName
                            ).length == 0) {
                                source.room.createConstructionSite(nearbypos,STRUCTURE_CONTAINER);
                            }
                        }
                    } else {
                        container = Game.getObjectById(creep.memory.container);
                    }
                    //creep.pos.findInRange(FIND_STRUCTURES,1,{filter: s => s.structureType == STRUCTURE_CONTAINER && s.store[RESOURCE_ENERGY] >= creep.carryCapacity})
                    if (debug) console.log(creep.name + ' > target container locked: '+container); 
                    if (container) {
                        if (debug) console.log(creep.name + ' > target container withdrawing');
                        // I am on last pos in my path. if the container is not in range, my path is invalid
                        if (creep.pos.getRangeTo(container) > 1 || Math.round(Math.random()*5000) == 0 ) {
                            Game.my.managers.sources.recalcMyPath(creep.memory.source);
                        } else {
                            let reset = true;
                            if (creep.withdraw(container,RESOURCE_ENERGY,(creep.carryCapacity - _.sum(creep.carry))) != OK) {
                                reset = false;
                                if (_.keys(container.store).length > 1) {
                                    if (creep.withdraw(container,_.keys(container.store)[1]) == OK) {
                                        reset = true;
                                    }
                                }
                                creep.pickupEnergyNearby(debug);
                            }
                            if (reset) {
                                creep.memory.laststep = -1;
                                this.moveByPath(creep,path,true,debug);
                            }
                        }
                    } else {
                        if (debug) console.log(creep.name + ' / '+creep.pos+' > energy laying around?');
                        creep.pickupEnergyNearby(debug);
                    }
                }
            }
        creep.room.visual.poly(_.filter(path,p=>p.roomName == creep.room.name), {stroke: '#f00', strokeWidth: .15, opacity: .2, lineStyle: 'dashed'}); 
        }
	}
};
profiler.registerObject(roleHarvesterHauler,'roleHarvesterHauler');
module.exports = roleHarvesterHauler;
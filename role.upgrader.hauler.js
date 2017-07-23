"use strict";
const profiler = require('screeps-profiler');
var cachedSearch = require('cachedSearch');
var roleUpgraderHauler = {
    sanityCheckForOffset: function(creep,path,step,offset) {
        return Math.min(path.length-1,Math.max(0,Number(step)+offset));
    },
    moveByPath: function(creep,path,reverse,debug) {
        let start = Game.cpu.getUsed();
        let step = path.findIndex(x => x.x == creep.pos.x && x.y == creep.pos.y && x.roomName == creep.pos.roomName);
        if (debug) console.log(creep.name + ' > checking path costed: '+(Game.cpu.getUsed()-start).toFixed(2));
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
                if (dohstep != 0) {
                    let targetstep = path[dohstep];
                    moveresult = creep.movePredefined(new RoomPosition(targetstep.x,targetstep.y,targetstep.roomName));
                } else {
                    moveresult = creep.movePredefined(creep.room.storage,{range:1});
                }
                return false;
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
                    return true;
                }
                return false;
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
            return false;
        }
        return true;
    },
    run: function(creep) {
        //delete creep.memory.debug;
        var debug = creep.memory.debug || false;
        debug = false;
        if (debug) console.log(creep.name + ' > reporting in '+creep.room.name);
        creep.memory.laststep = creep.memory.laststep || 0;
        if (creep.fatigue == 0) {
            let path = creep.room.memory.upgraderpath;
            let container = Game.getObjectById(creep.room.memory.controllercontainer);
            if (_.sum(creep.carry) == 0 && creep.ticksToLive < path.length) {
                creep.suicide();
            }

            creep.room.visual.poly(_.filter(path,p=>p.roomName == creep.room.name), {stroke: '#f00', strokeWidth: .15, opacity: .2, lineStyle: 'dashed'}); 
            if (debug) console.log(creep.name + ' > my path is long: '+path.length);
    
            if (_.sum(creep.carry) > creep.carryCapacity / 2) {
                // going to the container
                if (debug) console.log(creep.name + ' > going to container');
                let result = creep.transfer(container,RESOURCE_ENERGY);
                if (result == OK) {
                    this.moveByPath(creep,path,false,debug);
                } else {
                    if (!this.moveByPath(creep,path,true,debug)) {
                        if (result == ERR_NOT_IN_RANGE && container.pos.inRangeTo(creep,3)) {
                            let handover = creep.pos.findInRange(FIND_MY_CREEPS,1,{filter: c => ['upgrader'].indexOf(c.memory.role) !== -1});
                            console.log(creep.name+' '+creep.room.name+' upgrader handoverlength: '+handover.length);
                            if (handover.length > 0) {
                                console.log(creep.name+' '+creep.room.name+' handover result: '+creep.transfer(handover[0],RESOURCE_ENERGY,Math.min(handover[0].carryCapacity-_.sum(handover[0].carry),creep.carry[RESOURCE_ENERGY])));
                            }
                        }
                    }
                    
                }
            } else {
                if (debug) console.log(creep.name + ' > going to storage');
                if (creep.withdraw(creep.room.storage,RESOURCE_ENERGY) == OK) {
                    this.moveByPath(creep,path,true,debug);
                } else {
                    if (!this.moveByPath(creep,path,false,debug)) {
                        let takeaway = creep.pos.findInRange(FIND_MY_CREEPS,1,{filter: c => ['harvesterHauler','transporter'].indexOf(c.memory.role) !== -1 && c.carry[RESOURCE_ENERGY] > 0});
                        console.log(creep.name+' '+creep.room.name+' upgrader takeawaylength: '+takeaway.length);
                        if (takeaway.length > 0) {
                            console.log(creep.name+' '+creep.room.name+' transfer result: '+takeaway[0].transfer(creep,RESOURCE_ENERGY,Math.min(takeaway[0].carry[RESOURCE_ENERGY],creep.carryCapacity-_.sum(creep.carry))));
                        }
                    }
                }
            }
        }
	}
};
profiler.registerObject(roleUpgraderHauler,'roleUpgraderHauler');
module.exports = roleUpgraderHauler;
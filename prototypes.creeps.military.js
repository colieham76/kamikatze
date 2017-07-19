"use strict";
Creep.prototype.attackNearby = function(debug = false) {
    if (this.getActiveBodyparts(ATTACK) > 0) { 
        let target = this.findTargetLogic(debug,1);
        if (debug) console.log("attackNearby found targets: "+target);
        if (target){
            this.attack(target);
        }
    }
    
}
Creep.prototype.getMySquad = function(debug = false) {
    let mysquad = _.filter(Memory.squads,s => s.squad == this.memory.squad);
    if (mysquad.length == 0) {
        delete this.memory.squad;
        return false;
    } else {
        mysquad = mysquad[0];
    }
    return mysquad;
}

Creep.prototype.fireMG = function(debug = false) {
    if (this.getActiveBodyparts(RANGED_ATTACK) > 0) {
        let onlyKillTowers = false;
        if (Game.flags['onlyKillTowers'] && Game.flags['onlyKillTowers'].pos.roomName == this.pos.roomName) {
            onlyKillTowers = true;
        }
        let massattack = true;
        // if we have no attack module, check path for range 3
        // may saves some CPU
        // may helps shooting over walls.
        let range = 3;
        let target = [];
        if (Game.flags['focusfire']) {
            if (Game.flags['focusfire'].pos.getRangeTo(this) <= range) {
                target = Game.flags['focusfire'].pos.lookFor(LOOK_STRUCTURES);
            }
        }
        this.room.my = this.room.my || {};
        this.room.my.enemies = this.room.my.enemies || this.room.find(FIND_HOSTILE_CREEPS);
        let enemies = _.filter(this.room.my.enemies, c => this.pos.getRangeTo(c) <= range && (!c.owner || !Game.my.managers.strategy.isFriendly(c.owner.username)));
        if (target.length == 0) {
    //        let enemies = this.pos.findInRange(FIND_HOSTILE_CREEPS,range,{filter: (c) => !c.owner || (Memory.friendly.indexOf(c.owner.username) == -1 && Memory.allied.indexOf(c.owner.username) == -1)});
    
            if (enemies.length > 0) {
                let healer  = _.filter(enemies, f => f.getActiveBodyparts(HEAL) > 0);
                if (healer.length > 0) target = healer;
                else {
                    let fighter = _.filter(enemies, f => f.getActiveBodyparts(RANGED_ATTACK) > 0 || f.getActiveBodyparts(ATTACK) > 0);
                    if (fighter.length > 0) target = fighter;
                    else {
                        let claimer = _.filter(enemies, f => f.getActiveBodyparts(CLAIM) > 0);
                        if (claimer.length > 0) target = claimer;
                        else {
                            let worker  = _.filter(enemies, f => f.getActiveBodyparts(WORK) > 0);
                            if (worker.length > 0) target = worker;
                            else {
                                let others  = enemies;
                                if (others) target = others;
                            }
                        }
                    }
                }
            }
        }
        if (target.length == 0) {
            let spare = [];
            if (Memory.realwhitelistrooms.indexOf(this.room.name) !== -1) {
                // I don't want this room, so destroy Terminal / Storage
                spare = [STRUCTURE_STORAGE,STRUCTURE_TERMINAL]
            }
            let structs = this.pos.findInRange(FIND_STRUCTURES, range, {filter: c => !c.owner || !Game.my.managers.strategy.isFriendly(c.owner.username)});
            if (!this.room.isMine()) { 
                target = _.filter(structs,s => s.structureType == STRUCTURE_TOWER);
                if (target.length == 0) {
                    target = _.filter(structs,s => s.my === false && s.hits && spare.indexOf(s.structureType) === -1);
                    
                }
                if (target.length == 0) {
                    target = _.filter(structs,s => s.hits && ([STRUCTURE_ROAD,STRUCTURE_WALL,STRUCTURE_CONTAINER,STRUCTURE_RAMPART].indexOf(s.structureType) !== -1));
                }
            }
            if (target.length == 0 && !this.room.isMineClaimed()) {
                target = _.filter(structs,s => s.hits && ([STRUCTURE_WALL,STRUCTURE_RAMPART].indexOf(s.structureType) !== -1));
            }
            if (target.length == 0 && this.room.isHighway()) {
                target = _.filter(structs,s => s.hits && ([STRUCTURE_POWER_BANK].indexOf(s.structureType) !== -1));
            }
            
            // massattack?
            if (target.length != 0) {
                // massattack only hits owned structures.
                let owned = _.filter(target,t => typeof t.owner == "object");
                if (owned.length == 0) {
                    // if there are no owned targets, no massattack
                    massattack = false;
                } else {
                    if (_.filter(owned,o => spare.indexOf(o.structureType) !== -1).length != 0) {
                        // if there is a spare building, no massattack
                        massattack = false;
                    } else {
                        target = owned;
                    }
                }
            }
        }
        if (massattack) {
            let friendlies = _.filter(enemies, (c) => c.owner && Game.my.managers.strategy.isFriendly(c.owner.username));
            if (friendlies.length > 0) {
                massattack = false;
            }
        }
        if (onlyKillTowers && !(target[0] instanceof StructureTower)) {
            target = false;
        }
        if (massattack && (
            enemies.length > 3 
            || (enemies.length > 1 && _.sortBy(enemies, t => t.pos.getRangeTo(this))[0].pos.getRangeTo(this) == 1) 
            || target.length > 3 
            || (target.length > 1 && _.sortBy(target, t => t.pos.getRangeTo(this))[0].pos.getRangeTo(this) == 1))
        ) {
            this.rangedMassAttack();
        } else if (target.length > 0) {
            target = _.sortBy(target, t => t.hits);
            this.rangedAttack(target[0]);
        }
        return target;
    } else {
        return false;
    }
    
}

Creep.prototype.findTargetLogic= function(debug = false, maxrange = 60) {
    if (debug) console.log('findTargetLogic > '+this.name+' looks for targets in range '+maxrange);
    if (Game.flags['focusfire']) {
        if (Game.flags['focusfire'].pos.roomName == this.room.name) {
            let target = Game.flags['focusfire'].pos.lookFor(LOOK_STRUCTURES)[0];
            if (target)
                return target;
        }
    }
    let target = false;
    // first we check for creeps, but if there is a tower, we want to hit that first. If we find enemy combat creeps in path range, we turn the focus of.
    let focusOnStructs = false;
    // if we have no attack module, check path for range 3
    // may saves some CPU
    // may helps shooting over walls.
    let range = 3;
    if (this.getActiveBodyparts(ATTACK) > 0) range = 0;
    let ignoreborder = true;
    if (this.room.owner)
        ignoreborder = false;
    this.room.my = this.room.my || {};
    this.room.my.enemies = this.room.my.enemies || this.room.find(FIND_HOSTILE_CREEPS);
    let enemies = _.filter(this.room.my.enemies, 
        (c => 
            // Kein Owner oder nicht freundlich oder nicht ally
            (!c.owner || !Game.my.managers.strategy.isFriendly(c.owner.username))
            // Und ist in Maxrange
            && this.pos.getRangeTo(c) <= maxrange 
            // Und im fall von ignoreborder, darf kein exit in range sein.
            && (!ignoreborder || c.pos.findInRange(FIND_EXIT,0).length == 0 || c.owner.name == "Invader")
        )
    );
    // this.room.find(FIND_HOSTILE_CREEPS,{filter: (c) => !c.owner || Memory.friendly.indexOf(c.owner.username) == -1});
    if (enemies.length > 0) {
        delete this.memory.__findTargetLogic;
        let healer  = this.pos.findClosestByPath(_.filter(enemies, f => f.getActiveBodyparts(HEAL) > 0), { maxRooms: 1, range: range });
        if (healer) target = healer;
        else {
            let fighter = this.pos.findClosestByPath(_.filter(enemies, f => f.getActiveBodyparts(RANGED_ATTACK) > 0 || f.getActiveBodyparts(ATTACK) > 0), { maxRooms: 1, range: range });
            if (fighter) target = fighter;
            else {
                focusOnStructs = true;
                let claimer = this.pos.findClosestByPath(_.filter(enemies, f => f.getActiveBodyparts(CLAIM) > 0), { maxRooms: 1, range: range });
                if (claimer) target = claimer;
                else {
                    let worker  = this.pos.findClosestByPath(_.filter(enemies, f => f.getActiveBodyparts(WORK) > 0), { maxRooms: 1, range: range });
                    focusOnStructs = true;
                    if (worker) target = worker;
                    else {
                        let others  = this.pos.findClosestByPath(enemies, { maxRooms: 1, range: range });
                        if (others) target = others;
                    }
                }
            }
        }
    }
    // Ranged Attack is only done via creep.fireMG(), so this function only focuses on melee.
    // role SquadUlti will handle if we go in MG range or in RAM range.
    // we now have either target = false, because there is no enemy creep, or no enemy creep with path.
    // or we have a target to approach.
    // we check now for structs
    let usetargetcaching = true;
    if (maxrange == 1) {
        usetargetcaching = false;
    }
    if (!target && usetargetcaching) {
        // cached
        if (this.memory.__findTargetLogic) {
            target = Game.getObjectById(this.memory.__findTargetLogic);
            if (!target || target.pos.roomName != this.pos.roomName) {
                delete this.memory.__findTargetLogic;
                target = false;
            } else {
                if (this.pos.getRangeTo(target) <= maxrange) {
                    target = false;
                }
                if (debug) console.log('findTargetLogic > '+this.name+' uses cached target '+this.room.name);
                focusOnStructs = false;
            }
        }
    }
    let onlyKillTowers = false;
    if (Game.flags['onlyKillTowers'] && Game.flags['onlyKillTowers'].pos.roomName == this.pos.roomName) {
        onlyKillTowers = true;
    }
    if (debug) console.log('findTargetLogic > '+this.name+' target before checking for structs: '+target);
    if (!this.memory.__findTargetLogicSkipStructs || this.memory.__findTargetLogicSkipStructs != this.room.name) {
        if (!target || focusOnStructs || onlyKillTowers) {
            let structs = this.room.find(FIND_STRUCTURES, 
                {filter: (f) => 
                    f.my != true 
                    && f.hits 
                    && (!f.owner || !Game.my.managers.strategy.isFriendly(f.owner.username))
                    && this.pos.getRangeTo(f) <= maxrange
                });
            if (debug) console.log('findTargetLogic > '+this.name+' checks for buildings '+structs.length);
            if (structs.length > 0) {
                let tower   = this.pos.findClosestByPath(_.filter(structs, f => f.structureType == STRUCTURE_TOWER), { maxRooms: 1, range: range });
                if (tower) target = tower;
                else {
                    // first check is for a reachable tower, second check is for the shortest way to the bad tower, because we need to take it down fast.
                    tower   = this.pos.findClosestByPath(_.filter(structs, f => f.structureType == STRUCTURE_TOWER), { ignoreDestructibleStructures: true, ignoreCreeps: true, maxRooms: 1, range: range });
                    if (tower) target = tower;
                    else {
                        // Never destroy buildings in white listed rooms && we don't have a good target yet.
                        // exception: the whitelistedroom belongs to somebody else...
                        if (!this.room.isMineClaimed() && (!target || focusOnStructs)) {
                            let spare = [STRUCTURE_WALL];
                            if (Memory.realwhitelistrooms.indexOf(this.room.name) !== -1) {
                                // I don't want this room, so destroy Terminal / Storage
                                spare = [STRUCTURE_STORAGE,STRUCTURE_WALL,STRUCTURE_TERMINAL]
                            }
                            let obsticles = this.pos.findClosestByPath(_.filter(structs, f => (OBSTACLE_OBJECT_TYPES.indexOf(f.structureType) !== -1 && spare.indexOf(f.structureType) === -1)), { maxRooms: 1, range: range });
                            if (obsticles) target = obsticles;

                        }
                        // if we still have no target, we can destroy construction sites, even in my rooms
                        if (!target) {
                            // if its one of my rooms, enemies cannot create Construction sites, so we can just destroy them.
                            // otherwise we should only kill Construction sites, which have progress, otherwise we give the enemy some kind of controll of our troops.
                            let constructsites = [];
                            if (this.room.isMine())
                                constructsites = this.room.find(FIND_CONSTRUCTION_SITES, {filter: (f) => f.my != true});
                            else
                                constructsites = this.room.find(FIND_CONSTRUCTION_SITES, {filter: (f) => f.my != true && f.progress > 0});
                            let any = this.pos.findClosestByPath(constructsites, { maxRooms: 1, range: range });
                            if (any) target = any;
                        }
                        if (!this.room.isMineClaimed() && !target) {
                            let walls = this.pos.findClosestByPath(_.filter(structs, f => f.structureType == STRUCTURE_WALL || f.structureType == STRUCTURE_RAMPART), { maxRooms: 1, range: range });
                            if (walls) target = walls;
                        }
                        // if we still have no target, we can destroy containers
                        if (!this.room.isMine() && !target) {
                            let containers = this.pos.findClosestByPath(_.filter(structs, f => f.structureType == STRUCTURE_CONTAINER), { maxRooms: 1, range: range });
                            if (containers) target = containers;
                        }
                        if (!this.room.isMine() && !target) {
                            let roads = this.pos.findClosestByPath(_.filter(structs, f => f.structureType == STRUCTURE_ROAD || f.structureType == STRUCTURE_RAMPART || f.structureType == STRUCTURE_WALL), { maxRooms: 1, range: range });
                            if (roads) target = roads;
                        }
                    }
                }
            } 
            if (target && !focusOnStructs) {
                this.memory.__findTargetLogic = target.id;
            }
            if (!target && maxrange > 50) {
                this.memory.__findTargetLogicSkipStructs = this.room.name;
            }
        }
    }
    // if there are neither destructible buildings, nor enemy creeps, the target might be a STRUCTURE_KEEPER_LAIR
    // but only if we consider targets in the whole room.
    if (!target) {
        let KL = this.room.find(FIND_STRUCTURES, {filter: (f) => f.structureType == STRUCTURE_KEEPER_LAIR && this.pos.getRangeTo(f) < maxrange});
        if (KL.length > 0) {
            target = _.sortBy(KL,s => s.ticksToSpawn)[0];
        }
        if (target) {
            this.memory.__findTargetLogic = target.id;
        }
    }
    // maybe its a powerroom?
    if (!target) {
        let target = this.room.find(FIND_STRUCTURES, {filter: (f) => f.structureType == STRUCTURE_POWER_BANK && this.pos.getRangeTo(f) < maxrange})[0];
        if (target) {
            this.memory.__findTargetLogic = target.id;
        }
    }
    // maybe its a target behind a wall?
    if (!target) {
        if (enemies.length > 0) {
            delete this.memory.__findTargetLogic;
            let healer  = this.pos.findClosestByRange(_.filter(enemies, f => f.getActiveBodyparts(HEAL) > 0), { maxRooms: 1, range: range });
            if (healer) target = healer;
            else {
                let fighter = this.pos.findClosestByRange(_.filter(enemies, f => f.getActiveBodyparts(RANGED_ATTACK) > 0 || f.getActiveBodyparts(ATTACK) > 0), { maxRooms: 1, range: range });
                if (fighter) target = fighter;
                else {
                    focusOnStructs = true;
                    let claimer = this.pos.findClosestByRange(_.filter(enemies, f => f.getActiveBodyparts(CLAIM) > 0), { maxRooms: 1, range: range });
                    if (claimer) target = claimer;
                    else {
                        let worker  = this.pos.findClosestByRange(_.filter(enemies, f => f.getActiveBodyparts(WORK) > 0), { maxRooms: 1, range: range });
                        if (worker) target = worker;
                        else {
                            let others  = this.pos.findClosestByRange(enemies, { maxRooms: 1, range: range });
                            if (others) target = others;
                        }
                    }
                }
            }
        }
    }
    if (target) {
        if (target instanceof Structure && this.pos.inRangeTo(target,1)) {
            // melee combat vs structures, most likely Wall
            let targets = this.pos.findInRange(FIND_STRUCTURES,1,{filter: s => s.structureType == target.structureType});
            target = _.sortBy(targets,o => o.hits)[0];
        }
        if (maxrange < 50 && this.pos.findPathTo(target).length > maxrange) {
            target = false;
        }
        if (onlyKillTowers && !(target instanceof StructureTower)) {
            target = false;
        }
    }
    if (debug) console.log('findTargetLogic > '+this.name+' returns target '+target);
    if (target) {
        this.room.visual.drawCross(target.pos.x,target.pos.y, {color: '#FF0000', widht:1.5});
        this.room.visual.circle(target.pos.x,target.pos.y, {color: '#FF0000', fill: 'transparent', radius: 0.35, stroke: 'red'});
    }
    return target;
}
Creep.prototype.getMilitaryBoostedGetLab = function (actualBoosts, amount, debug = false) {
    let labs = _.filter(Game.my.managers.labmanager.labconfig[this.room.name], l => actualBoosts.indexOf(l.produce) != -1);
    let rank = false;
    let lab = false;
    for (let mylab of labs) {
        let actualLab = Game.getObjectById(mylab.output);
        if ((!rank || actualBoosts.indexOf(mylab.produce) > rank) && actualLab.mineralAmount > amount * 30 && actualLab.energy > amount * 20) {
            rank = actualBoosts.indexOf(mylab.produce);
            lab = actualLab;
        }
    }
    return lab;
}

Creep.prototype.getMilitaryBoosted= function(mysquad, debug = false) {
    debug = false;
    if (mysquad.boost && Game.my.managers.labmanager.labconfig[this.room.name] && !this.room.areThereEnemies()) {
        if (debug) console.log(this.name+' wants to get boosted');
        // if move body parts amount are more or equal of half of the body, we don't need no boost.
        let moveNotBoosted = 0;
        if (_.filter(this.body, (b) => b.type == MOVE).length < this.body.length / 2) {
            moveNotBoosted = _.filter(this.body, (b) => b.type == MOVE && b.boost == undefined).length;
        }
        let rangedNotBoosted = _.filter(this.body, (b) => b.type == RANGED_ATTACK && b.boost == undefined).length;
        let meleeNotBoosted = _.filter(this.body, (b) => b.type == ATTACK && b.boost == undefined).length;
        let healNotBoosted = _.filter(this.body, (b) => b.type == HEAL && b.boost == undefined).length;
        let toughNotBoosted = _.filter(this.body, (b) => b.type == TOUGH && b.boost == undefined).length;
        let workNotBoosted = _.filter(this.body, (b) => b.type == WORK && b.boost == undefined).length;
        let moveBoosts = [RESOURCE_ZYNTHIUM_OXIDE,RESOURCE_ZYNTHIUM_ALKALIDE,RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE];
        let rangedBoosts = [RESOURCE_KEANIUM_OXIDE,RESOURCE_KEANIUM_ALKALIDE,RESOURCE_CATALYZED_KEANIUM_ALKALIDE];
        let meleeBoosts = [RESOURCE_UTRIUM_HYDRIDE,RESOURCE_UTRIUM_ACID,RESOURCE_CATALYZED_UTRIUM_ACID];
        let healBoosts = [RESOURCE_LEMERGIUM_OXIDE,RESOURCE_LEMERGIUM_ALKALIDE,RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE];
        let toughBoosts = [RESOURCE_GHODIUM_OXIDE,RESOURCE_GHODIUM_ALKALIDE,RESOURCE_CATALYZED_GHODIUM_ALKALIDE];
        let dismantleBoosts = [RESOURCE_ZYNTHIUM_HYDRIDE,RESOURCE_ZYNTHIUM_ACID,RESOURCE_CATALYZED_ZYNTHIUM_ACID];
        let lab = false;
        if (!lab && moveNotBoosted > 0) {
            lab = this.getMilitaryBoostedGetLab(moveBoosts,moveNotBoosted,debug);
        }
        if (!lab && rangedNotBoosted > 0) {
            lab = this.getMilitaryBoostedGetLab(rangedBoosts,rangedNotBoosted,debug);
        } 
        if (!lab && meleeNotBoosted > 0) {
            lab = this.getMilitaryBoostedGetLab(meleeBoosts,meleeNotBoosted,debug);
        } 
        if (!lab && healNotBoosted > 0) {
            lab = this.getMilitaryBoostedGetLab(healBoosts,healNotBoosted,debug);
        }
        if (!lab && toughNotBoosted > 0) {
            lab = this.getMilitaryBoostedGetLab(toughBoosts,toughNotBoosted,debug);
        }
        if (!lab && workNotBoosted > 0) {
            lab = this.getMilitaryBoostedGetLab(dismantleBoosts,workNotBoosted,debug);
        }
        if (debug) console.log(this.name+ ' wants to be boosted in '+lab);
        if (lab !== false) {
            if (this.pos.isNearTo(lab)) {
                lab.boostCreep(this);
            } else {
                this.movePredefined(lab);
            }
            return true;
        }
    }
    return false;
}
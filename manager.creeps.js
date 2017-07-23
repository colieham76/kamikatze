"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
const roleUpgrader              = require('role.upgrader');
const roleUpgraderHauler        = require('role.upgrader.hauler');
const roleTransporter           = require('role.transporter');
const roleScout                 = require('role.scout');
const roleReserver              = require('role.reserver');
const roleReserverSimple        = require('role.reserver.simple');
const roleClaimer               = require('role.claimer');
const roleSquadBuddy            = require('role.squadBuddy');
const roleSquadSiegeTank        = require('role.squadSiegeTank');
const roleSquadSiegeReserver    = require('role.squadSiegeReserver');
const roleSquadUlti             = require('role.squadUlti');
const roleSlave                 = require('role.slave');
const roleHarvester             = require('role.harvester');
const roleHarvesterHauler       = require('role.harvester.hauler');
const roleHarvesterSimple       = require('role.harvester.simple');
const roleExtractor             = require('role.extractor');
const rolePowerHarvester        = require('role.powerHarvester');
const rolePowerHarvesterHauler  = require('role.powerHarvesterHauler');
const rolePowerHarvesterHealer  = require('role.powerHarvesterHealer');
const roleZombie                = require('role.zombie');

var creepManager = {
    doinit: function() {
        Game.my.creeps = Game.my.creeps || {};
        for(let key in Memory.population) {
            Game.my.creeps[key] = [];
        }
    },
    clearAllJobs: function() {
        for(let key in Game.my.creeps['hauler']) {
            delete Game.my.creeps['hauler'][key].memory.job;
            delete Game.my.creeps['hauler'][key].memory.zombie;
        }
        for(let key in Game.my.creeps['slave']) {
            delete Game.my.creeps['slave'][key].memory.job;
            delete Game.my.creeps['slave'][key].memory.zombie;
        }
    },
    registerAllCreeps: function() {
        Memory.stats.mycpu = {};
        Memory.stats.mycpu.rooms = {};
        Memory.stats.mycpu.role = {};
        Memory.stats.mycpu.roleavg = {};
        Memory.stats.mycreeps = {};
        Memory.stats.mycreeps.roleamount = {};
        if (!Game.my.creeps) this.doinit();
        for(let name in Game.creeps) {
            let creep = Game.creeps[name];
            this.registerCreep(creep);
        }
    },
    registerCreep: function(creep) {
        Game.my.creeps[creep.memory.role] = Game.my.creeps[creep.memory.role] || [];
        Game.my.creeps[creep.memory.role].push(creep);
        if (!Game.my.creepLowestTTL || Game.my.creepLowestTTL > creep.ticksToLive) {
            Game.my.creepLowestTTL = creep.ticksToLive;
        }
        Memory.stats.mycreeps.roleamount[creep.memory.role] = Memory.stats.mycreeps.roleamount[creep.memory.role] || 0
        Memory.stats.mycreeps.roleamount[creep.memory.role]++;
    },
    manageCreeps: function(roles) {
        for (let role in roles) {
            role = roles[role];
            for(let key in Game.my.creeps[role]) {
                let creep = Game.my.creeps[role][key];
                if (creep.idle) continue;
                try {
                    let start = Game.cpu.getUsed();
                    if (creep.ticksToLive) {
                        if(creep.memory.role == 'slave' || creep.memory.role == 'hauler') {
                            let isboosted = _.any( creep.body, part => part.boost !== undefined );
                            if (isboosted) {
                                console.log(creep.name+" at "+creep.pos+" is boosted");
                            }
                            let stillAZombie = false;
                            if(creep.memory.zombie) {
                                stillAZombie = roleZombie.run(creep);
                            }
                            if (!stillAZombie) {
                                roleSlave.run(creep);
                            }
                        } else if(creep.memory.role == 'transporter') {
                            roleTransporter.run(creep);
                        } else if(
                            ['squadboostedsk','squadboostedskirmisher','squadskirmisher','squadsk'].indexOf(creep.memory.role) !== -1
                        ) {
                            roleSquadUlti.run(creep);
                        } else if(creep.memory.role == 'squadbuddy' || creep.memory.role == 'squadboostedbuddy') {
                            roleSquadBuddy.run(creep);
                        } else if(creep.memory.role == 'squadsiegetank') {
                            roleSquadSiegeTank.run(creep);
                        } else if(creep.memory.role == 'squadsiegehealer') {
                            roleSquadSiegeHealer.run(creep);
                        } else if(creep.memory.role == 'squadsiegereserver') {
                            roleSquadSiegeReserver.run(creep);
                        } else if(creep.memory.role == 'harvester') {
                            if (creep.memory.usesimple) {
                                roleHarvesterSimple.run(creep);
                            } else {
                                roleHarvester.run(creep);
                            }
                        } else if(creep.memory.role == 'harvesterHauler') {
                            roleHarvesterHauler.run(creep);
                        } else if(creep.memory.role == 'reserver') {
                            if (creep.memory.usesimple) {
                                roleReserverSimple.run(creep);
                            } else {
                                roleReserver.run(creep);
                            }
                        } else if(creep.memory.role == 'claimer') {
                            roleClaimer.run(creep);
                        } else if(creep.memory.role == 'upgrader') {
                            roleUpgrader.run(creep);
                        } else if(creep.memory.role == 'upgraderHauler') {
                            roleUpgraderHauler.run(creep);
                        } else if(creep.memory.role == 'scout') {
                            roleScout.run(creep);
                        } else if(creep.memory.role == 'extractor') {
                            roleExtractor.run(creep);
                        } else if(creep.memory.role == 'powerHarvester') {
                            rolePowerHarvester.run(creep);
                        } else if(creep.memory.role == 'powerHarvesterHealer') {
                            rolePowerHarvesterHealer.run(creep);
                        } else if(creep.memory.role == 'powerHarvesterHauler') {
                            rolePowerHarvesterHauler.run(creep);
                        } else {
                            console.log("unkown creep role in memory: "+creep.memory.role);
                        }
                    }
                    let end = Game.cpu.getUsed();
                    let duration = end - start;
                    Memory.stats.mycpu.rooms[creep.room.name] = Memory.stats.mycpu.rooms[creep.room.name] || 0;
                    Memory.stats.mycpu.rooms[creep.room.name] += duration*1000
                    Memory.stats.mycpu.role[creep.memory.role] = Memory.stats.mycpu.role[creep.memory.role] || 0;
                    Memory.stats.mycpu.role[creep.memory.role] += duration*1000
                } catch (err) {
                    let note = 'Error running creep '+ creep + " in room " + creep.room.name + " error: " +err.name+ " role " +creep.memory.role + err.stack;
                    console.log(note);
                    Game.notify(note);
                    creep.memory.debug = true;
                }
            }
        }
    },
    givePopulation: function() {
        console.log("total amount of creeps: "+_.keys(Game.creeps).length);
    }
}
profiler.registerObject(creepManager,'creepManager');
module.exports = creepManager;
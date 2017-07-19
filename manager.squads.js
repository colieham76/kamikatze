"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');

var squadManager = {
    /** @param {Creep} creep **/
    manageSquad: function(squad,debug) {
        let targetRoom = false;
        let squadmembers = _.filter(this.prefilter, (creep) => creep.memory.squad == squad.squad);
        if(squad.modus != "dead") {
            if(!squad.recruitingComplete) {
                let count = {};
                for(let squadrole in this.squadroles) {
                    squadrole = this.squadroles[squadrole];
                    count[squadrole] = 0;
                }
                for(let key in squadmembers) {
                    count[squadmembers[key].memory.role] ++;
                }
                let complete = true;
                let recruited = false;
                for (let key in _.keys(squad.configsquadsize)) {
                    let role = _.keys(squad.configsquadsize)[key];
                    if (count[role] < squad.configsquadsize[role]) {
                        complete = false;
                        // recruit somebody for this squad
                        if (!squad.recruitRoom) {
                            var recruit = _.filter(this.prefilter, (creep) => creep.memory.role == role && !creep.memory.squad);
                        } else {
                            var recruit = _.filter(this.prefilter, (creep) => creep.memory.role == role && !creep.memory.squad && creep.pos.roomName == squad.recruitRoom);
                        }
                        if (recruit.length > 0) {
                            recruit[0].memory.squad = squad.squad;
                            recruited = true;
                            count[role]++;
                        }
                    }
                }
                if (!recruited && !complete) {
                    for (let key in squad.configsquadsize) {
                        if (!squad.recruitRoom) {
                            if (!count[key] ) {   
                                Memory.squadsmeta[key] += squad.configsquadsize[key] 
                            } else if (squad.configsquadsize[key] > count[key]) {   
                                Memory.squadsmeta[key] += squad.configsquadsize[key] - count[key] 
                            }
                        } else {
                            Memory.squadsmetaroom[squad.recruitRoom] = Memory.squadsmetaroom[squad.recruitRoom] || {};
                            Memory.squadsmetaroom[squad.recruitRoom][key] = Memory.squadsmetaroom[squad.recruitRoom][key] || 0;
                            if (!count[key] ) {   
                                Memory.squadsmetaroom[squad.recruitRoom][key] += squad.configsquadsize[key] 
                            } else if (squad.configsquadsize[key] > count[key]) {   
                                Memory.squadsmetaroom[squad.recruitRoom][key] += squad.configsquadsize[key] - count[key] 
                            }
                        }
                    }
                }
                squad.recruitingComplete = complete;
            } 
            if (squad.recruitingComplete) {
                squadmembers = _.filter(this.prefilter, (creep) => creep.memory.squad == squad.squad);
                if (!squad.stagingComplete) {
                    squad.modus = "staging";
                    let stagingsquadmembers = false;
                    if (Game.flags['squad'+squad.squad+'staging'])
                        stagingsquadmembers = _.filter(this.prefilter, (creep) => creep.memory.squad == squad.squad && creep.pos.getRangeTo(Game.flags['squad'+squad.squad+'staging'].pos) <= 5 && creep.ticksToLive);
                    else
                        stagingsquadmembers = _.filter(prefilter, (creep) => creep.memory.squad == squad.squad && creep.room.name == squad.stagingRoom && creep.ticksToLive);
                    if (_.size(squadmembers) == _.size(stagingsquadmembers) || squad.isDefender)
                        squad.stagingComplete = true;
                    else
                        squad.stagingComplete = false;
                }
            }
            if (debug) console.log("staging complete: "+squad.stagingComplete +" | recruiting complete: "+squad.recruitingComplete);
            if (squad.stagingComplete && squad.recruitingComplete) {
                if (_.filter(this.prefilter, (creep) => creep.memory.squad == squad.squad 
                    && ['squadskirmisher','squadsk','squadboostedskirmisher','squadboostedsk','squadsiegetank','squadbuddy'].indexOf(creep.memory.role) !== -1
                    && creep.hits/creep.hitsMax > 0.333).length == 0
                ) {
                    squad.modus = "fallback";
                } else {
                    squad.modus = "combat";
                }
                if (squad.recruitingComplete && squad.stagingComplete && squadmembers.length == 0) {
                    squad.modus = "dead";
                }
                if (squad.modus == "fallback" || squad.modus == "dead") {
                    targetRoom = squad.fallbackRoom;
                } else if(squad.recruitingComplete && squad.stagingComplete ) {
                    targetRoom = squad.targetRoom;
                } else {
                    targetRoom = squad.stagingRoom;
                }
            } else {
                targetRoom = squad.stagingRoom;
            }
            let meta = "";
            if (squad.modus == "recruiting" || squad.modus == "staging") {
                meta = "staging: "+squad.stagingRoom+" target: "+squad.targetRoom;
            } else {
                meta = "target: "+squad.targetRoom;
            }
            if (squad.squadLeader && !Game.creeps[squad.squadLeader]) {
                delete squad.squadLeader;
            }
            console.log("status of squad "+squad.squad+" "+squad.modus+" - "+meta+" "+squadmembers.length+"/"+_.sum(squad.configsquadsize)+" TTL: "+squad.ticksToLive);
            if (squadmembers.length > 0) {
                squad.ticksToLive = 1500;
            } else {
                squad.ticksToLive = 0;
            }
        }
        squadmembers = _.sortBy(squadmembers, o => o.memory.role);
        for(let key in squadmembers) {
            if (squad.modus == "dead") {
                delete squadmembers[key].memory.squad;
            } else {
                if (squadmembers[key].ticksToLive) {
                    squad.ticksToLive = Math.min(squad.ticksToLive,squadmembers[key].ticksToLive);
                }
                if (!squad.isSK) {
                    let output = '<progress value="'+Math.round(squadmembers[key].hits/squadmembers[key].hitsMax*100)+'" max="100"> </progress> ';
                    output += squadmembers[key].memory.role+" with "+(squadmembers[key].hits/squadmembers[key].hitsMax*100).toFixed(2)+"% HP reporting in room ";
                    output += squadmembers[key].pos.roomName+" ("+Game.map.findRoute(squadmembers[key].pos.roomName,(squad.modus == "combat"?squad.targetRoom:squad.stagingRoom)).length+") and time to live "+squadmembers[key].ticksToLive;
                    console.log('<div>'+output+"</div>");
                }
            }
        }
    },
    manage: function() {
        let debug = false;
        console.log(' --- MILITARY --- ');
        if (!Memory.squads)         {   Memory.squads = {}; }
        if (!Memory.squadsmeta)     {   Memory.squadsmeta = {}; }
        if (!Memory.squadsmeta)     {   Memory.squadsmeta = {}; }
        this.squadroles = Game.my.managers.strategy.getSquadRoles();
        Memory.squadsmeta = {};
        Memory.squadsmetaroom = {};
        this.prefilter = _.filter(Game.creeps, (c) => this.squadroles.indexOf(c.memory.role) !== -1);
        for(let squadrole in this.squadroles) {
            squadrole = this.squadroles[squadrole];
            Memory.squadsmeta[squadrole] = 0;
        }
        
        
        let squads = _.filter(Memory.squads,s => s.recruitRoom != false)
        for(let squadkey in squads){
            let squad = Memory.squads[squads[squadkey].key];
            this.manageSquad(squad,debug);
        }
        squads = _.filter(Memory.squads,s => s.recruitRoom == false)
        for(let squadkey in squads){
            let squad = Memory.squads[squads[squadkey].key];
            this.manageSquad(squad,debug);
        }
        console.log(JSON.stringify(Memory.squadsmeta));
        console.log(JSON.stringify(Memory.squadsmetaroom));
    },
    
}
profiler.registerObject(squadManager,'squadManager');
module.exports = squadManager;
"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');

var memoryManager = {
    initTime: false,
    roompathlength: {},
    sourcePaths: {},
    roomroute: {},
    cacheRoadCostMatrix: {},
    save: function() {
        // write to segments
//        console.log("saving to sourcePaths: "+typeof this.sourcePaths + " length: "+JSON.stringify(this.sourcePaths).length);
        Game.my.managers.lib_segments.saveObject('sourcePaths', this.sourcePaths);
//        console.log("saving to roompathlength: "+typeof this.roompathlength + " length: "+JSON.stringify(this.roompathlength).length);
        Game.my.managers.lib_segments.saveObject('roompathlength', this.roompathlength);
//        console.log("saving to roomroute: "+typeof this.roomroute + " length: "+JSON.stringify(this.roomroute).length);
        Game.my.managers.lib_segments.saveObject('roomroute', this.roomroute);
    },
    init: function() {
        Memory.memoryResetTime = Memory.memoryResetTime || Game.time;
        if (!this.initTime || this.initTime < Memory.memoryResetTime) {
            this.initTime = Game.time;
            Memory.sourceManagerTicksInARow = 0;
            console.log('doing source manager init');
            
            // read from segments
            //this.sourcePaths = Game.my.managers.lib_segments.getObject('sourcePaths');
            let tmp = Game.my.managers.lib_segments.getObject('sourcePaths');
            if (typeof tmp === "object") {
                console.log('restored sources from segments');
                this.sourcePaths = tmp;
            } else {
                console.log(':( segment type is '+typeof tmp+' '+JSON.stringify(tmp));
                console.log(':( active segments are: '+_.keys(RawMemory.segments));
            }
            tmp = Game.my.managers.lib_segments.getObject('roompathlength');
            if (typeof tmp === "object") {
                console.log('restored roompathlength from segments');
                this.roompathlength = tmp;
            } else {
                console.log(':( segment type is '+typeof tmp+' '+JSON.stringify(tmp));
                console.log(':( active segments are: '+_.keys(RawMemory.segments));
            }
            tmp = Game.my.managers.lib_segments.getObject('roomroute');
            if (typeof tmp === "object") {
                console.log('restored roomroute from segments');
                this.roomroute = tmp;
            } else {
                console.log(':( segment type is '+typeof tmp+' '+JSON.stringify(tmp));
                console.log(':( active segments are: '+_.keys(RawMemory.segments));
            }
        } else {
            Memory.sourceManagerTicksInARow ++;
//            console.log('using init which is '+(Game.time - this.initTime)+' ticks old, last init is '+Memory.sourceManagerTicksInARow+' ticks ago');
        }
        Game.my.managers.lib_segments.requestSegment(0);
        if (typeof RawMemory.segments['0'] != "undefined") {
            let terminals = _.filter(Game.structures,(s) => s.structureType == STRUCTURE_TERMINAL && _.sum(s.store[RESOURCE_ENERGY]) < (s.storeCapacity-50000));
            let output = ['send up to 50k energy / minerals to these rooms: ']
            for(let terminal of terminals) {
                output.push(terminal.room.name);
            }
            RawMemory.segments['0'] = JSON.stringify(output)
        }

        
        if (!Memory.jobs)           Memory.jobs = {};
        if (!Memory.jobs.PICKUP_POWER)           Memory.jobs.PICKUP_POWER = {};
        if (!Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL)           Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL = {};
        if (!Memory.jobs.TRANSFER_MINERAL)           Memory.jobs.TRANSFER_MINERAL = {};
        if (!Memory.jobs.TRANSFER_ENERGY)           Memory.jobs.TRANSFER_ENERGY = {};
        if (!Memory.jobs.DISMANTLE_HARVEST_ENERGY)           Memory.jobs.DISMANTLE_HARVEST_ENERGY = {};
        if (!Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE)           Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE = {};
        if (!Memory.jobs.UPGRADE_CONTROLLER)           Memory.jobs.UPGRADE_CONTROLLER = {};
        if (!Memory.jobs.GET_BOOSTED)           Memory.jobs.GET_BOOSTED = {};
        if (!Memory.jobs.SCOUT)           Memory.jobs.SCOUT = {};
        if (!Memory.rooms)           Memory.rooms = {};
        if (!Memory.claiming)           Memory.claiming = [];
        if (!Memory.bucketmanager)  Memory.bucketmanager = {};
        if (!Memory.whitelistrooms) {
            Memory.whitelistrooms = Game.my.managers.strategy.getCoreRooms();
        }
        if (!Memory.realwhitelistrooms) {
            Memory.realwhitelistrooms = Memory.whitelistrooms;
        }
        if (!Memory.stats) Memory.stats = {};
        if (!Memory.avoid) Memory.avoid = [];
        if (!Memory.population) {
            Memory.population = {
                extractor: 0,
                harvester: 0,
                hauler: 0,  
                powerHarvester: 0,
                powerHarvesterHealer: 0,
                reserver: 0,
                scout: 0,
                slave: 0,
                squadhealer: 0,
                squadsiegeHealer: 0,
                squadsiegeReserver: 0,
                squadskirmisher: 0,
                squadsk: 0,
                squadbuddy: 0,
                transporter: 0,
                upgrader: 0
            }
        }
        if (!Memory.reservinginfrastructure) Memory.reservinginfrastructure = [];
        if (!Memory.jobrooms) Memory.jobrooms = [];
        if (!Memory.reserving) Memory.reserving = [];
        if (!Memory.creepNum) Memory.creepNum = 0;
        Memory.structures = Memory.structures || {};
        Memory.population.scout = (Memory.whitelistrooms.length - _.size(Game.rooms));
        Game.varMemory = {};
        if (!Memory.lastPowerBankStatus) {
            Memory.lastPowerBankStatus = {};
        }
        Memory.market = Memory.market || {};
        for(let key in _.keys(Memory.squads)) {
            key = _.keys(Memory.squads)[key];
            if (Memory.squads[key])
                Memory.squads[key].key = key;
            else
                Memory.squads = Memory.squads.splice(key,1);
        }
        if (!Memory.bucketmanager.lasts)             Memory.bucketmanager.lasts = {};
    },
    showSize: function(show,level = 0) {
        let out = [];
        for(let key in _.keys(show)) {
            key = _.keys(show)[key];
            let length = JSON.stringify(show[key]).length;
            out.push({key: key, length: length});
        }
        out = _.sortByOrder(out,['length'],['desc']);
        // sort
        for(let i in out) {
            if (out[i].length > 10000) {
                if (level == 0) {
                    if (out[i].key == 'rooms') {
                        this.showSize(show[out[i].key],2);
                    }
                    console.log(out[i].key+" > "+this.formatSizeUnits(out[i].length));
                } else {
                    if (out[i].key == 'W88S68') {
                        this.showSize(show[out[i].key],2);
                    }
                    console.log('>'+out[i].key+" > "+this.formatSizeUnits(out[i].length));
                }
            }
        }

    },
    unload: function() {
        this.save();
        Game.my.managers.lib_segments.process();
        if (Memory.showMemorySize) {
            this.showSize(Memory);
        }
    },
    formatSizeUnits: function(bytes){
      if      (bytes>=1073741824) {bytes=(bytes/1073741824).toFixed(2)+' GB';}
      else if (bytes>=1048576)    {bytes=(bytes/1048576).toFixed(2)+' MB';}
      else if (bytes>=1024)       {bytes=(bytes/1024).toFixed(2)+' KB';}
      else if (bytes>1)           {bytes=bytes+' bytes';}
      else if (bytes==1)          {bytes=bytes+' byte';}
      else                        {bytes='0 byte';}
      return bytes;
    }
}
profiler.registerObject(memoryManager,'memoryManager');
module.exports = memoryManager;
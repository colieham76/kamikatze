"use strict";
require('prototypes.creeps');
require('prototypes.creeps.heal');
require('prototypes.creeps.military');
require('prototypes.creeps.move');
require('x.kamikatze.creep_prototypes_flee');
require('x.kamikatze.creep_prototypes_dirs');
require('x.proximo.creepidle');
require('prototypes.structures');
require('prototypes.structures.observer');
require('prototypes.structures.terminal');
require('prototypes.room');
require('prototypes.roomvisual');
require('prototypes.pos');
const profiler = require('screeps-profiler');
const infrastructure = require('infrastructure');
const cachedSearch = require('cachedSearch');
const jobFinder = require('manager.jobs');
const labManager = require('manager.labs');
const creepManager = require('manager.creeps');
const spawnManager = require('manager.spawn');
const spawnQueueManager = require('manager.spawnqueue');
const marketManager = require('manager.market');
const memoryManager = require('manager.memory');
const squadManager = require('manager.squads');
const sourcesManager = require('manager.sources');
const strategyManager = require('manager.strategy');
const terminalManager = require('manager.terminals');
const bucketManager = require('manager.bucket');
const makeButton = require('x.helam.makeButton');
const lib_segments = require('x.tedivm.sos_lib_segments');

const screepsplus = require('screepsmaster.screepsplus');
//profiler.enable();
module.exports.loop = function() {
    profiler.wrap(function() { 
//    console.log(Game.cpu.bucket);
//    return;
    Game.cpu.atstart = Game.cpu.getUsed();
    let tmp = Memory.showMinimap;
    Game.cpu.memory = Game.cpu.getUsed()-Game.cpu.atstart;
    Game.my = {};
    Game.my.managers = {};
    Game.my.managers.observer = {};
    Game.my.managers.cachedSearch = cachedSearch;
    Game.my.managers.strategy = strategyManager;
    Game.my.managers.terminals = terminalManager;
    Game.my.managers.jobFinder = jobFinder;
    Game.my.managers.infrastructure = infrastructure;
    Game.my.managers.labmanager = labManager;
    Game.my.managers.spawn = spawnManager;
    Game.my.managers.spawnqueue = spawnQueueManager;
    Game.my.managers.sources = sourcesManager;
    Game.my.managers.memory = memoryManager;
    Game.my.managers.creepManager = creepManager;
    Game.my.managers.lib_segments = lib_segments;
//        Game.my.managers.sources.recalcMyPath(Game.creeps['harvesterHauler-261'].memory.source);
    Game.bucketManager = bucketManager;
    cachedSearch.cleanUpCache();
    let name;
    spawnManager.doPower = false;
    spawnManager.init = false;
    spawnManager.spawninit = false;
    
    spawnManager.updateContainerInit = false;
    Game.my.managers.memory.init();
    spawnManager.initRooms();
    for (let key in Game.rooms) {
        Game.rooms[key].my = {};
        cachedSearch.sourcesOfRoom(key);
        Game.rooms[key].memory.scouted = true;
//        Game.rooms[key].my.enemies = {};
    }

//    start = Game.cpu.getUsed();
    strategyManager.rateWhitelistRooms();
//    console.log(Game.cpu.getUsed()-start);

    jobFinder.useJobFlags = false;
    jobFinder.useJobVisuals = true;
    creepManager.registerAllCreeps();
    
    Game.bucketManager.addtobucket();
    if (Game.cpu.bucket > 300) {
        Game.bucketManager.callfrombucket(jobFinder,jobFinder.assignJobs,{},"jobFinder-assignJobs");
    }
    let fighting = Game.my.managers.strategy.getSquadRoles();
    Game.bucketManager.callfrombucket(creepManager,creepManager.manageCreeps,[fighting],"military");

    let eco = ['harvester','harvesterHauler'];
    let ecodidwork = Game.bucketManager.callfrombucket(creepManager,creepManager.manageCreeps,[eco],"creeps-eco");
    let working = ['transporter','slave','hauler','reserver','claimer','upgrader','upgraderHauler','scout','extractor','powerHarvester','powerHarvesterHealer','powerHarvesterHauler'];
    let workingdidwork = Game.bucketManager.callfrombucket(creepManager,creepManager.manageCreeps,[working],"creeps");
    Game.bucketManager.callfrombucket(screepsplus,screepsplus.collect_stats,{},"stats");
    Memory.stats.buckets = Memory.bucketmanager;

    if (Game.rooms["sim"]) {
        infrastructure.drawExtensions(Game.rooms["sim"]);
    } else {
//        infrastructure.planWalls(Game.rooms['E3S8']);
        let corerooms = Game.my.managers.strategy.getCoreRooms();
        for (let key in corerooms) {
            infrastructure.drawExtensions(Game.rooms[corerooms[key]]);
        }
        for (let key in Game.rooms) {
//            infrastructure.drawFirstSpawn(Game.rooms[key]);
        }
    }

/*    for (let key in _.keys(Memory.rooms)) {
        name = _.keys(Memory.rooms)[key];
        if (Memory.rooms[name].plannedRoads && Memory.rooms[name].plannedRoads.length > 0) {
            console.log(name+' has only '+_.uniq(Memory.rooms[name].plannedRoads,x => x.x+'>'+x.y).length+"/"+Memory.rooms[name].plannedRoads.length+' roads planned');
            Memory.rooms[name].plannedRoads = _.uniq(Memory.rooms[name].plannedRoads,x => x.x+'>'+x.y);
        }
    }*/


    for (let name in Game.rooms) {
        let room = Game.rooms[name];
/*        if (typeof room.memory.cacheRoadCostMatrix != "undefined") {
            room.cacheRoadCostMatrix = JSON.parse(room.memory.cacheRoadCostMatrix);
            let costs = PathFinder.CostMatrix.deserialize(room.cacheRoadCostMatrix)
            for(let x = 0;x <= 49; x++) {
                for(let y = 0;y <= 49; y++) {
                    room.visual.text(costs.get(x,y), new RoomPosition(x,y,room.name));
                }
            }

        }*/
        

        for (let key in Game.rooms[name].memory.toBeRepaired) {
            let pos = new RoomPosition(Game.rooms[name].memory.toBeRepaired[key].x,Game.rooms[name].memory.toBeRepaired[key].y,name);
        }
        if (Memory.showPlannedRoads) {
            for (let key in Game.rooms[name].memory.plannedRoads) {
                let pos = new RoomPosition(Game.rooms[name].memory.plannedRoads[key].x,Game.rooms[name].memory.plannedRoads[key].y,name);
                Game.rooms[name].visual.circle(pos, {fill: 'transparent', radius: 0.55, stroke: 'LimeGreen', strokeWidth: 0.1})
            }
        }
    }
    spawnManager.towerAllRooms();
    if (Game.cpu.bucket <= 600 
        || (!workingdidwork || !ecodidwork)
        || (Game.cpu.bucket <= 1200 && Game.time % 4 != 0)
        || (Game.cpu.bucket <= 2400 && Game.time % 2 != 0)
    ) {
        var end = Game.cpu.getUsed();
        if (Game.cpu.bucket <= 600)
            console.log('.'.repeat(Math.floor(Game.cpu.bucket/10))+"|"+'.'.repeat(60-Math.floor(Game.cpu.bucket/10))+" > Creeps: "+_.size(Game.creeps)+" > Bucket "+Game.cpu.bucket+" SKIPPED WITH "+Math.floor(end)+" for bucket: "+Math.floor(Game.cpu.limit - end));
        else
            console.log("Bucket "+Game.cpu.bucket+" SKIPPED WITH "+Math.floor(end)+" for bucket: "+Math.floor(Game.cpu.limit - end));
        memoryManager.unload();
        Memory.stats.cpu.used = Game.cpu.getUsed();
        return;
    }
    console.log('.');
    console.log('.');
    console.log('.');
//    if (Game.time % 10 != 0)
//        return;
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
    console.log('.');
//    console.log("size of cacheRoadCostMatrix: "+JSON.stringify(Game.my.managers.memory.cacheRoadCostMatrix).length);
    console.log('------------------------------------ Bucket '+Game.cpu.bucket+' ------------------------------------');
    console.log("below1000: "+Memory.below1000+" over9000: "+Memory.over9000+" howmanyrooms: "+Memory.howmanyrooms+" jobrooms: "+Memory.jobrooms.length+" reserving: "+Memory.reserving.length+" reservinginfra: "+Memory.reservinginfrastructure.length);
    console.log('visibility of rooms: '+_.keys(Game.rooms).length+" / "+Memory.whitelistrooms.length);

    let start = Game.cpu.getUsed();
//    Game.my.managers.strategy.showTowerDamage("W86S68");
//    Game.my.managers.strategy.showTowerDamage("W82S65");
//    console.log((Game.cpu.getUsed() - start).toFixed(2));
    
    creepManager.givePopulation();
    spawnManager.powerRooms();
    for(let key in Game.constructionSites) {
      if (Game.constructionSites[key].structureType != STRUCTURE_ROAD && Game.constructionSites[key].structureType != STRUCTURE_WALL && Game.constructionSites[key].structureType != STRUCTURE_RAMPART && Game.constructionSites[key].structureType != STRUCTURE_CONTAINER) {
        console.log(Game.constructionSites[key].structureType + " in " + Game.constructionSites[key].pos.roomName + " has progress of " + Math.round((Game.constructionSites[key].progress / Game.constructionSites[key].progressTotal)*10000)/100+" %");
        if (Memory.whitelistrooms.indexOf(Game.constructionSites[key].pos.roomName) === -1)
            console.log(Game.constructionSites[key].remove());
      }
    }
    spawnManager.mysources = [];

//    console.log("start: "+spawnManager.mysources.length);
    for(name in Game.rooms) {
        if (Memory.realwhitelistrooms.indexOf(name) !== -1 || name == 'sim' || (Game.rooms[name].controller && Game.rooms[name].controller.my)) {
            spawnManager.exploreWhitelistRoom(Game.rooms[name]);
        }
    }
    spawnManager.findmysources();

    spawnManager.printoutput();
    jobFinder.report();

    Memory.population.harvester = spawnManager.mysources.length;
    Memory.population.harvesterHauler = spawnManager.mysources.length;
    Memory.population.reserver = Memory.reserving.length;
    Memory.population.slave = 
        Math.max(10,
            Math.round(_.keys(Game.spawns).length*2.5),
            Math.round(Game.my.managers.strategy.getCoreRooms().length) * 3
        );
    Memory.population.hauler = 0; //Math.max(Math.round(spawnManager.mysources.length*0.666)-Math.round(Memory.population.slave/2),0);
    
    Memory.population.claimer = Memory.claiming.length;
//        return;


    //marketManager.manageAllRooms();
    Game.bucketManager.callfrombucket(marketManager,marketManager.manageAllRooms,[],"market");
    Game.bucketManager.callfrombucket(marketManager,marketManager.getStats,[],"market-stats");
    //marketManager.getStats();

    cachedSearch.setCache('mySources','a1',spawnManager.mysources,Game.varMemory);
    console.log('GCL '+ Game.gcl.level +' progress: ' + Math.round((Game.gcl.progress / Game.gcl.progressTotal) *100000)/1000 + "%");
    if (_.keys(Game.constructionSites).length <= 50) {
        if ((!Memory.infrastructureRooms || (Game.time - Memory.bucketmanager.lasts.infrastructure > 1000))) {
            console.log('resetting infra');
            Memory.infrastructureRooms = new Array();
            Memory.bucketmanager.lasts.infrastructure = Game.time;
        }
    }
    Game.bucketManager.callfrombucket(infrastructure,infrastructure.findrepairs,[],"findrepairs");
    let doInfrastructure = true;
    infrastructure.done = false;
    for (name in Game.rooms) {
        let room = Game.rooms[name];
        room.buildPlannedRoad();
        room.buildPlannedWall();
        if (doInfrastructure && Memory.infrastructureRooms.indexOf(room.name) === -1) {
            // infrastructure is not yet done
            if (room.isMineClaimed()) {
                console.log('might be doing infrastructure for '+room.name);
                Game.bucketManager.callfrombucket(spawnManager,spawnManager.doinfrastructureforroom,[room.name],"infrastructure");
                doInfrastructure = false;
            }
            if (Memory.reservinginfrastructure.indexOf(room.name) !== -1) {
                console.log('might be doing infrastructure for remote '+room.name);
                Game.bucketManager.callfrombucket(infrastructure,infrastructure.doInfrastructureForReservedRoom,[room.name],"infrastructure");
                doInfrastructure = false;
            }

        }
    }
    Game.bucketManager.callfrombucket(spawnManager,spawnManager.manageAllRooms,[jobFinder],"spawns");
    Game.bucketManager.callfrombucket(spawnManager,spawnManager.manageAllTerminals,[],"terminals");
    Game.bucketManager.callfrombucket(jobFinder,jobFinder.fillJobQueue,[Memory.jobrooms],"jobFinder-fillJobQueue");
    /*
    if (Memory.showFlags || 1 == 1) {
        for(let flagName in Game.flags) {
            let flag = Game.flags[flagName];
            let button = makeButton.makeButton('removeFlag'+flag.name,'remove flag','Game.flags["'+flag.name+'"].remove()');
            console.log(flag.name+" > "+flag.pos+" > "+button);
        }
    }
    for (let key in _.keys(Memory.squads)) {
        console.log('squad key '+_.keys(Memory.squads)[key]+' is in use');
    }
    */  

//    console.log(_.keys(Game.varMemory.pathCostsCache).length+" / "+_.keys(Memory.pathCostsCache).length);
    marketManager.status();
    let cpustart = Game.cpu.getUsed();
    for(let s in Game.structures) {
        Game.structures[s].run();
    }
    console.log((Game.cpu.getUsed()-cpustart).toFixed(4));
    squadManager.manage();
    strategyManager.manage();
    terminalManager.status();
    var end = Game.cpu.getUsed();
    let buttons = makeButton.makeButton('showMinimap','toggle Minimap: '+Memory.showMinimap,'Memory.showMinimap = '+(Memory.showMinimap?'false':'true'));
    buttons += makeButton.makeButton('showJobReport','toggle Jobreport: '+Memory.showJobReport,'Memory.showJobReport = '+(Memory.showJobReport?'false':'true'));
    buttons += makeButton.makeButton('showPlannedExtensions','toggle PlannedExtensions: '+Memory.showPlannedExtensions,'Memory.showPlannedExtensions = '+(Memory.showPlannedExtensions?'false':'true'));
    buttons += makeButton.makeButton('showSpawnStatus','toggle SpawnStatus: '+Memory.showSpawnStatus,'Memory.showSpawnStatus = '+(Memory.showSpawnStatus?'false':'true'));
    buttons += makeButton.makeButton('showMarketStatus','toggle showMarketStatus: '+Memory.showMarketStatus,'Memory.showMarketStatus = '+(Memory.showMarketStatus?'false':'true'));
    buttons += makeButton.makeButton('showTerminalStatus','toggle showTerminalStatus: '+Memory.showTerminalStatus,'Memory.showTerminalStatus = '+(Memory.showTerminalStatus?'false':'true'));
    buttons += makeButton.makeButton('showMemorySize','toggle showMemorySize: '+Memory.showMemorySize,'Memory.showMemorySize = '+(Memory.showMemorySize?'false':'true'));
    buttons += makeButton.makeButton('showEnergyOutput','toggle showEnergyOutput: '+Memory.showEnergyOutput,'Memory.showEnergyOutput = '+(Memory.showEnergyOutput?'false':'true'));
    buttons += makeButton.makeButton('showPlannedRoads','toggle showPlannedRoads: '+Memory.showPlannedRoads,'Memory.showPlannedRoads = '+(Memory.showPlannedRoads?'false':'true'));
    console.log(buttons);
    buttons = makeButton.makeButton('resetPriorityOfRooms','reset PriorityOfRooms','Game.my.managers.strategy.resetRooms()');
    buttons += makeButton.makeButton('increaseHowManyRooms','increase howManyRooms: '+Memory.howmanyrooms,'Memory.howmanyrooms++');
    buttons += makeButton.makeButton('decreaseHowManyRooms','decrease howManyRooms: '+Memory.howmanyrooms,'Memory.howmanyrooms--');
    buttons += makeButton.makeButton('infrastructure now','infrastructure now: '+(Game.time - Memory.bucketmanager.lasts.infrastructure),'Memory.bucketmanager.lasts.infrastructure = 1;');
    
    console.log(buttons);
    if (spawnManager.updateContainerInit) {
        Memory.updateContainerTick = Game.time;
    }
    let result = "---------------- ENDED WITH "+Math.floor(end)+" for bucket: "+Math.floor(Game.cpu.limit - end)+" ----------------";
    console.log(result);
    Game.my.managers.memory.unload();
    Memory.stats.cpu.used = Game.cpu.getUsed();
/*
    tmp = JSON.stringify(Memory.rooms);
    cpustart = Game.cpu.getUsed();
    JSON.parse(tmp);
    console.log('parsing rooms costed '+(Game.cpu.getUsed()-cpustart).toFixed(4));
    */
    });
}
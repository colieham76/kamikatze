// Module to format data in memory for use with the https://screepspl.us
// Grafana utility run by ags131.
//
// Installation: Run a node script from https://github.com/ScreepsPlus/node-agent
// and configure your screepspl.us token and Screeps login (if you use Steam,
// you have to create a password on the Profile page in Screeps),
// then run that in the background (e.g., on Linode, AWS, your always-on Mac).
//
// Then, put whatever you want in Memory.stats, which will be collected every
// 15 seconds (yes, not every tick) by the above script and sent to screepspl.us.
// In this case, I call the collect_stats() routine below at the end of every
// trip through the main loop, with the absolute final call at the end of the
// main loop to update the final CPU usage.
//
// Then, configure a Grafana page (see example code) which graphs stuff whichever
// way you like.
//
// This module uses my resources module, which analyzes the state of affairs
// for every room you can see.


"use strict";
const resources = require('screepsmaster.resources');
const cb = require('screepsmaster.callback');

global.stats_callbacks = new cb.Callback();

// Tell us that you want a callback when we're collecting the stats.
// We will send you in the partially completed stats object.
function add_stats_callback(cbfunc) {
    global.stats_callbacks.subscribe(cbfunc);
}


// Update the Memory.stats with useful information for trend analysis and graphing.
// Also calls all registered stats callback functions before returning.
function collect_stats() {

    // Don't overwrite things if other modules are putting stuff into Memory.stats
    if (Memory.stats == null) {
        Memory.stats = { tick: Game.time };
    }
    Memory.stats.lastupdated = Game.time;

    // Note: This is fragile and will change if the Game.cpu API changes
    Memory.stats.cpu = Game.cpu;
    Memory.stats.start = Game.cpu.atstart;
    // Memory.stats.cpu.used = Game.cpu.getUsed(); // AT END OF MAIN LOOP

    // Note: This is fragile and will change if the Game.gcl API changes
    Memory.stats.gcl = Game.gcl;

    const memory_used = RawMemory.get().length;
    // console.log('Memory used: ' + memory_used);
    Memory.stats.memory = {
        used: memory_used,
        // Other memory stats here?
    };
    Memory.stats.market = Memory.stats.market || {};
    Memory.stats.market.credits = Game.market.credits;
    Memory.stats.market.num_orders = Game.market.orders ? Object.keys(Game.market.orders).length : 0;

    Memory.stats.roomSummary = resources.summarize_rooms();

    Memory.stats.size_creeps = _.size(Game.creeps);
    Memory.stats.size_whitelistrooms = _.size(Memory.whitelistrooms);
    Memory.stats.size_jobs = _.size(Memory.jobs.PICKUP_POWER)
                            +_.size(Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL)
                            +_.size(Memory.jobs.TRANSFER_MINERAL)
                            +_.size(Memory.jobs.TRANSFER_ENERGY)
                            +_.size(Memory.jobs.DISMANTLE_HARVEST_ENERGY)
                            +_.size(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE)
                            +_.size(Memory.jobs.UPGRADE_CONTROLLER);
    Memory.stats.size_jobs_pickup_power =           _.size(Memory.jobs.PICKUP_POWER);
    Memory.stats.size_jobs_energy_pickup_mineral =  _.size(Memory.jobs.PICKUP_ENERGY_PICKUP_MINERAL);
    Memory.stats.size_jobs_transfer_mineral =       _.size(Memory.jobs.TRANSFER_MINERAL);
    Memory.stats.size_jobs_transfer_energy =        _.size(Memory.jobs.TRANSFER_ENERGY);
    Memory.stats.size_jobs_dismantle_harvest_energy=_.size(Memory.jobs.DISMANTLE_HARVEST_ENERGY);
    Memory.stats.size_jobs_repair_structure_build_structure = 
                                                    _.size(Memory.jobs.REPAIR_STRUCTURE_BUILD_STRUCTURE);
    Memory.stats.size_jobs_upgrade_controller =     _.size(Memory.jobs.UPGRADE_CONTROLLER);
    Memory.stats.size_rooms = _.size(Game.rooms);
    Memory.stats.size_reserved = _.size(_.filter(Game.rooms,(r)=>r.controller && r.controller.reservation && r.controller.reservation.username == "KamiKatze"));
    for(let key in _.keys(Memory.stats.mycreeps.roleamount)) {
        let role = _.keys(Memory.stats.mycreeps.roleamount)[key];
        Memory.stats.mycpu.roleavg[role] = (Memory.stats.mycpu.role[role] / Memory.stats.mycreeps.roleamount[role]);
    }
    Memory.stats.cpu.memory = Game.cpu.memory;
    Memory.stats.energyInContainer = Memory.energyInContainer;
    Memory.stats.energylayingaround = Memory.energylayingaround;
    Memory.stats.terminals = Game.my.managers.terminals.getEmpire();
    Memory.stats.nodeTicksInARow = Memory.sourceManagerTicksInARow;
    // Add callback functions which we can call to add additional
    // statistics to here, and have a way to register them.
    // 1. Merge in the current repair ratchets into the room summary
    // TODO: Merge in the current creep desired numbers into the room summary
    global.stats_callbacks.fire(Memory.stats);
} // collect_stats

module.exports = {
    collect_stats,
    add_stats_callback,
};

"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');

const PICKUP_ENERGY         = 1;
const HARVEST_ENERGY        = 2;
const TRANSFER_ENERGY       = 3;
const REPAIR_STRUCTURE      = 4;
const BUILD_STRUCTURE       = 5;
const UPGRADE_CONTROLLER    = 6;
//const HARVEST_EXTRACTOR     = 7;
const TRANSFER_MINERAL      = 8;
const DISMANTLE             = 9;
const PICKUP_POWER          = 10;
//const HARVEST_INTO_CONTAINER= 11;
const PICKUP_MINERAL          = 12;

var terminalManager = {
    getEmpire: function() {
        let empire = {};
        let terminals = _.filter(Game.structures,s => s.structureType == STRUCTURE_TERMINAL);
        for (let key in terminals) {
            let terminal = terminals[key];
            for (let res in terminal.store) {
                empire[res] = empire[res] || 0;
                empire[res] += terminal.store[res];
            }
        }
        return empire;
    },
    status: function() {
        if (Memory.showTerminalStatus) {
            let empire = this.getEmpire();
            for(let res of _.keys(empire)) {
                console.log(empire[res]+"x "+res);
            }
        }
    },
    getAllTerminals: function() {
        if (typeof Game.my.managers.terminals.AllTerminals == "undefined") {
//            console.log('prefiltering, hopefully only once');
            Game.my.managers.terminals.AllTerminals = _.filter(Game.structures, s => s.structureType == STRUCTURE_TERMINAL && s.isActive());
        }
        return Game.my.managers.terminals.AllTerminals;
    },
    // Game.my.managers.terminals.buyEnergyInAllNonRCL8Rooms(100000,0.009);
    buyEnergyInAllNonRCL8Rooms: function(amount,price = 0.001){
        let terminals = this.getAllTerminals();
        for(let terminal of terminals) {
            if (terminal.room.controller.level < 8) {
                let result = Game.market.createOrder(ORDER_BUY,RESOURCE_ENERGY,price,amount,terminal.room.name);
                console.log("buyEnergyInAllNonRCL8Rooms > "+terminal.room.name+" > created order with result: "+result);
            }
        }
    },
    manage: function(room) {
        let debug = false;
        if(debug) console.log("Terminal Manager for room "+room);
        let terminal = Game.rooms[room].terminal;
        if (!terminal.isActive()) return false;
        let storage = Game.rooms[room].storage;

        // Create Sell orders for minerals which are floating
        // Goal: sell stuff
        let orders = {};
        for(let order in Game.market.orders) {
            order = Game.market.orders[order];
            if (order.roomName == room && order.active) {
                if (!orders[order.resourceType]) orders[order.resourceType] = [];
                orders[order.resourceType] = orders[order.resourceType].concat(new Array(order.id));
            }
        }
        for(let res in terminal.store)  {
            // sell 10k if we have more than 25k
            let donotsell = [
                RESOURCE_ENERGY,
                RESOURCE_POWER,
                RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
                RESOURCE_CATALYZED_UTRIUM_ACID,
                RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
                RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
                RESOURCE_CATALYZED_ZYNTHIUM_ACID
                ];
            if (donotsell.indexOf(res) === -1 && terminal.store[res] > 25000) {
                if (!orders[res] || orders[res].length < 1) {
                    // there isn't already a order
                    // or there are less or equal 1 orders
                    // find a good price
                    var currentMarketSituation =  Game.market.getAllOrders(o => o.resourceType == res && Game.map.getRoomLinearDistance(room,o.roomName) < 40 && o.type == ORDER_SELL);
                    let price = 1;
                    if (currentMarketSituation.length > 0) {
                        price = Math.max(_.sortBy(currentMarketSituation,c => c.price)[0].price,0.05);
                    }
                    let result = Game.market.createOrder(
                        ORDER_SELL,
                        res,
                        price,
                        10000,
                        room
                    );
                }
            }
        }
        // Try to soak Power to RCL8 room from non-RCL8-rooms
        // Goal: have sustainable power levels in for PowerSpawn
        if (terminal.room.controller.level == 8) {
            if (terminal.store[RESOURCE_POWER] < 5000) {
                let powerspawns = room.find(FIND_STRUCTURES, {filter: s => s.structureType === STRUCTURE_POWER_SPAWN && s.my});
                if (powerspawns.length > 0) {
                    let terminals = _.filter(this.getAllTerminals(),(s) => s.requestAvailableMineralAmount(RESOURCE_POWER) > 0 && s.room.controller.level != 8);
                    if (terminals.length > 0) {
                        let cheapestTerminal = false;
                        let cheapestPrice = false;
                        for(let remoteterminal in terminals) {
                            remoteterminal = terminals[remoteterminal];
                            let costs = Game.market.calcTransactionCost(5000,terminal.room.name,remoteterminal.room.name);
                            if (!cheapestTerminal || cheapestPrice > costs) {
                                cheapestTerminal = remoteterminal;
                                cheapestPrice = costs;
                            }
                        }
                        cheapestTerminal.send(RESOURCE_POWER,cheapestTerminal.requestAvailableMineralAmount(RESOURCE_POWER),room);
                    }
                }
            }
        }
        // Try to soak energy from another Terminal
        // Goal: have sustainable energy levels in terminal
        // soak energy from closest terminal of terminals which have > 80k energy
        if (terminal.store[RESOURCE_ENERGY] < 50000) {
            let terminals = _.filter(this.getAllTerminals(),(s) => s.store[RESOURCE_ENERGY] > 80000);
            if (terminals.length > 0) {
                let cheapestTerminal = false;
                let cheapestPrice = false;
                for(let remoteterminal in terminals) {
                    remoteterminal = terminals[remoteterminal];
                    let costs = Game.market.calcTransactionCost(25000,terminal.room.name,remoteterminal.room.name);
                    if (!cheapestTerminal || cheapestPrice > costs) {
                        cheapestTerminal = remoteterminal;
                        cheapestPrice = costs;
                    }
                }
                cheapestTerminal.send(RESOURCE_ENERGY,25000,room);
            }
        }
        // Push energy to Game.flags['TerminalEnergy'].room, so that room gets flooded :D
        // Goal: Fill that storage, so that this room is more rich.
        if (Game.flags['TerminalEnergy'] && Game.flags['TerminalEnergy'].pos.roomName == room && _.sum(Game.flags['TerminalEnergy'].room.terminal.store) < 200000) {
            
            let terminals = _.filter(this.getAllTerminals(),(s) => s.store[RESOURCE_ENERGY] > 80000);
            if (terminals.length > 0) {
                let richestTerminal = false;
                let richestAmount = false;
                for(let remoteterminal in terminals) {
                    remoteterminal = terminals[remoteterminal];
                    if (!richestTerminal || richestAmount < remoteterminal.store[RESOURCE_ENERGY]) {
                        richestTerminal = remoteterminal;
                        richestAmount = remoteterminal.store[RESOURCE_ENERGY];
                    }
                }
                richestTerminal.send(RESOURCE_ENERGY,25000,room);
            }
        }
        // Push energy to Game.flags['focusUpgradingOnlyHere'].room, so push that upgrading
        // Goal: Fill that storage, so that more upgraders are produced.
        if (Game.flags['focusUpgradingOnlyHere'] && Game.flags['focusUpgradingOnlyHere'].pos.roomName != room) {
            if (terminal.store[RESOURCE_ENERGY] > 80000 && _.sum(Game.flags['focusUpgradingOnlyHere'].room.terminal.store) < 200000) {
                terminal.send(RESOURCE_ENERGY,25000,Game.flags['focusUpgradingOnlyHere'].pos.roomName);
            }
        }

        // Push energy to poorest Terminal, if I'm totally rich...
        // Goal: Fill that storage, so that more upgraders are produced.
        if (terminal.store[RESOURCE_ENERGY] > 200000 || (terminal.store[RESOURCE_ENERGY] > 80000 && _.sum(storage.store) > 800000)) {
            let terminals = _.filter(this.getAllTerminals(),(s) => s.store[RESOURCE_ENERGY] < 175000 && s.room.name != room);
            console.log('terminal manager > '+terminal.room.name+' > is rich, found '+terminals.length+' poor terminals');
            if (terminals.length > 0) {
                let poorestTerminal = false;
                let poorestAmount = false;
                for(let remoteterminal in terminals) {
                    remoteterminal = terminals[remoteterminal];
                    if (!poorestTerminal || poorestAmount > (remoteterminal.store[RESOURCE_ENERGY] + remoteterminal.room.storage[RESOURCE_ENERGY])) {
                        poorestTerminal = remoteterminal;
                        poorestAmount = (remoteterminal.store[RESOURCE_ENERGY] + remoteterminal.room.storage[RESOURCE_ENERGY]);
                    }
                }
                let result = terminal.send(RESOURCE_ENERGY,25000,poorestTerminal.room.name);
                console.log('terminal manager > '+terminal.room.name+' > is rich, sent 25k to '+poorestTerminal.room.name+' with result '+result);
            }
        }
        // Create Buy orders for energy which if missing
        // Goal: have sustainable energy levels in terminal
        // buy 20k if we have less than 40k
        if (terminal.store[RESOURCE_ENERGY] < 40000) {
            if (!orders[RESOURCE_ENERGY] || orders[RESOURCE_ENERGY].length == 0) {
                // there isn't already a order
                // find a good price
                var currentMarketSituation =  Game.market.getAllOrders(o => o.resourceType == RESOURCE_ENERGY && Game.map.getRoomLinearDistance(room,o.roomName) < 40 && o.type == ORDER_BUY);
                let price = 0.01;
                if (currentMarketSituation.length > 0) {
                    price = Math.max(Math.min(_.sortBy(currentMarketSituation,c => c.price)[currentMarketSituation.length-1].price+0.01,Memory.myEnergyPrice-0.01),0.01);
                }
                let result = Game.market.createOrder(
                    ORDER_BUY,
                    RESOURCE_ENERGY,
                    price,
                    20000,
                    room
                );
                Game.notify("Master, Terminal of "+room+" just created a buyorder for "+price+" c / Energy because of terminal: "+terminal.store[RESOURCE_ENERGY]+" and storage: "+storage.store[RESOURCE_ENERGY]);
            }
        }
        
        // activate Orders
        if (Game.time % 10 == 0) {
            let inactiveorders = _.filter(Game.market.orders, o => o.type == ORDER_SELL && !o.active && o.roomName == room);
            for(let key in inactiveorders) {
                let order = inactiveorders[key];
                let sender = _.filter(Game.structures, (s) => s.structureType == STRUCTURE_TERMINAL && s.requestAvailableMineralAmount(order.resourceType) > 0);
                console.log("terminal manager > "+terminal.pos.roomName+" > looking for "+order.resourceType+" in global terminals... found: "+sender.length);
                for(let send of sender) {
                    console.log("terminal manager > "+terminal.pos.roomName+" > "+order.resourceType+" will be sent from "+send.room.name);
                    if (send.send(order.resourceType,Math.min(3000,send.requestAvailableMineralAmount(order.resourceType)),terminal.pos.roomName) == OK) {
                        break;
                    }
                }
            }
        }

        // request Minerals from Terminal if Terminal is full to avoid clogging
        // request Minerals which have atleast 10k in Storage.
        // Goal: free up Terminals.
        if (_.sum(terminal.store) > 250000 && _.sum(storage.store) < 500000) {
            if (debug) console.log("terminal is full");
            for(let res in terminal.store)  {
                if (res != RESOURCE_ENERGY && terminal.store[res] > 10000) {
                    Game.my.managers.jobFinder.addJobIfNotExists(TRANSFER_MINERAL,storage.pos.roomName,storage.pos.x,storage.pos.y,storage.id,res);
                    Game.my.managers.jobFinder.addJobIfNotExists(PICKUP_MINERAL,terminal.pos.roomName,terminal.pos.x,terminal.pos.y,terminal.id,res);
                }
            }
        }
    }
}
profiler.registerObject(terminalManager,'terminalManager');
module.exports = terminalManager;
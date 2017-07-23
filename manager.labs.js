"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');

global.RECIPES = {};
for(let a in REACTIONS){
    for(let b in REACTIONS[a]){
        RECIPES[REACTIONS[a][b]] = [a,b];
    }
}

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
const GET_BOOSTED          = 13;

var labsManager = {
    /** @param {Creep} creep **/
    labconfig: {
        "W87S62": [
            {
                "produce": RESOURCE_HYDROXIDE,
                "input1": "5962e700a0634a3b33bc606d",
                "input2": "5962da350dc02572201278a0",
                "output": "59232eacc7f65dd345dbc2fb",
            },{
                "produce": RESOURCE_HYDROXIDE,
                "input1": "5962e700a0634a3b33bc606d",
                "input2": "5962da350dc02572201278a0",
                "output": "590fa3c1dde49a043c10f2a5",
            },{
                "produce": RESOURCE_ZYNTHIUM_OXIDE,
                "input1": "5922f42df8fc2d7749c71197",
                "input2": "5922ca15a8b73807694be1d8",
                "output": "590f3e42e9c844515ddfd3f5",
            },{
                "produce": RESOURCE_ZYNTHIUM_ALKALIDE,
                "input1": "590f3e42e9c844515ddfd3f5",
                "input2": "590fa3c1dde49a043c10f2a5",
                "output": "590fb7068fd807f50e54ba5e",
            },{
                "produce": RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                "input1": "590fb7068fd807f50e54ba5e",
                "input2": "5962d4adcc94464f6bae4bf2",
                "output": "5962fb084e520a22509a98df",
            }
        ],
        "W88S65": [
            {
                "produce": RESOURCE_LEMERGIUM_OXIDE,
                "input1": "59177241c14f17574b8da688",
                "input2": "5917521e5983d94c8a53f45a",
                "output": "59178ca54293836acee14edd",
            },{
                "produce": RESOURCE_LEMERGIUM_ALKALIDE,
                "input1": "59178ca54293836acee14edd",
                "input2": "592a6bc894b80659223138d1",
                "output": "592b0e6382a66f7f18cddabd",
            },{
                "produce": RESOURCE_LEMERGIUM_ALKALIDE,
                "input1": "59178ca54293836acee14edd",
                "input2": "592a6bc894b80659223138d1",
                "output": "592b93b3ee6776553c7f3c30",
            }
        ],
        "W89S62": [
            {
                "produce": 'market',
                "input1": "591934b73ecded7e17de6dbe",
                "input2": "59197d79ef02cd6cbb3cc9e0",
                "output": "591917b1de1d431c68ad9afb",
            }
        ],
        "W88S68": [
            {
                "produce": RESOURCE_CATALYZED_LEMERGIUM_ALKALIDE,
                "input1": "591cb021a4dbc7d87aaa4815",
                "input2": "591d0e8f155f6509b3081f67",
                "output": "594722b38773a1b62a93c76e",
            },{
                "produce": RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
                "input1": "591d58c0c6d5a3cb11a62578",
                "input2": "591d0e8f155f6509b3081f67",
                "output": "59248bb719b1d8bb4eeaaf0a",
            },{
                "produce": RESOURCE_CATALYZED_UTRIUM_ACID,
                "input1": "-",
                "input2": "-",
                "output": "594735f4abdc1ef202440ba8",
            },{
                "produce": RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
                "input1": "-",
                "input2": "-",
                "output": "594706e61a986f573d713b4f",
            },{
                "produce": RESOURCE_CATALYZED_ZYNTHIUM_ACID,
                "input1": "-",
                "input2": "-",
                "output": "59242b399f3a89a22a6b4b77",
            },{
                "produce": RESOURCE_CATALYZED_ZYNTHIUM_ALKALIDE,
                "input1": "-",
                "input2": "-",
                "output": "5923311c7647300c16b41204",
            },{
                "produce": RESOURCE_CATALYZED_GHODIUM_ALKALIDE,
                "input1": "-",
                "input2": "-",
                "output": "5946e0b27e2f8f3d494bb84b",
            }
        ],
        "W82S69": [
            {
                "produce": RESOURCE_HYDROXIDE,
                "input1": "593b8da43fc6da362aa1e308",
                "input2": "593ad351b4941c6b50ae5f9a",
                "output": "593a9dd8b0a918aa5611ec7b",
            }
        ],
        "W88S61": [
            {
                "produce": RESOURCE_HYDROXIDE,
                "input1": "590f7fd273da7b516f5eaff4",
                "input2": "590f397636341bb21ddeebdf",
                "output": "590fa5b518bee6594cbb4da0",
            },{
                "produce": RESOURCE_HYDROXIDE,
                "input1": "590f7fd273da7b516f5eaff4",
                "input2": "590f397636341bb21ddeebdf",
                "output": "591be8fb5f0645687af3774a",
            },{
                "produce": RESOURCE_KEANIUM_OXIDE,
                "input1": "593f185dfce8e1685129642e",
                "input2": "593f27f8a24fd7db2e134bb4",
                "output": "593f3851979be72d4756aa65",
            },{
                "produce": RESOURCE_KEANIUM_ALKALIDE,
                "input1": "593f3851979be72d4756aa65",
                "input2": "590fa5b518bee6594cbb4da0",
                "output": "593f082ab38a734ab36120bd",
            },{
                "produce": RESOURCE_CATALYZED_KEANIUM_ALKALIDE,
                "input1": "593f082ab38a734ab36120bd",
                "input2": "591bf6a48d8cd71429064168",
                "output": "591c027a362510e65161c955",
            }
        ],
        "W86S63": [
            {
                "produce": RESOURCE_KEANIUM_ALKALIDE,
                "input1": "5918451dd5e88c58768c4d9c",
                "input2": "59183ad918eecf2858165beb",
                "output": "5918355a72f87dcd2600043f",
            },{
                "produce": RESOURCE_LEMERGIUM_ALKALIDE,
                "input1": "-",
                "input2": "-",
                "output": "59249dc2a735eb5b22f19e0a",
            },{
                "produce": RESOURCE_KEANIUM_ACID,
                "input1": "-",
                "input2": "-",
                "output": "59248ea9415f51c42d46d587",
            },{
                "produce": RESOURCE_ZYNTHIUM_ALKALIDE,
                "input1": "-",
                "input2": "-",
                "output": "592481573904e7002a8ecc16",
            }
        ]
    },
    getMineral: function(terminal, mineral, maxprice = false, debug = false) {
        if (!maxprice) {
            maxprice = 0.5;
        }
        let flag = false;
        let buystuff = false;
        terminal.registerNeededMineral(mineral);
        if (!terminal.store[mineral] || terminal.store[mineral] < 3000) {
            // move mineral from different terminal to here
            let start = Game.cpu.getUsed();
            let sender = _.filter(Game.my.managers.terminals.getAllTerminals(), (s) => s.requestAvailableMineralAmount(mineral) > 0);
//            console.log("filtering structures costed "+(Game.cpu.getUsed()-start).toFixed(4));
            if (debug) console.log("lab manager > "+terminal.pos.roomName+" > looking for "+mineral+" in global terminals... found: "+sender.length);
            if (sender.length > 0) {
                if (sender[0].send(mineral,Math.max(3000,sender[0].requestAvailableMineralAmount(mineral)),terminal.pos.roomName) == OK) {
                    flag = true;
                }
            }
            if (!flag && buystuff) {
                let orders = {};
                for(let order in Game.market.orders) {
                    order = Game.market.orders[order];
                    if (order.roomName == terminal.pos.roomName) {
                        if (!orders[order.resourceType]) orders[order.resourceType] = [];
                        orders[order.resourceType] = orders[order.resourceType].concat(new Array(order.id));
                    }
                    if (order.type == ORDER_SELL && order.resourceType == mineral) {
                        maxprice = Math.min(maxprice,order.price);
                    }
                }
                if (!orders[mineral] || orders[mineral].length < 1) {
                    let currentMarketSituation =  Game.market.getAllOrders(o => o.resourceType == mineral && Game.map.getRoomLinearDistance(terminal.pos.roomName,o.roomName) < 40 && o.type == ORDER_BUY);
                    let price = 0.01;
                    if (currentMarketSituation.length > 0) {
                        price = Math.min(_.sortBy(currentMarketSituation,c => c.price)[currentMarketSituation.length-1].price+0.01,maxprice);
                    }
                    let result = Game.market.createOrder(
                        ORDER_BUY,
                        mineral,
                        price,
                        10000,
                        terminal.pos.roomName
                    );
                }
            }
        } else {
            flag = true;
        }
        return flag;
    },
    manage: function(jobFinder) {
        if (!Memory.bucketmanager.lasts || Game.time - Memory.bucketmanager.lasts.labs < 10) {
            return false;
        }
        Memory.bucketmanager.lasts.labs = Game.time;
        let debug = true;
        mydebugger.enable({name: 'labManager.manage'});
        let producing = [];
        for(let room in this.labconfig) {
            if (Game.rooms[room]) {
                for(let key in this.labconfig[room]) {
                    if (this.labconfig[room][key].produce != 'market') {
                        producing.push(this.labconfig[room][key].produce);
                    }
                }
            }
        }
        for(let room in this.labconfig) {
            if (Game.rooms[room] && Game.rooms[room].isMineClaimed()) {
                for(let key in this.labconfig[room]) {
                    // create jobs
                    let maxprice = false;
                    let output = Game.getObjectById(this.labconfig[room][key].output);
                    let input1 = Game.getObjectById(this.labconfig[room][key].input1);
                    let input2 = Game.getObjectById(this.labconfig[room][key].input2);
                    if(input1 && input1.room.name != room) {
                        console.log("there is an error in the LabConfig...");
                        console.log("configured room: "+room);
                        console.log("configured input1lab: "+input1.pos);
                    }
                    if(input2 && input2.room.name != room) {
                        console.log("there is an error in the LabConfig...");
                        console.log("configured room: "+room);
                        console.log("configured input2lab: "+input2.pos);
                    }
                    if(output && output.room.name != room) {
                        console.log("there is an error in the LabConfig...");
                        console.log("configured room: "+room);
                        console.log("configured outputlab: "+input1.pos);
                    }
                    let produce = this.labconfig[room][key].produce;
                    
                    if (produce == 'market' && Game.cpu.bucket > 2000) { 
                        if (output.mineralType) {
                            produce = output.mineralType;
                        } else {
                            let pots = _.max(_.filter(Game.market.orders, o => o.type == ORDER_SELL && !o.active && producing.indexOf(o.resourceType) == -1), o => o.price);
                            if (pots) {
                                produce = pots.resourceType;
    
    //                            console.log(room+' > producing '+produce);
                                maxprice = pots.price / 4;
                            }
                        }
                        this.labconfig[room][key].produce = produce;
                        producing.push(produce);
                    }
                    if (RECIPES[produce]) {
                        let input1Mineral = RECIPES[produce][0];
                        let input2Mineral = RECIPES[produce][1];
                        let terminal = cachedSearch.terminalOfRoom(room);
                        let storage = cachedSearch.storageOfRoom(room);
                        mydebugger.str("lab manager > "+room+" > producing "+this.labconfig[room][key].produce);
                        let doit = true;
                        if (input1) {
                            if (input1.mineralType && input1.mineralType != input1Mineral) {
                                console.log("lab manager > "+room+" > "+produce+" > input1 is broken");
                                jobFinder.addJobIfNotExists(PICKUP_MINERAL,input1.pos.roomName,input1.pos.x,input1.pos.y,input1.id,'all');
                                doit = false;
                            }
                        }
                        if (input2) {
                            if (input2.mineralType && input2.mineralType != input2Mineral) {
                                console.log("lab manager > "+room+" > "+produce+" > input2 is broken");
                                jobFinder.addJobIfNotExists(PICKUP_MINERAL,input2.pos.roomName,input2.pos.x,input2.pos.y,input2.id,'all');
                                doit = false;
                            }
                        }
                        if (output && output.mineralType && output.mineralType != produce) {
                            console.log("lab manager > "+room+" > "+produce+" > output is broken");
                            jobFinder.addJobIfNotExists(PICKUP_MINERAL,output.pos.roomName,output.pos.x,output.pos.y,output.id,'all');
                            doit = false;
                        }
                        if (doit) {
                            if (input1 && input1.mineralAmount < input1.mineralCapacity * 0.5) {
                                mydebugger.str("lab manager > "+room+" > "+produce+" > lab1 > mineral "+input1Mineral+" needed");
                                let flag = this.getMineral(terminal,input1Mineral,maxprice,debug);
                                mydebugger.str("lab manager > "+room+" > "+produce+" > lab1 > mineral "+input1Mineral+" found: "+flag);
                                if (flag) {
                                    mydebugger.str("lab manager > "+room+" > lab1 > created pickup mineral job for terminal");
                                    jobFinder.addJobIfNotExists(PICKUP_MINERAL,terminal.pos.roomName,terminal.pos.x,terminal.pos.y,terminal.id,input1Mineral);
                                }
                                if (storage.store[input1Mineral] > 0) {
                                    mydebugger.str("lab manager > "+room+" > "+produce+" > lab1 > created pickup mineral job for storage");
                                    jobFinder.addJobIfNotExists(PICKUP_MINERAL,storage.pos.roomName,storage.pos.x,storage.pos.y,storage.id,input1Mineral);
                                } else {
                                    mydebugger.str("lab manager > "+room+" > "+produce+" > lab1 > storage does not have "+input1Mineral);
                                }
                                jobFinder.addJobIfNotExists(TRANSFER_MINERAL,input1.pos.roomName,input1.pos.x,input1.pos.y,input1.id,input1Mineral);
                            }
                            if (input2 && input2.mineralAmount < input2.mineralCapacity * 0.5) {
                                mydebugger.str("lab manager > "+room+" > "+produce+" > lab2 > mineral "+input2Mineral+" needed");
                                let flag = this.getMineral(terminal,input2Mineral,maxprice,debug);
                                mydebugger.str("lab manager > "+room+" > "+produce+" > lab2 > mineral "+input2Mineral+" found: "+flag);
                                if (flag) {
                                    mydebugger.str("lab manager > "+room+" > "+produce+" > lab2 > created pickup mineral job for terminal");
                                    jobFinder.addJobIfNotExists(PICKUP_MINERAL,terminal.pos.roomName,terminal.pos.x,terminal.pos.y,terminal.id,input2Mineral);
                                }
                                if (storage.store[input2Mineral] > 0) {
                                    mydebugger.str("lab manager > "+room+" > "+produce+" > lab2 > created pickup mineral job for storage");
                                    jobFinder.addJobIfNotExists(PICKUP_MINERAL,storage.pos.roomName,storage.pos.x,storage.pos.y,storage.id,input2Mineral);
                                } else {
                                    mydebugger.str("lab manager > "+room+" > "+produce+" > lab2 > storage does not have "+input2Mineral);
                                }
                                jobFinder.addJobIfNotExists(TRANSFER_MINERAL,input2.pos.roomName,input2.pos.x,input2.pos.y,input2.id,input2Mineral);
                            }
                            if (output.energy < output.energyCapacity * 0.75) {
                                jobFinder.addJobIfNotExists(TRANSFER_ENERGY,output.pos.roomName,output.pos.x,output.pos.y,output.id,50000);
                            }
                            if (input1) input1.room.visual.text(input1Mineral,input1.pos.x,input1.pos.y,{font: "bold 0.7", opacity: 0.3, color: 'darkred'});
                            if (input2) input2.room.visual.text(input2Mineral,input2.pos.x,input2.pos.y,{font: "bold 0.7", opacity: 0.3, color: 'darkred'});
                            if (output) output.room.visual.text(produce,output.pos.x,output.pos.y,{font: "bold 0.7", opacity: 0.3, color: 'limegreen'});
                            if (input1 && input2 && input1.mineralAmount > LAB_REACTION_AMOUNT && input2.mineralAmount > LAB_REACTION_AMOUNT && output.cooldown == 0) {
                                let result = output.runReaction(input1,input2);
                                mydebugger.str("lab manager > "+room+" > "+produce+" > output > result "+result);
                            }
                        }
                        if (produce == RESOURCE_KEANIUM_HYDRIDE || produce == RESOURCE_KEANIUM_ACID) {
                            if (output.mineralAmount > 1000 && output.energy > 1000) {
                                jobFinder.addJobIfNotExists(GET_BOOSTED,output.pos.roomName,output.pos.x,output.pos.y,output.id,produce);
                            }
                        }
                        if (output.mineralType == produce) {
                            if ((input1 && input2 && output.mineralAmount < 1000) || (!input1 && !input2 && output.mineralAmount < 2000)) {
                                let jobkey = jobFinder.addJobIfNotExists(TRANSFER_MINERAL,output.pos.roomName,output.pos.x,output.pos.y,output.id,produce);
                                Memory.jobs.TRANSFER_MINERAL[jobkey].meta2 = produce;
//                                console.log("lab manager > "+room+" > "+produce+" > output > created job to bring "+produce+" here");
                                if (!input1 && !input2) {
                                    // this is just a boosting output, we need to get the boosts somewhere
                                    let flag = this.getMineral(terminal,produce,maxprice,debug);
                                    mydebugger.str("lab manager > "+room+" > "+produce+" > output > mineral "+produce+" found: "+flag);
                                    if (flag) {
                                        mydebugger.str("lab manager > "+room+" > "+produce+" > output > created pickup mineral job for terminal");
                                        jobFinder.addJobIfNotExists(PICKUP_MINERAL,terminal.pos.roomName,terminal.pos.x,terminal.pos.y,terminal.id,produce);
                                    }
                                }
                            }
                        }
                        output.addToTransportertargets();
                        if (input1 && input2 && output.mineralAmount > 2000) {
                            jobFinder.addJobIfNotExists(PICKUP_MINERAL,output.pos.roomName,output.pos.x,output.pos.y,output.id,output.mineralType);
                        }
                    }
                }
            }
        }
        Memory.labdebug = mydebugger.getStr()
        mydebugger.end(debug);
    }
}
profiler.registerObject(labsManager,'labsManager');
module.exports = labsManager;
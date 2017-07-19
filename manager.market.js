"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');
var cachedSearch = require('cachedSearch');

var marketManager = {
    /** @param {Creep} creep **/
    status: function() {
        console.log("Marketorders: "+_.keys(Game.market.orders).length+" / 50");
        if (Memory.showMarketStatus || Game.time % 5000 === 1) {
            console.log(' --- MARKET --- ');
            //let sorted = _.sortBy(Game.market.orders, ['type', 'resourceType', 'price']);
            let total_buy = 0;
            let total_sell = 0;
            let active_buy = 0;
            let active_sell = 0;
            let sorted = _.sortByAll(Game.market.orders, ['type', 'resourceType', 'price']);
            for(let order in sorted) {
                order = sorted[order];
                if (    
                       (order.remainingAmount <= Math.ceil(order.totalAmount*0.01) && order.totalAmount > 10) 
                    || (order.roomName && !Game.rooms[order.roomName].isMineClaimed()) 
                    || (order.type == ORDER_SELL && order.price < 0.05 && [RESOURCE_ENERGY].indexOf(order.resourceType) === -1)
                ) {
                    Game.market.cancelOrder(order.id);
                    let notification = "";
                    notification += "Master, i canceled an order: \n";
                    notification += "resourceType: " + order.resourceType+"\n";
                    notification += "orderType: " + order.type+"\n";
                    notification += "roomName: " + order.roomName+"\n";
                    notification += "remainingAmount: "+order.remainingAmount+"\n";
                    notification += "totalAmount: "+order.totalAmount+"\n";
                    notification += "price: "+order.price;
                    Game.notify(notification);
                } else {
    //                if (order.type == "buy" && order.resouceType == RESOURCE_ENERGY)
                    if (order.resourceType == SUBSCRIPTION_TOKEN) {
                        continue;
                    }
                    let color = 'FF0000';
                    if (order.active) 
                        color = '12ba00';
                    console.log('<span style="color:#'+color+'">Terminal of '+order.roomName+" "+order.type+"s "+order.remainingAmount+"/"+order.totalAmount+" "+order.resourceType+" for "+order.price+"c");
                    if (order.type == ORDER_BUY)
                        total_buy += (order.remainingAmount*order.price);
                    else
                        total_sell += (order.remainingAmount*order.price);
                    if (order.active) {
                        if (order.type == ORDER_BUY)
                            active_buy += (order.remainingAmount*order.price);
                        else
                            active_sell += (order.remainingAmount*order.price);
                    }
                }
            }
            console.log('bound credits in buy-orders: '+active_buy.toFixed(2)+"/"+total_buy.toFixed(2)+" ("+((active_buy/total_buy)*100).toFixed(2)+" %)");
            console.log('incoming credits in sell-orders: '+active_sell.toFixed(2)+"/"+total_sell.toFixed(2)+" ("+((active_sell/total_sell)*100).toFixed(2)+" %)");
            console.log('... Outgoing ... ');
            let orders = _.filter(Game.market.outgoingTransactions, o => o.time > Game.time - 100);
//            let orders = _.filter(Game.market.outgoingTransactions, o => o.resourceType == RESOURCE_LEMERGIUM_HYDRIDE);
            for(let order of orders) {
                if (order.order) {
                    if (order.recipient) {
                        console.log((Game.time-order.time)+" ticks ago: transaction "+order.amount+"x "+order.resourceType+" sold for "+order.order.price+"c to "+order.recipient.username);
                    } else {
                        console.log((Game.time-order.time)+" ticks ago: transaction "+order.amount+"x "+order.resourceType+" sold for "+order.order.price+"c to unknown");
                    }
                } else
                    console.log((Game.time-order.time)+" ticks ago: transaction "+order.amount+"x "+order.resourceType+" received from "+order.from+" to "+order.to);
            }
            console.log('... Incoming ... ');
            orders = _.filter(Game.market.incomingTransactions, o => o.time > Game.time - 100);
//            orders = _.filter(Game.market.incomingTransactions, o => o.resourceType == RESOURCE_LEMERGIUM_HYDRIDE);
            for(let order of orders) {
                if (order.order)
                    console.log((Game.time-order.time)+" ticks ago: transaction "+order.amount+"x "+order.resourceType+" bought for "+order.order.price+"c from "+order.sender.username);
                else
                    console.log((Game.time-order.time)+" ticks ago: transaction "+order.amount+"x "+order.resourceType+" send to "+order.to+" from "+order.from);
            }
        }
    },
    getStats: function() {
        Memory.stats.market = Memory.stats.market || {};
        Memory.stats.market.buy = Memory.stats.market.buy || {};
        Memory.stats.market.buy.avg = Memory.stats.market.buy.avg || {};
        Memory.stats.market.sell = Memory.stats.market.sell || {};
        Memory.stats.market.sell.avg = Memory.stats.market.sell.avg || {};
        for (let res of RESOURCES_ALL) {
            let orders =  Game.market.getAllOrders(
                   order => order.resourceType == res 
                && order.type == ORDER_BUY 
                && Game.map.getRoomLinearDistance("E76S21",order.roomName) < 40
            );
            if (orders.length > 0) {
                _.sortByOrder(orders, 'price','desc');
                let total_amount = 0;
                let total_value = 0;
                for (let order of orders) {
                    total_amount += order.amount;
                    total_value += order.price * order.amount;
                    if (total_amount >= 10000) {
                        break;
                    }
                }
                let avg = total_value / total_amount;
                console.log(res+" has a buy avg of "+avg.toFixed(2));
                Memory.stats.market.buy.avg[res] = avg;
            } else {
                Memory.stats.market.buy.avg[res] = -1;
            }
            orders =  Game.market.getAllOrders(
                   order => order.resourceType == res 
                && order.type == ORDER_SELL 
                && Game.map.getRoomLinearDistance(Game.spawns['Spawn1'].room.name,order.roomName) < 40
            );
            if (orders.length > 0) {
                _.sortByOrder(orders, 'price','asc');
                let total_amount = 0;
                let total_value = 0;
                for (let order of orders) {
                    total_amount += order.amount;
                    total_value += order.price * order.amount;
                    if (total_amount >= 10000) {
                        break;
                    }
                }
                let avg = total_value / total_amount;
                console.log(res+" has a sell avg of "+avg.toFixed(2));
                Memory.stats.market.sell.avg[res] = avg;
            } else {
                Memory.stats.market.sell.avg[res] = -1;
            }
        }
    },
    manageAllRooms: function() {
        let result = [];
        for(let roomName in Game.rooms) {
            result = result.concat(this.manage(roomName));
        }
        this.adjustprices();
        let pot = [
            RESOURCE_UTRIUM_HYDRIDE,
            RESOURCE_UTRIUM_OXIDE,
            RESOURCE_KEANIUM_HYDRIDE,
            RESOURCE_KEANIUM_OXIDE,
            RESOURCE_LEMERGIUM_HYDRIDE,
            RESOURCE_LEMERGIUM_OXIDE,
            RESOURCE_ZYNTHIUM_HYDRIDE,
            RESOURCE_ZYNTHIUM_OXIDE,
            RESOURCE_GHODIUM_HYDRIDE,
            RESOURCE_GHODIUM_OXIDE,
            RESOURCE_UTRIUM_ACID,
            RESOURCE_UTRIUM_ALKALIDE,
            RESOURCE_KEANIUM_ACID,
            RESOURCE_KEANIUM_ALKALIDE,
            RESOURCE_LEMERGIUM_ACID,
            RESOURCE_LEMERGIUM_ALKALIDE,
            RESOURCE_ZYNTHIUM_ACID,
            RESOURCE_ZYNTHIUM_ALKALIDE,
            RESOURCE_GHODIUM_ACID,
            RESOURCE_GHODIUM_ALKALIDE
        ];
        let start = Game.cpu.getUsed();
        for(let produce of pot) {
            console.log('checking '+JSON.stringify(produce));
            let input1Mineral = RECIPES[produce][0];
            let input2Mineral = RECIPES[produce][1];
            let input1offers = Game.market.getAllOrders({type: ORDER_SELL, resourceType: input1Mineral});
            let input2offers = Game.market.getAllOrders({type: ORDER_SELL, resourceType: input2Mineral});
            let outputoffers = Game.market.getAllOrders({type: ORDER_BUY, resourceType: produce});
            if (input1offers.length > 0 && input2offers.length > 0 && outputoffers.length > 0) {
                let input1price = _.min(_.filter(input1offers,o => o.amount > 5000),o => o.price);
                let input2price = _.min(_.filter(input2offers,o => o.amount > 5000),o => o.price);
                let outputprice = _.max(_.filter(outputoffers,o => o.amount > 5000),o => o.price);
                if (input1price.price + input2price.price < outputprice.price) {
                    console.log('ignoring energy transfercosts I could trade this:');
                    console.log('buy '+input1price.resourceType+' for '+input1price.price);
                    console.log('buy '+input2price.resourceType+' for '+input2price.price);
                    console.log('sell '+outputprice.resourceType+' for '+outputprice.price);
                } else {
                    console.log('not worth it...');
                }
            } else {
                console.log('not possible it...');
                let outputsold = Game.market.getAllOrders({type: ORDER_SELL, resourceType: produce});
                let outputsoldprice = _.min(outputsold,o => o.price);
                if (outputsoldprice.price > 0.04) {
                    console.log('I could create a buy / sell order combo right now, buying for 0.01 and selling for:');
                    console.log('sell '+outputsoldprice.resourceType+' for '+outputsoldprice.price);
                    if (_.filter(Game.market.orders, o => o.type == ORDER_SELL && o.active && o.resourceType == outputsoldprice.resourceType && o.roomName == Memory.marketroom).length == 0) {
                        // only create new arbitrage orders if the sell order is either 
                        // -> not active - we need to buy more
                        // -> not existant - we need to create both
                        this.createOrderIfNotExists(ORDER_BUY, outputsoldprice.resourceType, 0.01, 10000, Memory.marketroom);
                        this.createOrderIfNotExists(ORDER_SELL, outputsoldprice.resourceType, outputsoldprice.price / 2, 10000, Memory.marketroom);
                    }
                } else {
                    console.log('I could create a buy / sell order combo right now, but there is already a 0.04 or lower sell order...');
                }
            }
        }
        console.log('checking all this stuff costed '+(Game.cpu.getUsed()-start).toFixed(3));
//        Memory.MarketManagerResult = result;
    },
    createOrderIfNotExists: function(orderType, resourceType, price, totalAmount, roomName) {
        if (_.filter(Game.market.orders, o => o.type == orderType && o.resourceType == resourceType && o.roomName == roomName).length == 0) {
            console.log("I will create a buy order");
            Game.market.createOrder(orderType, resourceType, price, totalAmount, roomName);
        } else {
            console.log("there is already a buy order, so I don't do anything...");
        }
        
    },
    adjustprices: function() {
        let orders = _.filter(Game.market.orders, o => o.type == ORDER_SELL && o.price > 0.05 && o.active);
        for(let key in orders) {
            let order = orders[key];
            Memory.market[order.id] = Memory.market[order.id] || Game.time;
            if (Game.time - Memory.market[order.id] > 2000) {
                let newprice = Math.max(order.price-0.01,0.05).toFixed(2);
//                Game.notify("Master, I reduce the price of order "+order.resourceType+" to "+newprice);
                Memory.market[order.id] = Game.time;
                Game.market.changeOrderPrice(order.id,newprice);
            }
        }
        orders = _.filter(Game.market.orders, o => o.type == ORDER_BUY && o.price < 1.00 && o.active);
        for(let key in orders) {
            let order = orders[key];
            Memory.market[order.id] = Memory.market[order.id] || Game.time;
            if (Game.time - Memory.market[order.id] > 2000) {
                // maybe this is an arbitrage trade... then we should not increase the buy-price
                if (_.filter(Game.market.orders, o => o.type == ORDER_SELL && o.resourceType == order.resourceType && o.roomName == order.roomName).length == 0) {
                    let newprice = Math.min(order.price+0.01,1.00).toFixed(2);
//                    Game.notify("Master, I increase the price of order "+order.resourceType+" to "+newprice);
                    Memory.market[order.id] = Game.time;
                    Game.market.changeOrderPrice(order.id,newprice);
                }
            }
        }
    },
    manage: function(roomName) {
        var result = new Array();
        result = result.concat(this.sell(roomName));
//        result = result.concat(this.buy(roomName,RESOURCE_ENERGY));
        return result;
    },
    sell: function(roomName) {
        mydebugger.enable({name: 'manageMarket '+roomName});
        var myreturn = new Array(roomName);
        var terminal = cachedSearch.terminalOfRoom(roomName);
        if(typeof terminal != "undefined") {
            for (let resource in terminal.store){
//                if (resource != RESOURCE_ENERGY && resource != RESOURCE_OXYGEN && resource != RESOURCE_KEANIUM && terminal.store[resource] > 1000) {
                if (resource != RESOURCE_ENERGY && terminal.store[resource] > 25000) {
                    var orders =  Game.market.getAllOrders(order => order.resourceType == resource && 
                        order.type == ORDER_BUY && 
                        Game.market.calcTransactionCost(Math.min(order.remainingAmount,(terminal.store[resource]-10000)), terminal.room.name, order.roomName) < terminal.store[RESOURCE_ENERGY]);
                        myreturn = myreturn.concat(new Array(roomName+"'s Terminal found "+orders.length+" Market Orders for resource "+resource));
                    let deal = false;
                    for (let order in orders) {
                        order = orders[order];
                        var amount = Math.min(order.remainingAmount,(terminal.store[resource]-10000));
                        var transfercost =  Game.market.calcTransactionCost(amount, terminal.room.name, order.roomName);
                        var effectivepriceperp = (order.price*amount - transfercost*Memory.myEnergyPrice) / amount;
                        myreturn = myreturn.concat(new Array("I could sell "+amount+"x "+resource+" for "+(order.price*amount)+" ("+order.price+"/p, "+effectivepriceperp+"/ep) and I would need to pay "+ transfercost + " Energy to sell this to "+order.roomName+"."));
                        if (!deal || dealeffectivepriceperp < effectivepriceperp) {
                            deal = order.id;
                            var dealAmount = amount;
                            var dealeffectivepriceperp = effectivepriceperp;
                        }
                    }
                    if (deal) {
                        if (dealeffectivepriceperp > (Memory.stats.market.sell.avg[resource] / 2)) {
                            var order = Game.market.getOrderById(deal);
                            var transfercost = Game.market.calcTransactionCost(dealAmount, terminal.room.name, order.roomName);
                            myreturn = myreturn.concat(new Array("I decide to sell "+dealAmount+"x "+resource+" for "+(order.price*amount)+" ("+order.price+"/p) and I would need to pay "+ transfercost + " Energy to sell this to "+order.roomName+"."));
                            myreturn = myreturn.concat(new Array("The effective dealeffectivepriceperp would be "+dealeffectivepriceperp+"/p"));
                            var result = Game.market.deal(deal,dealAmount,roomName);
                            myreturn = myreturn.concat(new Array("Result of deal is: "+result));
                            Game.notify(
                                'Master! Your Maid sold '+dealAmount+'x '+resource+' for '+(order.price*dealAmount)+'c ('+dealeffectivepriceperp+'/p) and paid '+transfercost+' Energy for the transport and the result is '+result, 
                                15  // group these notifications for 3 hours
                            ); 
                        }
                    }
                }
            }
        }
        mydebugger.end(false);
        return myreturn;
    },
    buy: function(roomName,resource) {
        mydebugger.enable({name: 'manageMarket '+roomName});
        var myreturn = new Array(roomName+" "+resource);
        var terminal = cachedSearch.terminalOfRoom(roomName);
        if(typeof terminal != "undefined") {
            var orders =  Game.market.getAllOrders(order => order.resourceType == resource && 
                order.type == ORDER_SELL && 
                Game.market.calcTransactionCost(Math.min(order.remainingAmount,(terminal.storeCapacity - _.sum(terminal.store))), terminal.room.name, order.roomName) < terminal.store[resource]);
            myreturn = myreturn.concat(new Array(roomName+"'s Terminal found "+orders.length+" Market Orders for resource "+resource));
            let deal = false;
            let dealAmount = false;
            let dealeffectivepriceperp = false;
            for (order in orders) {
                order = orders[order];
                var amount = Math.min(order.remainingAmount,(terminal.storeCapacity - _.sum(terminal.store)));
                var transfercost =  Game.market.calcTransactionCost(amount, terminal.room.name, order.roomName);
                var effectivepriceperp = (order.price*amount + transfercost*Memory.myEnergyPrice) / amount;
                myreturn = myreturn.concat(new Array("I could buy "+amount+"x "+resource+" for "+(order.price*amount)+" ("+order.price+"/p, "+effectivepriceperp+"/ep) and I would need to pay "+ transfercost + " Energy to buy this from "+order.roomName+"."));
                if (resource != RESOURCE_ENERGY || transfercost < amount) {
                    if (!deal || dealeffectivepriceperp > effectivepriceperp) {
                        deal = order.id;
                        dealAmount = amount;
                        dealeffectivepriceperp = effectivepriceperp;
                    }
                }
            }
            if (deal) {
                if (dealeffectivepriceperp < (Memory.stats.market.buy.avg[resource] * 2)) {
                    var order = Game.market.getOrderById(deal);
                    var transfercost = Game.market.calcTransactionCost(dealAmount, terminal.room.name, order.roomName);
                    myreturn = myreturn.concat(new Array("I decide to buy "+dealAmount+"x "+resource+" for "+(order.price*dealAmount)+" ("+order.price+"/p) and I would need to pay "+ transfercost + " Energy to buy this from "+order.roomName+"."));
                    myreturn = myreturn.concat(new Array("The effective dealeffectivepriceperp would be "+dealeffectivepriceperp+"/p"));
                    var result = Game.market.deal(deal,dealAmount,roomName);
                    myreturn = myreturn.concat(new Array("Result of deal is: "+result));
                    Game.notify(
                        'Master! Your Maid bought '+dealAmount+'x '+resource+' for '+(order.price*dealAmount)+' ('+dealeffectivepriceperp+'/p) and paid '+transfercost+' Energy for the transport and the result is '+result, 
                        15  // group these notifications for 3 hours
                    ); 

                }
            }
        }
        mydebugger.end(false);
        return myreturn;
    }
}
profiler.registerObject(marketManager,'marketManager');
module.exports = marketManager;
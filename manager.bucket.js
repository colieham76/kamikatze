"use strict";
const profiler = require('screeps-profiler');
var mydebugger = require('mydebugger');

var bucketManager = {
    calctobucket: function(bucket,amount) {
        if (!Memory.bucketmanager[bucket] || Game.cpu.bucket > 9000) Memory.bucketmanager[bucket] = 10000 * amount/Game.cpu.limit;
        if (!Memory.bucketmanager[bucket]) Memory.bucketmanager[bucket] = 0;
        Memory.bucketmanager[bucket] += amount;
    	// buckets should not grow forever...
        if (Memory.bucketmanager[bucket] > 10000 * (amount/Game.cpu.limit)) {
            Memory.bucketmanager[bucket] = 10000 * amount/Game.cpu.limit;
        }
    },
    config: {
        'infrastructure': 4.5,
        'spawns': 2.5,
        'spawns-queue': 1.5,
        'stats': 1,
        'jobs': 0.1,
        'terminals': 0.1,
        'findrepairs': 0.1,
        'jobFinder-fillJobQueue': 0.5,
        'jobFinder-assignJobs': 1.0,
        'creeps' : 40,
        'creeps-eco' : 50,
        'military' : 20,
        'market' : 0.1,
        'market-stats' : 0.1
    },
    tickconfig: {
        'market': 1000,
        'market-stats': 100,
//        'infrastructure': 2500,
        'findrepairs': 100,
        'spawns-queue': 10,
        'jobFinder-assignJobs': 10,
    },
    addtobucket: function() {
        if (Game.cpu.bucket > 600) {
    		// config for "How many CPU is added to which bucket"
            Memory.bucketmanager = Memory.bucketmanager || {};
            let totalconfig = 0;
            for (let bucket in this.config) {
                this.calctobucket(bucket,this.config[bucket]);
                totalconfig += this.config[bucket];
            }
//            console.log(totalconfig+"/"+Game.cpu.limit+" configured for buckets");
        } else {
            this.calctobucket("jobFinder-assignJobs",this.config['jobFinder-assignJobs']);
            this.calctobucket("creeps",this.config['creeps']);
            this.calctobucket("creeps-eco",this.config['creeps-eco']);
            this.calctobucket("military",this.config['military']);
        }
    },
    callfrombucket: function(origthis,origfunc,args,bucket) {
//        let log = (Math.round(Game.cpu.getUsed()*1000)/1000)+" bucketmanager: i want to from bucket "+bucket+" ("+Math.round(Memory.bucketmanager[bucket])+")";
        if (this.tickconfig[bucket] && Game.time - Memory.bucketmanager.lasts[bucket] <= this.tickconfig[bucket]) {
//            console.log('bucketmanager > '+bucket+' > mostlikely skipped because: '+(Game.time - Memory.bucketmanager.lasts[bucket])+" <= "+this.tickconfig[bucket]);
        } else {
            if(bucket == 'spawns-queue') console.log('bucketmanager > '+bucket+' > mostlikely be done ');
        }
        if (!this.tickconfig[bucket] || !Memory.bucketmanager.lasts[bucket] || Game.time - Memory.bucketmanager.lasts[bucket] > this.tickconfig[bucket]) {
            if(Memory.bucketmanager[bucket] > 0 || Game.rooms['sim']) {
                const start = Game.cpu.getUsed();
                const result = origfunc.apply(origthis, args);
                const end = Game.cpu.getUsed();
                Memory.bucketmanager[bucket] -= (end - start)
    //            console.log(log+" and it costed "+Math.round((end - start)*1000)/1000);
                if (this.tickconfig[bucket]) {
                    Memory.bucketmanager.lasts[bucket] = Game.time;
                }
                return true;
            } else {
    //            console.log(log+" but the buckt was empty");
                return false;
            }
        }
    }
}
profiler.registerObject(bucketManager,'bucketManager');
module.exports = bucketManager;
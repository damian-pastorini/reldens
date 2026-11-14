/**
 *
 * Reldens - TimingObject
 *
 * A player interaction starts a timing that is cancelled by the configured causes and gives the reward when it ends.
 * A player that leaves the room stops the timing without a reward, and a failed reward ends it, so the object can always
 * be used again. The object stays busy until the completion settles, so no other timing starts while the reward is
 * added and a failed completion never frees the object of a newer timing. A dead or disabled player starts no timing,
 * and a player runs one timing at a time: the key of its running timing object is kept in the player private data
 * until that timing ends, so a second object in range starts nothing.
 *
 */

const { NpcObject } = require('./npc-object');
const { ObjectsConst } = require('../../../constants');
const { Logger, sc } = require('@reldens/utils');

class TimingObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.isActive = false;
        this.timingTimer = null;
        this.timingCheckInterval = null;
        this.timingPlayer = null;
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(
            false === this.isValidPlayerInteraction(client, data, playerSchema)
            || this.isActive
            || playerSchema.getPrivate(ObjectsConst.ACTIVE_TIMING_KEY)
        ){
            return false;
        }
        this.startTiming(client, room, playerSchema);
    }

    onHit(props)
    {
        super.onHit(props);
        if(!this.runOnHit){
            return;
        }
        if(this.isActive){
            return;
        }
        if(!props.room){
            return;
        }
        let playerBody = sc.hasOwn(props.bodyA, 'playerId') ? props.bodyA : props.bodyB;
        if(!playerBody){
            return;
        }
        let client = props.room.getClientById(playerBody.playerId);
        let playerSchema = props.room.playerBySessionIdFromState(playerBody.playerId);
        if(!client){
            return;
        }
        if(
            !playerSchema
            || playerSchema.isDeath()
            || playerSchema.isDisabled()
            || playerSchema.getPrivate(ObjectsConst.ACTIVE_TIMING_KEY)
        ){
            return;
        }
        this.startTiming(client, props.room, playerSchema);
    }

    startTiming(client, room, playerSchema)
    {
        this.isActive = true;
        this.timingPlayer = playerSchema;
        playerSchema.setPrivate(ObjectsConst.ACTIVE_TIMING_KEY, this.key);
        let startX = playerSchema.state.x;
        let startY = playerSchema.state.y;
        let affectedProperty = room.config.get('client/actions/skills/affectedProperty');
        let lastAffectedValue = sc.get(playerSchema.stats, affectedProperty, 0);
        client.send('*', {act: 'timingStart', id: this.id, key: this.key});
        let timingCheckIntervalMs = 100;
        this.timingCheckInterval = setInterval(() => {
            if(playerSchema !== room.playerBySessionIdFromState(client.sessionId)){
                this.stopTiming();
                return;
            }
            if(this.cancelOnMove && (playerSchema.state.x !== startX || playerSchema.state.y !== startY)){
                this.cancelTiming(client);
                return;
            }
            let currentAffectedValue = sc.get(playerSchema.stats, affectedProperty, 0);
            if(this.cancelOnHit && currentAffectedValue < lastAffectedValue){
                this.cancelTiming(client);
                return;
            }
            lastAffectedValue = currentAffectedValue;
            if(this.cancelOnOutOfRange && false === this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
                this.cancelTiming(client);
            }
        }, timingCheckIntervalMs);
        this.timingTimer = setTimeout(async () => {
            clearInterval(this.timingCheckInterval);
            await this.completeTiming(client, room, playerSchema).catch((error) => {
                Logger.error('Timing object "'+this.key+'" completion error: '+error.message);
                return false;
            });
            this.releaseTiming();
        }, this.clientParams.timingDuration);
    }

    stopTiming()
    {
        clearInterval(this.timingCheckInterval);
        clearTimeout(this.timingTimer);
        this.releaseTiming();
    }

    releaseTiming()
    {
        this.isActive = false;
        if(this.timingPlayer && this.key === this.timingPlayer.getPrivate(ObjectsConst.ACTIVE_TIMING_KEY)){
            this.timingPlayer.setPrivate(ObjectsConst.ACTIVE_TIMING_KEY, false);
        }
        this.timingPlayer = null;
    }

    cancelTiming(client)
    {
        this.stopTiming();
        client.send('*', {act: 'timingCancel', id: this.id, key: this.key});
    }

    async completeTiming(client, room, playerSchema)
    {
        if(playerSchema !== room.playerBySessionIdFromState(client.sessionId)){
            return;
        }
        let reward = this.rollReward();
        if(!reward){
            client.send('*', {act: 'timingComplete', id: this.id, key: this.key, rewarded: false});
            return;
        }
        let newItem = playerSchema.inventory.manager.createItemInstance(reward.key);
        let addResult = await playerSchema.inventory.manager.addItem(newItem);
        if(false === addResult){
            this.cancelTiming(client);
            return;
        }
        client.send('*', {act: 'timingComplete', id: this.id, key: this.key, rewarded: true, itemKey: reward.key});
    }

    rollReward()
    {
        if(!this.rewards){
            return null;
        }
        if(0 === this.rewards.length){
            return null;
        }
        let roll = Math.floor(Math.random() * 100);
        let accumulated = 0;
        for(let i = 0; i < this.rewards.length; i++){
            accumulated += this.rewards[i].rate;
            if(roll < accumulated){
                return this.rewards[i];
            }
        }
        return null;
    }

}

module.exports.TimingObject = TimingObject;

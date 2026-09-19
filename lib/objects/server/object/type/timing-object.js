/**
 *
 * Reldens - TimingObject
 *
 */

const { NpcObject } = require('./npc-object');
const { sc } = require('@reldens/utils');

class TimingObject extends NpcObject
{

    constructor(props)
    {
        super(props);
        this.isActive = false;
        this.timingTimer = null;
        this.timingCheckInterval = null;
    }

    async executeMessageActions(client, data, room, playerSchema)
    {
        if(false === this.isValidId(data)){
            return false;
        }
        if(false === this.isObjectInteractionMessage(data)){
            return false;
        }
        if(false === this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
            this.outOfReachClose(client);
            return false;
        }
        if(this.isActive){
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
        if(!playerSchema){
            return;
        }
        this.startTiming(client, props.room, playerSchema);
    }

    startTiming(client, room, playerSchema)
    {
        this.isActive = true;
        let startX = playerSchema.state.x;
        let startY = playerSchema.state.y;
        client.send('*', {act: 'timingStart', id: this.id});
        let timingCheckIntervalMs = 100;
        this.timingCheckInterval = setInterval(() => {
            if(this.cancelOnMove && (playerSchema.state.x !== startX || playerSchema.state.y !== startY)){
                this.cancelTiming(client);
                return;
            }
            if(this.cancelOnOutOfRange && false === this.isValidInteraction(playerSchema.state.x, playerSchema.state.y)){
                this.cancelTiming(client);
            }
        }, timingCheckIntervalMs);
        this.timingTimer = setTimeout(async () => {
            clearInterval(this.timingCheckInterval);
            await this.completeTiming(client, room, playerSchema);
        }, this.clientParams.timingDuration);
    }

    cancelTiming(client)
    {
        clearInterval(this.timingCheckInterval);
        clearTimeout(this.timingTimer);
        this.isActive = false;
        client.send('*', {act: 'timingCancel', id: this.id});
    }

    async completeTiming(client, room, playerSchema)
    {
        this.isActive = false;
        let reward = this.rollReward();
        if(!reward){
            client.send('*', {act: 'timingComplete', id: this.id, rewarded: false});
            return;
        }
        let newItem = playerSchema.inventory.manager.createItemInstance(reward.key);
        let addResult = await playerSchema.inventory.manager.addItem(newItem);
        if(false === addResult){
            this.cancelTiming(client);
            return;
        }
        client.send('*', {act: 'timingComplete', id: this.id, rewarded: true, itemKey: reward.key});
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

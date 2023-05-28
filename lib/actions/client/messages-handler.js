/**
 *
 * Reldens - MessagesHandler.
 *
 */

const { ReceiverWrapper } = require('./receiver-wrapper');
const { Logger, sc } = require('@reldens/utils');
const { SkillConst } = require('@reldens/skills');

class MessagesHandler
{

    constructor(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in ActionsPlugin MessagesHandler.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in ActionsPlugin MessagesHandler.');
        }
        this.gameDom = this.gameManager.gameDom;
    }

    createAndActivateReceiver(player, key, roomEvents)
    {
        if(key !== roomEvents.room.sessionId){
            return false;
        }
        if(!this.gameManager.skills){
            this.gameManager.skills = new ReceiverWrapper({owner: player, roomEvents, events: this.events});
        }
        if(!this.gameManager.skillsQueue.length){
            return false;
        }
        for(let message of this.gameManager.skillsQueue){
            this.gameManager.skills.processMessage(message);
        }
    }

    processOrQueueMessage(message)
    {
        if(!message.act){
            return false;
        }
        if(
            message.act.indexOf(SkillConst.ACTIONS_PREF) !== 0
            && message.act.indexOf('_atk') === -1
            && message.act.indexOf('_eff') === -1
            && message.act.indexOf('_hit') === -1
        ){
            return false;
        }
        let currentScene = this.gameManager.getActiveScene();
        if(currentScene && currentScene.player){
            return this.gameManager.skills.processMessage(message);
        }
        if(!sc.hasOwn(this.gameManager, 'skillsQueue')){
            this.gameManager.skillsQueue = [];
        }
        this.gameManager.skillsQueue.push(message);
    }

}

module.exports.MessagesHandler = MessagesHandler;
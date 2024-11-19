/**
 *
 * Reldens - ClanMessageListener
 *
 */

const { ClanMessageHandler } = require('./clan-message-handler');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class ClanMessageListener
{

    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on ClanMessageListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on ClanMessageListener.', props);
            return false;
        }
        let clanMessageHandler = new ClanMessageHandler({roomEvents, message});
        if(!clanMessageHandler.validate()){
            if(this.isClanMessage(message)){
                if(!roomEvents.clanMessagesQueue){
                    roomEvents.clanMessagesQueue = [];
                }
                roomEvents.clanMessagesQueue.push(message);
            }
            return false;
        }
        if(!this.isClanMessage(message)){
            return false;
        }
        return this.handleClanMessage(message, clanMessageHandler);
    }

    handleClanMessage(message, clanMessageHandler)
    {
        if(TeamsConst.ACTIONS.CLAN_INITIALIZE === message.act){
            return clanMessageHandler.initializeClanUi();
        }
        if(TeamsConst.ACTIONS.CLAN_CREATE === message.act){
            if(TeamsConst.VALIDATION.SUCCESS === message.result){
                return clanMessageHandler.showNewClan();
            }
            return clanMessageHandler.initializeClanUi();
        }
        if(TeamsConst.ACTIONS.CLAN_INVITE === message.act){
            return clanMessageHandler.showClanRequest();
        }
        if(TeamsConst.ACTIONS.CLAN_UPDATE === message.act){
            return clanMessageHandler.showClanBox();
        }
        if(TeamsConst.ACTIONS.CLAN_LEFT === message.act){
            return clanMessageHandler.removeClanUi();
        }
        if(TeamsConst.ACTIONS.CLAN_REMOVED){
            clanMessageHandler.removeClanUi();
            return clanMessageHandler.initializeClanUi();
        }
        return true;
    }

    isClanMessage(message)
    {
        return 0 === message.act?.indexOf(TeamsConst.CLAN_PREF);
    }

}

module.exports.ClanMessageListener = ClanMessageListener;

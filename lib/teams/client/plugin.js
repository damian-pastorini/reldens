/**
 *
 * Reldens - Teams Client Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { TeamTargetBoxEnricher } = require('./team-target-box-enricher');
const { TeamMessageListener } = require('./team-message-listener');
const { ClanMessageListener } = require('./clan-message-listener');
const { TemplatesHandler } = require('./templates-handler');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');
const {ClanMessageHandler} = require("./clan-message-handler");
const {TeamMessageHandler} = require("./team-message-handler");

class TeamsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if (!this.gameManager) {
            Logger.error('Game Manager undefined in TeamsPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if (!this.events) {
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        let teamMessageListener = new TeamMessageListener();
        let clanMessageListener = new ClanMessageListener();
        this.events.on('reldens.createEngineScene', (uiScene) => {
            let roomEvents = uiScene?.gameManager?.activeRoomEvents || this.gameManager?.activeRoomEvents;
            if(!roomEvents){
                Logger.critical('RoomEvents undefined for process Team messages queue on TeamsPlugin.');
                return false;
            }
            this.processClanMessagesQueue(roomEvents, clanMessageListener);
            this.processTeamMessagesQueue(roomEvents, teamMessageListener);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            TemplatesHandler.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget, targetName) => {
            TeamTargetBoxEnricher.appendClanInviteButton(this.gameManager, target, previousTarget, targetName);
            TeamTargetBoxEnricher.appendTeamInviteButton(this.gameManager, target, previousTarget, targetName);
        });
        // @TODO - BETA - Standardize, listeners on config or added by events like:
        // this.events.on('reldens.activateRoom', (room) => {
        //     room.onMessage('*', (message) => {
        //         this.messagesHandler.processOrQueueMessage(message);
        //     });
        // });
        this.gameManager.config.client.message.listeners[TeamsConst.KEY] = teamMessageListener;
        this.gameManager.config.client.message.listeners[TeamsConst.CLAN_KEY] = clanMessageListener;
    }

    processClanMessagesQueue(roomEvents, clanMessageListener)
    {
        if(!sc.isArray(roomEvents.clanMessagesQueue)){
            return;
        }
        if(0 === roomEvents.clanMessagesQueue.length){
            return;
        }
        for(let message of roomEvents.clanMessagesQueue){
            clanMessageListener.handleClanMessage(message, new ClanMessageHandler({roomEvents, message}));
        }
    }

    processTeamMessagesQueue(roomEvents, teamMessageListener)
    {
        if(!sc.isArray(roomEvents.teamMessagesQueue)){
            return;
        }
        if(0 === roomEvents.teamMessagesQueue.length){
            return;
        }
        for(let message of roomEvents.teamMessagesQueue){
            teamMessageListener.handleTeamMessage(message, new TeamMessageHandler({roomEvents, message}));
        }
    }

    fetchTeamPlayerBySessionId(sessionId)
    {
        let currentTeam = this.gameManager.gameEngine.uiScene.currentTeam;
        if(!currentTeam){
            return false;
        }
        for(let i of Object.keys(currentTeam)){
            let teamPlayer = currentTeam[i];
            if(teamPlayer.sessionId === sessionId){
                return teamPlayer;
            }
        }
        return false;
    }

}

module.exports.TeamsPlugin = TeamsPlugin;

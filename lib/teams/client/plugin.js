/**
 *
 * Reldens - Teams Client Plugin
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { TargetBoxEnricher } = require('./target-box-enricher');
const { TeamMessageListener } = require('./team-message-listener');
const { ClanMessageListener } = require('./clan-message-listener');
const { MessageProcessor } = require('./messages-processor');
const { TemplatesHandler } = require('./templates-handler');
const { TeamsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class TeamsPlugin extends PluginInterface
{

    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in TeamsPlugin.');
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in TeamsPlugin.');
        }
        this.teamMessageListener = new TeamMessageListener();
        this.clanMessageListener = new ClanMessageListener();
        this.listenEvents();
        // @TODO - BETA - Standardize, listeners on config or added by events like:
        // this.events.on('reldens.activateRoom', (room) => {
        //     room.onMessage('*', (message) => {
        //         this.messagesHandler.processOrQueueMessage(message);
        //     });
        // });
        this.listenMessages();
    }

    listenMessages()
    {
        if(!this.gameManager || !this.events){
            return;
        }
        this.gameManager.config.client.message.listeners[TeamsConst.KEY] = this.teamMessageListener;
        this.gameManager.config.client.message.listeners[TeamsConst.CLAN_KEY] = this.clanMessageListener;
    }

    listenEvents()
    {
        if(!this.events){
            return;
        }
        this.events.on('reldens.createEngineSceneDone', (event) => {
            let roomEvents = event.roomEvents;
            if(!roomEvents){
                Logger.critical('RoomEvents undefined for process Team messages queue on TeamsPlugin.', event);
                return false;
            }
            MessageProcessor.processClanMessagesQueue(roomEvents, this.clanMessageListener);
            MessageProcessor.processTeamMessagesQueue(roomEvents, this.teamMessageListener);
        });
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            TemplatesHandler.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget, targetName) => {
            TargetBoxEnricher.appendClanInviteButton(this.gameManager, target, previousTarget, targetName);
            TargetBoxEnricher.appendTeamInviteButton(this.gameManager, target, previousTarget, targetName);
        });
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

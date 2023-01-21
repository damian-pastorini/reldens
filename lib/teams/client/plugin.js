/**
 *
 * Reldens - Teams Client Plugin
 *
 */

const { UserInterface } = require('../../game/client/user-interface');
const { PluginInterface } = require('../../features/plugin-interface');
const { TeamTargetActions } = require('./team-create-target-action');
const { Logger, sc } = require('@reldens/utils');

class TeamsPlugin extends PluginInterface
{

    setup(props)
    {
        this.teamTargetActions = new TeamTargetActions();
        this.gameManager = sc.get(props, 'gameManager', false);
        // @NOTE: the tradeUi works as preload for the trade template which at the end is a dialog-box.
        this.teamsUi = new UserInterface(this.gameManager, {id: 'trade', type: 'trade'});
        if(!this.gameManager){
            Logger.error('Game Manager undefined in InventoryPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in InventoryPlugin.');
        }
        this.events.on('reldens.preloadUiScene', (preloadScene) => {
            this.preloadTemplates(preloadScene);
        });
        this.events.on('reldens.gameEngineShowTarget', (gameEngine, target, previousTarget, targetName) => {
            this.teamTargetActions.showTeamInviteAction(this.gameManager, target, previousTarget, targetName);
        });
        this.events.on('reldens.playersOnAdd', (player, key, previousScene, roomEvents) => {
            this.onPlayerAdd(key, roomEvents, player);
        });
        /*
        this.events.on('reldens.createUiScene', (preloadScene) => {
            return this.onPreloadUiScene(preloadScene);
        });
        this.gameManager.config.client.message.listeners['trade'] = new TradeMessageListener();
        */
    }

    preloadTemplates(preloadScene)
    {
        let teamsTemplatePath = 'assets/features/teams/templates/';
        preloadScene.load.html('teamPlayerInvite', teamsTemplatePath+'team-invite.html');
        preloadScene.load.html('teamPlayerAccept', teamsTemplatePath+'team-accept.html');
    }

    onPreloadUiScene(preloadScene)
    {
        /*
        this.uiManager = new InventoryUi(preloadScene);
        this.uiManager.createUi();
        let inventoryPanel = preloadScene.getUiElement('inventory').getChildByProperty(
            'id',
            InventoryConst.INVENTORY_ITEMS
        );
        let equipmentPanel = preloadScene.getUiElement('equipment').getChildByProperty(
            'id',
            InventoryConst.EQUIPMENT_ITEMS
        );
        if(!inventoryPanel || !equipmentPanel){
            Logger.error(['Inventory/Equipment UI not found.', inventoryPanel, equipmentPanel]);
            return false;
        }
        let manager = preloadScene.gameManager.inventory.manager;
        // listen for inventory events:
        this.listenInventoryEvents(preloadScene, inventoryPanel, equipmentPanel);
        */
    }

    onPlayerAdd(key, roomEvents, player)
    {
        if(key !== roomEvents.room.sessionId){
            return false;
        }
    }

    listenInventoryEvents(uiScene, inventoryPanel, equipmentPanel)
    {

    }

}

module.exports.TeamsPlugin = TeamsPlugin;

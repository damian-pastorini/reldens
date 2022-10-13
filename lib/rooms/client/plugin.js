/**
 *
 * Reldens - Rooms Client Plugin.
 *
 */

const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

class RoomsPlugin extends PluginInterface
{

    setup(props)
    {
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in RoomsPlugin.');
        }
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomsPlugin.');
        }
        this.events.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            let playersConfig = initialGameData.gameConfig.client.players;
            let multiConfig = sc.get(playersConfig, 'multiplePlayers', false);
            let playersCount = sc.isTrue(initialGameData, 'players') ? Object.keys(initialGameData.players).length : 0;
            if(initialGameData.roomSelection && ((multiConfig && multiConfig.enabled) || 0 === playersCount)){
                this.populateSceneSelector(initialGameData.roomSelection, gameManager);
            }
        });
        this.events.on('reldens.onPreparePlayerSelectorFormSubmit', (
            usersPack,
            form,
            select,
            selectedPlayer,
            gameManager
        ) => {
            this.appendSelectedScene(gameManager);
        });
    }

    populateSceneSelector(roomSelection, gameManager)
    {
        let playerCreationAdditional = gameManager.gameDom.getElement('.player_creation_additional_info');
        let playerSelectionAdditional = gameManager.gameDom.getElement('.player_selection_additional_info');
        if(!playerCreationAdditional && !playerSelectionAdditional){
            return false;
        }
        let lastLocationLabel = gameManager.config.get('client/rooms/selection/loginLastLocationLabel');
        if(playerCreationAdditional){
            let creationRoomSelection = [...roomSelection];
            let index = roomSelection.indexOf(lastLocationLabel);
            if(-1 !== index){
                creationRoomSelection.splice(index, 1);
            }
            let div = this.createSelectorElements(gameManager, creationRoomSelection);
            playerCreationAdditional.append(div);
        }
        if(playerSelectionAdditional){
            let div = this.createSelectorElements(gameManager, roomSelection, lastLocationLabel);
            playerSelectionAdditional.append(div);
        }
    }

    appendSelectedScene(gameManager)
    {
        let sceneSelect = gameManager.gameDom.getElement('.player_selection_additional_info .scene-select');
        if(!sceneSelect){
            return;
        }
        let selectedScene = sceneSelect.options[sceneSelect.selectedIndex].value;
        if(!selectedScene){
            return;
        }
        gameManager.initialGameData.selectedScene = selectedScene;
    }

    createSelectorElements(gameManager, roomSelection, lastLocationLabel)
    {
        let div = gameManager.gameDom.createElement('div');
        div.classList.add('input-box');
        let label = gameManager.gameDom.createElement('label');
        label.for = 'scene-select';
        label.innerText = 'Please select a Scene';
        let select = gameManager.gameDom.createElement('select');
        select.name = 'selectedScene';
        select.classList.add('select-element');
        select.classList.add('scene-select');
        for(let roomName of roomSelection){
            let option = new Option(roomName, roomName);
            if(lastLocationLabel && roomName === lastLocationLabel){
                option.value = '@lastLocation';
            }
            select.append(option);
        }
        div.append(label);
        div.append(select);
        return div;
    }
}

module.exports.RoomsPlugin = RoomsPlugin;

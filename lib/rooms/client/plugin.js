/**
 *
 * Reldens - RoomsPlugin
 *
 */

const { ActionsConst } = require('../../actions/constants');
const { RoomsConst } = require('../constants');
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
        let playerCreationAdditional = gameManager.gameDom.getElement(
            ActionsConst.SELECTORS.PLAYER_CREATION_ADDITIONAL_INFO
        );
        let playerSelectionAdditional = gameManager.gameDom.getElement(
            ActionsConst.SELECTORS.PLAYER_SELECTION_ADDITIONAL_INFO
        );
        if(!playerCreationAdditional && !playerSelectionAdditional){
            Logger.warning('Missing element.', {playerCreationAdditional, playerSelectionAdditional});
            return false;
        }
        if(playerCreationAdditional){
            let creationSelection = this.filterCreationRooms(roomSelection);
            let div = this.createSelectorElements(gameManager, creationSelection, 'creation');
            playerCreationAdditional.append(div);
        }
        if(playerSelectionAdditional){
            let div = this.createSelectorElements(gameManager, roomSelection, 'selection');
            playerSelectionAdditional.append(div);
        }
    }

    filterCreationRooms(roomSelection)
    {
        let creationSelection = [];
        for(let optionData of roomSelection){
            if(optionData.name === RoomsConst.ROOM_LAST_LOCATION_KEY){
                continue;
            }
            creationSelection.push(optionData);
        }
        return creationSelection;
    }

    appendSelectedScene(gameManager)
    {
        let sceneSelect = gameManager.gameDom.getElement('.player-selection-additional-info .scene-select');
        if(!sceneSelect){
            return;
        }
        let selectedScene = sceneSelect.options[sceneSelect.selectedIndex].value;
        if(!selectedScene){
            return;
        }
        gameManager.initialGameData.selectedScene = selectedScene;
    }

    createSelectorElements(gameManager, roomSelection, key)
    {
        let div = gameManager.gameDom.createElement('div');
        div.classList.add('input-box');
        let label = gameManager.gameDom.createElement('label');
        label.htmlFor = key+'SelectedScene';
        label.innerText = this.gameManager.services.translator.t('game.pleaseSelectScene');
        let select = gameManager.gameDom.createElement('select');
        select.name = key+'SelectedScene';
        select.id = key+'SelectedScene';
        select.classList.add('select-element');
        select.classList.add('scene-select');
        for(let roomData of roomSelection){
            let option = new Option(roomData.title, roomData.name);
            select.append(option);
        }
        div.append(label);
        div.append(select);
        return div;
    }
}

module.exports.RoomsPlugin = RoomsPlugin;

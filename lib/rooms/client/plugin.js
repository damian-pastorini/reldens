/**
 *
 * Reldens - RoomsPlugin
 *
 * Client-side plugin for managing room selection and scene selector UI.
 *
 */

const { ActionsConst } = require('../../actions/constants');
const { RoomsConst } = require('../constants');
const { PluginInterface } = require('../../features/plugin-interface');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('@reldens/utils').EventsManager} EventsManager
 */
class RoomsPlugin extends PluginInterface
{

    /**
     * @param {Object} props
     */
    async setup(props)
    {
        /** @type {GameManager|boolean} */
        this.gameManager = sc.get(props, 'gameManager', false);
        if(!this.gameManager){
            Logger.error('Game Manager undefined in RoomsPlugin.');
        }
        /** @type {EventsManager|boolean} */
        this.events = sc.get(props, 'events', false);
        if(!this.events){
            Logger.error('EventsManager undefined in RoomsPlugin.');
        }
        this.events.on('reldens.beforeCreateEngine', (initialGameData, gameManager) => {
            let isRoomSelectionDisabled = gameManager.config.get('client/rooms/selection/allowOnLogin', false);
            if(isRoomSelectionDisabled && initialGameData.roomSelection){
                this.populateSceneSelector(initialGameData.roomSelection, gameManager);
            }
        });
        this.events.on('reldens.onPrepareSinglePlayerSelectorFormSubmit', (event) => {
            this.appendSelectedScene(event.gameManager, event.form);
        });
        this.events.on('reldens.onPreparePlayerSelectorFormSubmit', (event) => {
            this.appendSelectedScene(event.gameManager, event.form);
        });
        this.events.on('reldens.onPreparePlayerCreationFormSubmit', (event) => {
            this.appendSelectedScene(event.gameManager, event.form);
        });
    }

    /**
     * @param {Array<Object>} roomSelection
     * @param {GameManager} gameManager
     * @returns {boolean|void}
     */
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

    /**
     * @param {Array<Object>} roomSelection
     * @returns {Array<Object>}
     */
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

    /**
     * @param {GameManager} gameManager
     * @param {HTMLFormElement} form
     */
    appendSelectedScene(gameManager, form)
    {
        let singleScene = gameManager.gameDom.getElement('.scene-select-single', form);
        if(singleScene){
            gameManager.initialGameData.selectedScene = singleScene.value;
            return;
        }
        let sceneSelect = gameManager.gameDom.getElement('.scene-select', form);
        if(!sceneSelect){
            //Logger.debug('Scene selector not found by ".scene-select".', form);
            return;
        }
        let selectedScene = sceneSelect.options[sceneSelect.selectedIndex]?.value;
        if(!selectedScene){
            //Logger.debug('Selected scene not found.', sceneSelect, selectedScene.selectedIndex, form);
            return;
        }
        gameManager.initialGameData.selectedScene = selectedScene;
    }

    /**
     * @param {GameManager} gameManager
     * @param {Array<Object>} roomSelection
     * @param {string} key
     * @returns {HTMLElement}
     */
    createSelectorElements(gameManager, roomSelection, key)
    {
        let elementKey = key+'SelectedScene';
        if(1 === roomSelection.length){
            let input = gameManager.gameDom.createElement('input');
            input.type = 'hidden';
            input.name = elementKey;
            input.id = elementKey;
            input.classList.add('scene-select-single');
            input.value = roomSelection.shift().name;
            return input;
        }
        let div = gameManager.gameDom.createElement('div');
        div.classList.add('input-box');
        let label = gameManager.gameDom.createElement('label');
        label.htmlFor = elementKey;
        label.innerText = this.gameManager.services.translator.t('game.pleaseSelectScene');
        let select = gameManager.gameDom.createElement('select');
        select.name = elementKey;
        select.id = elementKey;
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

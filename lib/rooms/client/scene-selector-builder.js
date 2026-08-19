/**
 *
 * Reldens - SceneSelectorBuilder
 *
 * Builds the scene selector elements appended to the player creation and player selection forms, a single hidden
 * input when there is only one room available and a select element for any other case.
 *
 */

const { ActionsConst } = require('../../actions/constants');
const { RoomsConst } = require('../constants');
const { Logger } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class SceneSelectorBuilder
{

    /**
     * @param {Array<Object>} roomSelection
     * @param {GameManager} gameManager
     * @returns {boolean|void}
     */
    populate(roomSelection, gameManager)
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
            playerCreationAdditional.append(this.createSelectorElements(creationSelection, 'creation', gameManager));
        }
        if(playerSelectionAdditional){
            playerSelectionAdditional.append(this.createSelectorElements(roomSelection, 'selection', gameManager));
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
     * @param {Array<Object>} roomSelection
     * @param {string} key
     * @param {GameManager} gameManager
     * @returns {HTMLElement}
     */
    createSelectorElements(roomSelection, key, gameManager)
    {
        let elementKey = key+'SelectedScene';
        if(1 === roomSelection.length){
            return this.createSingleRoomInput(elementKey, roomSelection, gameManager);
        }
        let div = gameManager.gameDom.createElement('div');
        div.classList.add('input-box');
        let label = gameManager.gameDom.createElement('label');
        label.htmlFor = elementKey;
        label.innerText = gameManager.services.translator.t('game.pleaseSelectScene');
        let select = gameManager.gameDom.createElement('select');
        select.name = elementKey;
        select.id = elementKey;
        select.classList.add('select-element');
        select.classList.add('scene-select');
        for(let roomData of roomSelection){
            select.append(new Option(roomData.title, roomData.name));
        }
        div.append(label);
        div.append(select);
        return div;
    }

    /**
     * @param {string} elementKey
     * @param {Array<Object>} roomSelection
     * @param {GameManager} gameManager
     * @returns {HTMLElement}
     */
    createSingleRoomInput(elementKey, roomSelection, gameManager)
    {
        let input = gameManager.gameDom.createElement('input');
        input.type = 'hidden';
        input.name = elementKey;
        input.id = elementKey;
        input.classList.add('scene-select-single');
        input.value = [...roomSelection].shift().name;
        return input;
    }

}

module.exports.SceneSelectorBuilder = SceneSelectorBuilder;

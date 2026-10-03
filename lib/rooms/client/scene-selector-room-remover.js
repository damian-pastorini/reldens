/**
 *
 * Reldens - SceneSelectorRoomRemover
 *
 * Drops a room from the client side room selection data and from every rendered scene selector, used when the
 * server broadcasts that a room was removed while the client is connected.
 *
 */

const { sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class SceneSelectorRoomRemover
{

    /**
     * @param {string} roomName
     * @param {GameManager} gameManager
     */
    remove(roomName, gameManager)
    {
        if(sc.isArray(gameManager.initialGameData?.roomSelection)){
            gameManager.initialGameData.roomSelection = this.filterOutRoom(
                gameManager.initialGameData.roomSelection,
                roomName
            );
        }
        let sceneSelectors = gameManager.gameDom.getElements('.scene-select');
        for(let sceneSelector of sceneSelectors){
            this.removeSelectorOption(sceneSelector, roomName);
        }
    }

    /**
     * @param {Array<Object>} roomSelection
     * @param {string} roomName
     * @returns {Array<Object>}
     */
    filterOutRoom(roomSelection, roomName)
    {
        let remainingRooms = [];
        for(let roomData of roomSelection){
            if(roomData.name === roomName){
                continue;
            }
            remainingRooms.push(roomData);
        }
        return remainingRooms;
    }

    /**
     * @param {HTMLSelectElement} sceneSelector
     * @param {string} roomName
     */
    removeSelectorOption(sceneSelector, roomName)
    {
        for(let i = sceneSelector.options.length - 1; 0 <= i; i--){
            if(sceneSelector.options[i].value === roomName){
                sceneSelector.remove(i);
            }
        }
    }

}

module.exports.SceneSelectorRoomRemover = SceneSelectorRoomRemover;

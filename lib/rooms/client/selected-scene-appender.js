/**
 *
 * Reldens - SelectedSceneAppender
 *
 * Reads the scene picked on a player selection or creation form and puts it in the initial game data, so the
 * selected room travels with the login request; the room picked on the creation form also goes in the create player
 * data, so the player is stored in the selected registration room.
 *
 */

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 */
class SelectedSceneAppender
{

    /**
     * @param {GameManager} gameManager
     * @param {HTMLFormElement} form
     * @param {Object<string, any>|boolean} [creationData]
     */
    append(gameManager, form, creationData = false)
    {
        let singleScene = gameManager.gameDom.getElement('.scene-select-single', form);
        let selectedScene = singleScene?.value;
        if(!singleScene){
            let sceneSelect = gameManager.gameDom.getElement('.scene-select', form);
            if(!sceneSelect){
                //Logger.debug('Scene selector not found by ".scene-select".', form);
                return;
            }
            selectedScene = sceneSelect.options[sceneSelect.selectedIndex]?.value;
            if(!selectedScene){
                //Logger.debug('Selected scene not found.', sceneSelect, selectedScene.selectedIndex, form);
                return;
            }
        }
        gameManager.initialGameData.selectedScene = selectedScene;
        if(creationData){
            creationData.selectedScene = selectedScene;
        }
    }

}

module.exports.SelectedSceneAppender = SelectedSceneAppender;

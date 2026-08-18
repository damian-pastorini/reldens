/**
 *
 * Reldens - SelectedSceneAppender
 *
 * Reads the scene picked on a player selection or creation form and puts it in the initial game data, so the
 * selected room travels with the login request.
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
     */
    append(gameManager, form)
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

}

module.exports.SelectedSceneAppender = SelectedSceneAppender;

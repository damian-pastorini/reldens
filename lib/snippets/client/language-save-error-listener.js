/**
 *
 * Reldens - LanguageSaveErrorListener
 *
 * Listens for the snippets server messages on the scene room. When the chosen language could not be saved, it shows
 * the save error under the language selector.
 *
 */

const { SnippetsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class LanguageSaveErrorListener
{

    /**
     * @param {Object} props
     * @returns {Promise<boolean>}
     */
    async executeClientMessageActions(props)
    {
        let message = sc.get(props, 'message', false);
        if(!message){
            Logger.error('Missing message data on LanguageSaveErrorListener.', props);
            return false;
        }
        let roomEvents = sc.get(props, 'roomEvents', false);
        if(!roomEvents){
            Logger.error('Missing RoomEvents on LanguageSaveErrorListener.', props);
            return false;
        }
        if(SnippetsConst.ACTIONS.UPDATE_ERROR !== message.act){
            return false;
        }
        let saveError = roomEvents.gameManager.gameDom.getElement(SnippetsConst.SELECTORS.SAVE_ERROR);
        if(!saveError){
            Logger.warning('Language save error element not available.');
            return false;
        }
        saveError.classList.remove(GameConst.CLASSES.HIDDEN);
        return true;
    }

}

module.exports.LanguageSaveErrorListener = LanguageSaveErrorListener;

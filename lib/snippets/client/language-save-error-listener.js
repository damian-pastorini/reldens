/**
 *
 * Reldens - LanguageSaveErrorListener
 *
 * Listens for the snippets server messages on the scene room. When the chosen language could not be saved, the
 * SnippetsUi shows the save error under the language selector, only when the error belongs to the last change sent by
 * the selector.
 *
 */

const { SnippetsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./snippets-ui').SnippetsUi} SnippetsUi
 */
class LanguageSaveErrorListener
{

    /**
     * @param {SnippetsUi} snippetsUi
     */
    constructor(snippetsUi)
    {
        /** @type {SnippetsUi} */
        this.snippetsUi = snippetsUi;
    }

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
        if(SnippetsConst.ACTIONS.UPDATE_ERROR !== message.act){
            return false;
        }
        return this.snippetsUi.showSaveError(sc.get(message, 'changedAt', ''));
    }

}

module.exports.LanguageSaveErrorListener = LanguageSaveErrorListener;

/**
 *
 * Reldens - SnippetsUi
 *
 */

const { SnippetsConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class SnippetsUi
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
        this.translator = this.gameManager.services.translator;
        this.locales = {};
    }

    createUi()
    {
        this.locales = sc.get(this.gameManager.config.client, 'locales',  {});
        let localesKeys = Object.keys(this.locales);
        // if there's only one locale then don't show the locale selector:
        if(1 >= localesKeys.length){
            return false;
        }
        let snippetsSettings = this.gameManager.gameEngine.parseTemplate(
            this.uiScene.cache.html.get(SnippetsConst.KEY),
            {
                snippetsTitle: this.translator.t('translator.title'),
                snippetsLabel: this.translator.t('translator.label'),
                snippetsNotification: this.translator.t('translator.notification')
            }
        );
        let appendResult = this.gameManager.gameDom.appendToElement('#settings-dynamic', snippetsSettings);
        if(!appendResult){
            Logger.warning('Could not append snippets settings.');
            return false;
        }
        let localeSelector = this.gameManager.gameDom.getElement('.snippets-setting');
        if(!localeSelector){
            Logger.warning('Snippets settings container not available.');
            return false;
        }
        for(let i of localesKeys){
            let locale = this.locales[i];
            let localeOption = this.gameManager.gameDom.createElement('option');
            localeOption.value = locale.id;
            localeOption.innerHTML = locale.country_code;
            localeSelector.appendChild(localeOption);
        }
        localeSelector.addEventListener('change', async () => {
            this.gameManager.activeRoomEvents.send({
                act: SnippetsConst.ACTIONS.UPDATE,
                up: localeSelector.value
            })
        });
    }

}

module.exports.SnippetsUi = SnippetsUi;

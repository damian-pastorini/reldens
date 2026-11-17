/**
 *
 * Reldens - RequiredSdkLoginGuard
 *
 * Keeps the login forms hidden while the required ads providers SDK scripts load (client/ads/general/sdkRequired on),
 * so the game can not start without them: the forms are shown once every script loaded, and when any script fails to
 * load they stay hidden and the ads SDK error of the page is shown instead.
 *
 */

const { AdsConst } = require('../constants');
const { GameConst } = require('../../game/constants');
const { Logger, sc } = require('@reldens/utils');

class RequiredSdkLoginGuard
{

    /**
     * @param {Object} props
     */
    constructor(props)
    {
        /** @type {Object|false} */
        this.gameDom = sc.get(props, 'gameDom', false);
        /** @type {number} */
        this.pendingScripts = 0;
        /** @type {boolean} */
        this.hasFailedScript = false;
    }

    /**
     * @param {Array<HTMLScriptElement>} sdkScripts
     * @returns {boolean}
     */
    guard(sdkScripts)
    {
        if(0 === sdkScripts.length){
            return false;
        }
        this.pendingScripts = sdkScripts.length;
        this.toggleElement(GameConst.SELECTORS.FORMS_CONTAINER, false);
        for(let sdkScript of sdkScripts){
            sdkScript.addEventListener('load', () => this.onScriptLoaded());
            sdkScript.addEventListener('error', () => this.onScriptFailed(sdkScript.src));
        }
        return true;
    }

    /**
     * @returns {boolean}
     */
    onScriptLoaded()
    {
        this.pendingScripts--;
        if(0 < this.pendingScripts || this.hasFailedScript){
            return false;
        }
        return this.toggleElement(GameConst.SELECTORS.FORMS_CONTAINER, true);
    }

    /**
     * @param {string} sdkUrl
     * @returns {boolean}
     */
    onScriptFailed(sdkUrl)
    {
        this.hasFailedScript = true;
        Logger.critical('Required ads SDK could not be loaded, the game can not start: '+sdkUrl);
        return this.toggleElement(AdsConst.SELECTORS.SDK_ERROR, true);
    }

    /**
     * @param {string} selector
     * @param {boolean} isVisible
     * @returns {boolean}
     */
    toggleElement(selector, isVisible)
    {
        let element = this.gameDom.getElement(selector);
        if(!element){
            Logger.error('Required ads SDK guard element not found: '+selector);
            return false;
        }
        element.classList.toggle(AdsConst.CLASSES.HIDDEN_FORCED, !isVisible);
        return true;
    }

}

module.exports.RequiredSdkLoginGuard = RequiredSdkLoginGuard;

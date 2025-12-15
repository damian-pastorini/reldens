/**
 *
 * Reldens - ChatTabs
 *
 * Manages chat tabs creation and activation for different message types.
 *
 */

const { ChatConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('../../game/client/game-manager').GameManager} GameManager
 * @typedef {import('phaser').Scene} PhaserScene
 */
class ChatTabs
{

    /**
     * @param {GameManager} gameManager
     * @param {PhaserScene} uiScene
     */
    constructor(gameManager, uiScene)
    {
        /** @type {GameManager} */
        this.gameManager = gameManager;
        /** @type {PhaserScene} */
        this.uiScene = uiScene;
        /** @type {boolean} */
        this.showTabs = this.gameManager.config.get('client/ui/chat/showTabs');
        /** @type {string|boolean} */
        this.containerTemplate = false;
        /** @type {string|boolean} */
        this.headerTemplate = false;
        /** @type {string|boolean} */
        this.contentTemplate = false;
        this.createTabs();
        this.activateTabs();
    }

    /**
     * @returns {boolean}
     */
    createTabs()
    {
        if(!this.isReady()){
            return false;
        }
        let chatTypes = sc.get(this.gameManager.initialGameData, 'chatTypes', []);
        if(0 === chatTypes.length){
            Logger.info('Chat types empty.');
            return false;
        }
        let chatContentsElement = this.gameManager.gameDom.getElement(ChatConst.SELECTORS.CONTENTS);
        if(!chatContentsElement){
            Logger.info('Chat contents element not found.');
            return false;
        }
        if(!this.fetchTemplates()){
            return false;
        }
        let tabsHeaders = '';
        let tabsContents = '';
        let i = 0;
        for(let chatType of chatTypes){
            if(!chatType.show_tab){
                continue;
            }
            let tabKey = chatType.key;
            let tabId = chatType.id;
            let headerClone = Object.assign({}, {headerTemplate: this.headerTemplate});
            tabsHeaders += this.gameManager.gameEngine.parseTemplate(
                headerClone.headerTemplate,
                {
                	tabId,
                	tabLabel: this.gameManager.services.translator.t(
                        ChatConst.SNIPPETS.PREFIX+ChatConst.SNIPPETS.TAB_PREFIX+tabKey
                    ),
                    className: 0 === i ? ' active' : ''
	            }
            );
            let contentClone = Object.assign({}, {contentTemplate: this.contentTemplate});
            tabsContents += this.gameManager.gameEngine.parseTemplate(
                contentClone.contentTemplate,
                {
                    tabId,
                    tabKey,
                    className: 0 === i ? ' active' : ''
                }
            );
            i++;
        }
        let tabs = this.gameManager.gameEngine.parseTemplate(this.containerTemplate, {tabsHeaders, tabsContents});
        this.gameManager.gameDom.updateContent(ChatConst.SELECTORS.CONTENTS, tabs);
    }

    /**
     * @returns {boolean}
     */
    fetchTemplates()
    {
        this.containerTemplate = this.uiScene.cache.html.get('chatTabsContainer');
        if(!this.containerTemplate){
            Logger.info('Chat containerTemplate not found.');
            return false;
        }
        this.headerTemplate = this.uiScene.cache.html.get('chatTabLabel');
        if(!this.headerTemplate){
            Logger.info('Chat headerTemplate not found.');
            return false;
        }
        this.contentTemplate = this.uiScene.cache.html.get('chatTabContent');
        if(!this.contentTemplate){
            Logger.info('Chat contentTemplate not found.');
            return false;
        }
        return true;
    }

    /**
     * @returns {boolean}
     */
    isReady()
    {
        if(!this.gameManager){
            Logger.error('ChatTabs, missing game manager.');
        }
        if(!this.uiScene){
            Logger.error('ChatTabs, missing UI Scene.');
        }
        return !(!this.showTabs || !this.gameManager || !this.uiScene);
    }

    activateTabs()
    {
        let labels = this.gameManager.gameDom.getElements('.tab-label');
        for(let label of labels){
            label.addEventListener('click', (event) => {
                let previousLabel = this.gameManager.gameDom.getElement('.tab-label.active');
                previousLabel?.classList.remove('active');
                event.target.classList.add('active');
                let previousContent = this.gameManager.gameDom.getElement('.tab-content.active');
                previousContent?.classList.remove('active');
                let activate = this.gameManager.gameDom.getElement('.tab-content-'+event.target.dataset.tabId);
                if(!activate){
                    Logger.warning('Tab content was not found.', event);
                    return false;
                }
                activate.classList.add('active');
                activate.parentNode.scrollTop = activate.scrollHeight;
            });
        }
    }

}

module.exports.ChatTabs = ChatTabs;

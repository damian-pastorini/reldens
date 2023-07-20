/**
 *
 * Reldens - ChatTabs
 *
 */

const { ChatConst } = require('./constants');
const { Logger, sc, ErrorManager} = require('@reldens/utils');

class ChatTabs
{

    constructor(gameManager, uiScene)
    {
        this.gameManager = gameManager;
        this.uiScene = uiScene;
        this.showTabs = this.gameManager.config.get('client/ui/chat/showTabs');
        this.createTabs();
    }

    createTabs()
    {
        if(!this.gameManager){
            Logger.error('ChatTabs, missing game manager.');
        }
        if(!this.uiScene){
            Logger.error('ChatTabs, missing UI Scene.');
        }
        if(!this.showTabs || !this.gameManager || !this.uiScene){
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
        let containerTemplate = this.uiScene.cache.html.get('chatTabsContainer');
        if(!containerTemplate){
            Logger.info('Chat containerTemplate not found.');
            return false;
        }
        let headerTemplate = this.uiScene.cache.html.get('chatTabLabel');
        if(!headerTemplate){
            Logger.info('Chat headerTemplate not found.');
            return false;
        }
        let contentTemplate = this.uiScene.cache.html.get('chatTabContent');
        if(!contentTemplate){
            Logger.info('Chat contentTemplate not found.');
            return false;
        }
        let tabsHeaders = '';
        let tabsContents = '';
        for(let chatType of chatTypes){
            if(!chatType.show_tab){
                continue;
            }
            let tabKey = chatType.key;
            let tabId = chatType.id;
            let headerClone = Object.assign({}, {headerTemplate});
            tabsHeaders += this.gameManager.gameEngine.parseTemplate(
                headerClone.headerTemplate,
                {
                	tabId,
                	tabLabel: this.gameManager.services.translator.t(
                        ChatConst.SNIPPETS.PREFIX+ChatConst.SNIPPETS.TAB_PREFIX+tabKey
                    )
	            }
            );
            let contentClone = Object.assign({}, {contentTemplate});
            tabsContents += this.gameManager.gameEngine.parseTemplate(
                contentClone.contentTemplate,
                {
                    tabId,
                    tabKey
                }
            );
        }
        let tabs = this.gameManager.gameEngine.parseTemplate(containerTemplate, {tabsHeaders, tabsContents});
        this.gameManager.gameDom.updateContent(ChatConst.SELECTORS.CONTENTS, tabs);
    }

}

module.exports.ChatTabs = ChatTabs;

/**
 *
 * Reldens - TemplatesHandler
 *
 */

class TemplatesHandler
{

    static preloadTemplates(preloadScene, showTabs)
    {
        // @TODO - BETA - Replace by loader replacing snake name file name by camel case for the template key.
        let chatTemplatePath = '/assets/features/chat/templates/';
        // @TODO - BETA - Move the preload HTML as part of the engine driver.
        preloadScene.load.html('chat', chatTemplatePath+'ui-chat.html');
        preloadScene.load.html('chatMessage', chatTemplatePath+'message.html');
        if(showTabs){
            preloadScene.load.html('chatTabsContainer', chatTemplatePath+'tabs-container.html');
            preloadScene.load.html('chatTabLabel', chatTemplatePath+'tab-label.html');
            preloadScene.load.html('chatTabContent', chatTemplatePath+'tab-content.html');
        }
    }

}

module.exports.TemplatesHandler = TemplatesHandler;

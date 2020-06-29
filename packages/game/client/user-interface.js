/**
 *
 * Reldens - UserInterface
 *
 * General UI for the game, basic dialog box.
 *
 */

const { EventsManager } = require('@reldens/utils');

class UserInterface
{

    constructor(gameManager, id, template = 'assets/html/npc-dialog.html')
    {
        EventsManager.emit('reldens.defineUserInterface', gameManager, id, template, this);
        this.initialTitle = '';
        this.initialContent = '';
        this.id = id;
        this.template = template;
        // eslint-disable-next-line no-unused-vars
        EventsManager.on('reldens.beforePreload', (preloadScene, uiScene) => {
            preloadScene.load.html(this.id, this.template);
        });
        EventsManager.on('reldens.createPreload', (preloadScene, uiScene) => {
            let {newWidth, newHeight} = uiScene.gameManager.gameEngine.getCurrentScreenSize(uiScene.gameManager);
            let {uiX, uiY} = uiScene.getUiPosition('npcDialog', newWidth, newHeight);
            let dialogBox = uiScene.add.dom(uiX, uiY).createFromCache(this.id);
            let messageTemplate = preloadScene.cache.html.get(this.id);
            dialogBox.innerHTML = uiScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
                title: this.initialTitle,
                content: this.initialContent
            });
            let dialogContainer = dialogBox.getChildByProperty('className', 'ui-box ui-box-npc-dialog');
            dialogContainer.id = 'box-'+this.id;
            let boxClose = dialogBox.getChildByProperty('className', 'box-close');
            if(boxClose){
                boxClose.id = 'box-close-'+this.id;
                boxClose.addEventListener('click', () => {
                    dialogContainer.style.display = 'none';
                });
            }
            uiScene.userInterfaces[this.id] = dialogBox;
        });
        EventsManager.emit('reldens.createdUserInterface', gameManager, id, template, this);
    }

}

module.exports.UserInterface = UserInterface;

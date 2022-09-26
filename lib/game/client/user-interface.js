/**
 *
 * Reldens - UserInterface
 *
 * General UI for the game, basic dialog box.
 *
 */

class UserInterface
{

    constructor(gameManager, id, template = 'assets/html/npc-dialog.html')
    {
        this.events = gameManager.events;
        this.initialTitle = '';
        this.initialContent = '';
        this.id = id;
        this.template = template;
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.beforePreload', (preloadScene, uiScene) => {
            this.preloadUiElement(preloadScene);
        });
        this.events.on('reldens.createPreload', (preloadScene, uiScene) => {
            this.createUiElement(uiScene, preloadScene);
        });
    }

    preloadUiElement(preloadScene)
    {
        preloadScene.load.html(this.id, this.template);
    }

    createUiElement(uiScene, preloadScene)
    {
        let {newWidth, newHeight} = uiScene.gameManager.gameEngine.getCurrentScreenSize(uiScene.gameManager);
        let {uiX, uiY} = uiScene.getUiPosition('npcDialog', newWidth, newHeight);
        let dialogBox = uiScene.add.dom(uiX, uiY).createFromCache(this.id);
        let messageTemplate = preloadScene.cache.html.get(this.id);
        dialogBox.innerHTML = uiScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
            title: this.initialTitle,
            content: this.initialContent
        });
        let dialogContainer = dialogBox.getChildByProperty('className', 'ui-box ui-box-npc-dialog');
        dialogContainer.id = 'box-' + this.id;
        let boxClose = dialogBox.getChildByProperty('className', 'box-close');
        if(boxClose){
            boxClose.id = 'box-close-' + this.id;
            boxClose.addEventListener('click', () => {
                dialogContainer.style.display = 'none';
            });
        }
        uiScene.userInterfaces[this.id] = dialogBox;
    }
}

module.exports.UserInterface = UserInterface;

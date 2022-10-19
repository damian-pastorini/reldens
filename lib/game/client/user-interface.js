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
            this.createUiElement(preloadScene);
        });
    }

    preloadUiElement(preloadScene)
    {
        preloadScene.getSceneDriver().loadHTML(this.id, this.template);
    }

    createUiElement(preloadScene)
    {
        let {newWidth, newHeight} = preloadScene.gameManager.gameEngine.getCurrentScreenSize();
        let {uiX, uiY} = preloadScene.getUiPosition('npcDialog', newWidth, newHeight);
        let dialogBox = preloadScene.getSceneDriver().addDomCreateFromCache(uiX, uiY, {the: this.id});
        let messageTemplate = preloadScene.getSceneDriver().getCacheHtml(this.id);
        dialogBox.innerHTML = preloadScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
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
        preloadScene.userInterfaces[this.id] = dialogBox;
    }
}

module.exports.UserInterface = UserInterface;

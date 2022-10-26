/**
 *
 * Reldens - UserInterface
 *
 * General UI for the game, basic dialog box.
 *
 */

class UserInterface
{

    constructor(gameManager, animProps, template = 'assets/html/npc-dialog.html')
    {
        this.events = gameManager.events;
        this.initialTitle = '';
        this.initialContent = '';
        this.id = animProps.id;
        this.animProps = animProps;
        this.template = template;
        // eslint-disable-next-line no-unused-vars
        this.events.on('reldens.beforePreload', (preloadScene, _) => {
            this.preloadUiElement(preloadScene);
        });
        this.events.on('reldens.createPreload', (preloadScene, uiSceneDriver) => {
            this.createUiElement(preloadScene, uiSceneDriver);
        });
    }

    preloadUiElement(preloadScene)
    {
        preloadScene.sceneDriver.loadHTML(this.id, this.template);
    }

    createUiElement(preloadScene, uiSceneDriver)
    {
        let {newWidth, newHeight} = preloadScene.gameManager.gameEngine.getCurrentScreenSize();
        let {uiX, uiY} = preloadScene.getUiPosition('npcDialog', newWidth, newHeight);
        let dialogBox = preloadScene.sceneDriver.addDomCreateFromCache(uiX, uiY, {the: this.id});
        let messageTemplate = preloadScene.sceneDriver.getCacheHtml(this.id);
        dialogBox.innerHTML = preloadScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
            title: this.initialTitle,
            content: this.initialContent
        });
        let dialogContainer = dialogBox.getChildByProperty('className', 'ui-box ui-box-npc-dialog');
        dialogContainer.id = 'box-' + this.id;
        dialogContainer.classList.add('type-'+this.animProps.type);
        let boxClose = dialogBox.getChildByProperty('className', 'box-close');
        if(boxClose){
            boxClose.id = 'box-close-' + this.id;
            boxClose.addEventListener('click', () => {
                dialogContainer.style.display = 'none';
            });
        }
        uiSceneDriver.setUiElement(this.id, dialogBox);
    }
}

module.exports.UserInterface = UserInterface;

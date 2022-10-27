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
        this.events.on('reldens.beforePreloadUiScene', (uiSceneManager) => {
            this.preloadUiElement(uiSceneManager);
        });
        this.events.on('reldens.beforeCreateUiScene', (uiSceneManager) => {
            this.createUiElement(uiSceneManager);
        });
    }

    preloadUiElement(uiSceneManager)
    {
        uiSceneManager.uiSceneDriver.loadHTML(this.id, this.template);
    }

    createUiElement(uiSceneManager)
    {
        let {newWidth, newHeight} = uiSceneManager.getCurrentScreenSizeCallback();
        let {uiX, uiY} = uiSceneManager.getUiPosition('npcDialog', newWidth, newHeight);
        let dialogBox = uiSceneManager.uiSceneDriver.addDomCreateFromCache(uiX, uiY, {the: this.id});
        let messageTemplate = uiSceneManager.uiSceneDriver.getCacheHtml(this.id);
        dialogBox.innerHTML = uiSceneManager.parseTemplateCallback(messageTemplate, {
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
        uiSceneManager.uiSceneDriver.userInterfaces[this.id] = dialogBox;
    }
}

module.exports.UserInterface = UserInterface;

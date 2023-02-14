/**
 *
 * Reldens - UserInterface
 *
 * General UI for the game, basic dialog box.
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class UserInterface
{

    constructor(gameManager, animProps, template = 'assets/html/dialog-box.html', uiPositionKey)
    {
        this.events = gameManager.events;
        this.initialTitle = '';
        this.initialContent = '';
        this.id = animProps.id;
        this.animProps = animProps;
        this.template = template;
        this.uiPositionKey = uiPositionKey || 'default';
        this.events.on('reldens.beforePreload', (preloadScene) => {
            this.preloadUiElement(preloadScene);
        });
        this.events.on('reldens.createPreload', (preloadScene, uiScene) => {
            this.createUiElement(uiScene);
        });
    }

    preloadUiElement(preloadScene)
    {
        preloadScene.load.html(this.id, this.template);
    }

    createUiElement(uiScene, templateKey = '')
    {
        if('' === templateKey){
            templateKey = this.id;
        }
        let objectElementId = 'box-'+this.id;
        let gameDom = uiScene.gameManager.gameDom;
        let exists = gameDom.getElement('#'+objectElementId);
        if(exists){
            return sc.get(uiScene.userInterfaces, this.id, false);
        }
        let {newWidth, newHeight} = uiScene.gameManager.gameEngine.getCurrentScreenSize(uiScene.gameManager);
        let {uiX, uiY} = uiScene.getUiPosition(this.uiPositionKey, newWidth, newHeight);
        let dialogBox = uiScene.add.dom(uiX, uiY).createFromCache(templateKey);
        let messageTemplate = uiScene.cache.html.get(templateKey);
        dialogBox.innerHTML = uiScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
            title: this.initialTitle,
            content: this.initialContent
        });
        let dialogContainer = dialogBox.getChildByProperty('className', 'ui-box ui-dialog-box');
        if(!dialogContainer){
            Logger.critical('Missing dialog container for template key: "'+templateKey+'".');
            return false;
        }
        dialogContainer.id = objectElementId;
        dialogContainer.classList.add('type-'+(this.animProps?.type || 'dialog-box'));
        let boxClose = dialogBox.getChildByProperty('className', 'box-close');
        if(boxClose){
            boxClose.id = 'box-close-' + this.id;
            boxClose.addEventListener('click', () => {
                dialogContainer.style.display = 'none';
                uiScene.gameManager.activeRoomEvents.room.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
            });
        }
        uiScene.userInterfaces[this.id] = dialogBox;
    }
}

module.exports.UserInterface = UserInterface;

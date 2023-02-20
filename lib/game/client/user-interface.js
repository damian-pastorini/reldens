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
        let dialogBox = this.createDialogBox(uiScene, templateKey);
        this.createBoxContent(uiScene, templateKey, dialogBox);
        let dialogContainer = gameDom.getElement('.ui-box.ui-dialog-box', dialogBox.node);
        if(!dialogContainer){
            Logger.critical('Missing dialog container for template key: "'+templateKey+'".');
            return false;
        }
        dialogContainer.id = objectElementId;
        dialogContainer.classList.add('type-'+(this.animProps?.type || 'dialog-box'));
        let openButton = this.createOpenButton(dialogBox, dialogContainer, gameDom);
        this.createCloseButton(dialogBox, dialogContainer, openButton, uiScene, gameDom);
        uiScene.userInterfaces[this.id] = this;
        uiScene.elementsUi[this.id] = dialogBox;
        return uiScene.userInterfaces[this.id];
    }

    createDialogBox(uiScene, templateKey)
    {
        let {newWidth, newHeight} = uiScene.gameManager.gameEngine.getCurrentScreenSize(uiScene.gameManager);
        let {uiX, uiY} = uiScene.getUiPosition(this.uiPositionKey, newWidth, newHeight);
        return uiScene.add.dom(uiX, uiY).createFromCache(templateKey);
    }

    createBoxContent(uiScene, templateKey, dialogBox)
    {
        let messageTemplate = uiScene.cache.html.get(templateKey);
        dialogBox.innerHTML = uiScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
            title: this.initialTitle,
            content: this.initialContent
        });
    }

    createOpenButton(dialogBox, dialogContainer, gameDom)
    {
        let openButton = gameDom.getElement('.'+GameConst.UI_BOX + GameConst.UI_OPEN, dialogBox.node);
        if(!openButton){
            return false;
        }
        openButton.id = GameConst.UI_BOX + GameConst.UI_OPEN + '-' + this.id
        openButton.addEventListener('click', () => {
            if(sc.get(this.animProps, 'defaultOpen', false)){
                dialogContainer.style.display = 'block';
                openButton.style.display = 'none';
            }
            if(sc.isFunction(this.animProps['openCallBack'])){
                this.animProps['openCallBack']();
            }
        });
        return openButton;
    }

    createCloseButton(dialogBox, dialogContainer, openButton, uiScene, gameDom)
    {
        let closeButton = gameDom.getElement('.'+GameConst.UI_BOX + GameConst.UI_CLOSE, dialogBox.node);
        if(!closeButton){
            return false;
        }
        closeButton.id = GameConst.UI_BOX + GameConst.UI_CLOSE + '-' + this.id;
        closeButton.addEventListener('click', () => {
            if(!sc.hasOwn(this.animProps, 'sendCloseMessage') || false === this.animProps['sendCloseMessage']){
                uiScene.gameManager.activeRoomEvents.room.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
            }
            if(sc.get(this.animProps, 'defaultClose', false)){
                dialogContainer.style.display = 'none';
                if(openButton){
                    openButton.style.display = 'block';
                }
            }
            if (sc.isFunction(this.animProps['closeCallback'])) {
                this.animProps['closeCallback']();
            }
        });
    }

}

module.exports.UserInterface = UserInterface;

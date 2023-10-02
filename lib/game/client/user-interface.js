/**
 *
 * Reldens - UserInterface
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

class UserInterface
{

    constructor(gameManager, animProps, template = '/assets/html/dialog-box.html', uiPositionKey)
    {
        this.events = gameManager.events;
        this.initialTitle = '';
        this.initialContent = '';
        this.id = animProps.id;
        this.animProps = animProps;
        this.template = template;
        this.uiPositionKey = uiPositionKey || 'default';
        this.listenEvents();
    }

    listenEvents()
    {
        if(!this.events){
            return false;
        }
        this.events.on('reldens.beforePreload', (preloadScene) => {
            this.preloadUiElement(preloadScene);
        });
        this.events.on('reldens.createPreload', (preloadScene, uiScene) => {
            this.createUiElement(uiScene);
        });
    }

    preloadUiElement(preloadScene)
    {
        if(!this.template){
            return;
        }
        preloadScene.load.html(this.id, this.template);
    }

    createUiElement(uiScene, templateKey = '')
    {
        if('' === templateKey){
            templateKey = this.id;
        }
        let objectElementId = 'box-'+this.id;
        let gameDom = uiScene.gameManager.gameDom;
        if(sc.get(uiScene.elementsUi, this.id)){
            return this;
        }
        let dialogBox = this.createDialogBox(uiScene, templateKey);
        this.createBoxContent(uiScene, templateKey, dialogBox);
        let dialogContainer = gameDom.getElement('.ui-box.ui-dialog-box', dialogBox.node);
        if(!dialogContainer){
            Logger.critical('Missing dialog container for template key: "'+templateKey+'".', {
                dialogBox,
                dialogContainer,
                objectElementId
            });
            return false;
        }
        dialogContainer.id = objectElementId;
        dialogContainer.classList.add('type-'+(this.animProps?.type || 'dialog-box'));
        let openButton = this.activateOpenButton(dialogBox, dialogContainer, uiScene, gameDom);
        this.activateCloseButton(dialogBox, dialogContainer, openButton, uiScene, gameDom);
        uiScene.userInterfaces[this.id] = this;
        uiScene.elementsUi[this.id] = dialogBox;
        // @TODO - BETA - refactor to return the created dialog box.
        return this;
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

    activateOpenButton(dialogBox, dialogContainer, uiScene, gameDom)
    {
        // @TODO - BETA - Extract into a new service.
        let openButton = gameDom.getElement('.'+GameConst.UI_BOX + GameConst.UI_OPEN, dialogBox.node);
        if(!openButton){
            return false;
        }
        openButton.id = GameConst.UI_BOX + GameConst.UI_OPEN + '-' + this.id
        openButton.addEventListener('click', () => {
            // @TODO - BETA - Replace styles classes.
            if(sc.get(this.animProps, 'defaultOpen', true)){
                dialogContainer.style.display = 'block';
                openButton.style.display = 'none';
                if(false !== sc.get(this.animProps, 'depth', false)){
                    dialogBox.setDepth(this.animProps.depth);
                }
            }
            if(sc.isFunction(this.animProps['openCallBack'])){
                this.animProps['openCallBack']();
            }
            this.events.emit('reldens.openUI', {ui: this, openButton, dialogBox, dialogContainer, uiScene});
        });
        return openButton;
    }

    activateCloseButton(dialogBox, dialogContainer, openButton, uiScene, gameDom)
    {
        // @TODO - BETA - Extract into a new service.
        let closeButton = gameDom.getElement('.'+GameConst.UI_BOX + GameConst.UI_CLOSE, dialogBox.node);
        if(!closeButton){
            return false;
        }
        closeButton.id = GameConst.UI_BOX + GameConst.UI_CLOSE + '-' + this.id;
        closeButton.addEventListener('click', () => {
            if(!sc.hasOwn(this.animProps, 'sendCloseMessage') || false === this.animProps['sendCloseMessage']){
                uiScene.gameManager.activeRoomEvents.room.send('*', {act: GameConst.CLOSE_UI_ACTION, id: this.id});
            }
            // @TODO - BETA - Replace styles classes.
            if(sc.get(this.animProps, 'defaultClose', true)){
                dialogContainer.style.display = 'none';
                if(openButton){
                    openButton.style.display = 'block';
                }
                if(false !== sc.get(this.animProps, 'depth', false)){
                    dialogBox.setDepth(1);
                }
            }
            if(sc.isFunction(this.animProps['closeCallback'])){
                this.animProps['closeCallback']();
            }
            this.events.emit(
                'reldens.closeUI',
                {ui: this, closeButton, openButton, dialogBox, dialogContainer, uiScene}
            );
        });
    }

}

module.exports.UserInterface = UserInterface;

/**
 *
 * Reldens - UserInterface
 *
 * Generic UI component class for creating dialog boxes and UI elements in the game. Handles preloading
 * HTML templates, creating DOM-based UI elements in Phaser scenes, managing open/close behavior,
 * and event-driven lifecycle management.
 *
 */

const { GameConst } = require('../constants');
const { Logger, sc } = require('@reldens/utils');

/**
 * @typedef {import('./game-manager').GameManager} GameManager
 */
class UserInterface
{

    /**
     * @param {GameManager} gameManager
     * @param {Object} animProps
     * @param {string} [template]
     * @param {string} [uiPositionKey]
     */
    constructor(gameManager, animProps, template = '/assets/html/dialog-box.html', uiPositionKey)
    {
        this.events = gameManager.events;
        this.gameDom = gameManager.gameDom;
        this.initialTitle = '';
        this.initialContent = '';
        this.id = animProps.id;
        this.animProps = animProps;
        this.template = template;
        this.uiPositionKey = uiPositionKey || 'default';
        this.openButton = null;
        this.closeButton = null;
        this.listenEvents();
    }

    /**
     * @returns {boolean}
     */
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

    /**
     * @param {Object} preloadScene
     */
    preloadUiElement(preloadScene)
    {
        if(!this.template){
            return;
        }
        preloadScene.load.html(this.id, this.template);
    }

    /**
     * @param {Object} uiScene
     * @param {string} [templateKey='']
     * @returns {this|false}
     */
    createUiElement(uiScene, templateKey = '')
    {
        if('' === templateKey){
            templateKey = this.id;
        }
        let objectElementId = 'box-'+this.id;
        if(sc.get(uiScene.elementsUi, this.id)){
            return this;
        }
        let dialogBox = this.createDialogBox(uiScene, templateKey);
        this.createBoxContent(uiScene, templateKey, dialogBox);
        let dialogContainer = this.gameDom.getElement('.ui-box.ui-dialog-box', dialogBox.node);
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
        this.activateOpenButton(dialogBox, dialogContainer, uiScene);
        this.activateCloseButton(dialogBox, dialogContainer, uiScene);
        uiScene.userInterfaces[this.id] = this;
        uiScene.elementsUi[this.id] = dialogBox;
        // @TODO - BETA - refactor to return the created dialog box.
        return this;
    }

    /**
     * @param {Object} uiScene
     * @param {string} templateKey
     * @returns {Phaser.GameObjects.DOMElement}
     */
    createDialogBox(uiScene, templateKey)
    {
        let {newWidth, newHeight} = uiScene.gameManager.gameEngine.getCurrentScreenSize(uiScene.gameManager);
        let {uiX, uiY} = uiScene.getUiPosition(this.uiPositionKey, newWidth, newHeight);
        return uiScene.add.dom(uiX, uiY).createFromCache(templateKey);
    }

    /**
     * @param {Object} uiScene
     * @param {string} templateKey
     * @param {Phaser.GameObjects.DOMElement} dialogBox
     */
    createBoxContent(uiScene, templateKey, dialogBox)
    {
        let messageTemplate = uiScene.cache.html.get(templateKey);
        dialogBox.innerHTML = uiScene.gameManager.gameEngine.parseTemplate(messageTemplate, {
            title: this.initialTitle,
            content: this.initialContent
        });
    }

    /**
     * @param {Phaser.GameObjects.DOMElement} dialogBox
     * @param {HTMLElement} dialogContainer
     * @param {Object} uiScene
     * @returns {HTMLElement|false}
     */
    activateOpenButton(dialogBox, dialogContainer, uiScene)
    {
        // @TODO - BETA - Extract into a new service.
        this.openButton = this.gameDom.getElement('.'+GameConst.UI_BOX + GameConst.UI_OPEN, dialogBox.node);
        if(!this.openButton){
            return false;
        }
        this.openButton.id = GameConst.UI_BOX + GameConst.UI_OPEN + '-' + this.id
        this.openButton.addEventListener('click', () => {
            // @TODO - BETA - Replace styles classes.
            if(sc.get(this.animProps, 'defaultOpen', true)){
                dialogContainer.style.display = 'block';
                this.openButton.style.display = 'none';
                if(false !== sc.get(this.animProps, 'depth', false)){
                    dialogBox.setDepth(this.animProps.depth);
                }
            }
            if(sc.isFunction(this.animProps['openCallBack'])){
                this.animProps['openCallBack']();
            }
            this.events.emit(
                'reldens.openUI',
                {ui: this, openButton: this.openButton, dialogBox, dialogContainer, uiScene}
            );
        });
        return this.openButton;
    }

    /**
     * @param {Phaser.GameObjects.DOMElement} dialogBox
     * @param {HTMLElement} dialogContainer
     * @param {Object} uiScene
     */
    activateCloseButton(dialogBox, dialogContainer, uiScene)
    {
        // @TODO - BETA - Extract into a new service.
        this.closeButton = this.gameDom.getElement('.'+GameConst.UI_BOX + GameConst.UI_CLOSE, dialogBox.node);
        if(!this.closeButton){
            return false;
        }
        this.closeButton.id = GameConst.UI_BOX + GameConst.UI_CLOSE + '-' + this.id;
        this.closeButton.addEventListener('click', () => {
            if(!sc.hasOwn(this.animProps, 'sendCloseMessage') || false === this.animProps['sendCloseMessage']){
                uiScene.gameManager.activeRoomEvents.send({act: GameConst.CLOSE_UI_ACTION, id: this.id});
            }
            // @TODO - BETA - Replace styles classes.
            if(sc.get(this.animProps, 'defaultClose', true)){
                dialogContainer.style.display = 'none';
                if(this.openButton){
                    this.openButton.style.display = 'block';
                }
                if(false !== sc.get(this.animProps, 'depth', false)){
                    dialogBox.setDepth(1);
                }
            }
            if(sc.isFunction(this.animProps['closeCallback'])){
                this.animProps['closeCallback']();
            }
            this.events.emit('reldens.closeUI', {
                ui: this,
                closeButton: this.closeButton,
                openButton: this.openButton,
                dialogBox,
                dialogContainer,
                uiScene
            });
        });
    }

}

module.exports.UserInterface = UserInterface;

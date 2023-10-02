/**
 *
 * Reldens - UiFactory
 *
 */

const { GameConst } = require('../constants');

class UiFactory
{

    constructor(uiScene)
    {
        this.uiScene = uiScene;
        this.gameManager = this.uiScene.gameManager;
    }

    create(uiCodeName, depth, defaultOpen, defaultClose, openCallback, closeCallback)
    {
        // @TODO - BETA - Replace by UserInterface.
        let {uiX, uiY} = this.uiScene.getUiConfig(uiCodeName);
        let dialogBox = this.uiScene.add.dom(uiX, uiY).createFromCache(uiCodeName);
        let openButton = dialogBox.getChildByProperty('id', uiCodeName+GameConst.UI_OPEN);
        let closeButton = dialogBox.getChildByProperty('id', uiCodeName+GameConst.UI_CLOSE);
        openButton?.addEventListener('click', () => {
            // @TODO - BETA - Replace styles classes.
            let dialogContainer = dialogBox.getChildByProperty('id', uiCodeName+'-ui');
            if(defaultOpen){
                if(dialogContainer){
                    dialogContainer.style.display = 'block';
                }
                openButton.style.display = 'none';
                dialogBox.setDepth(depth);
            }
            if(openCallback && 'function' === typeof (openCallback)){
                openCallback();
            }
            this.gameManager.events.emit(
                'reldens.openUI',
                {ui: this, openButton, dialogBox, dialogContainer, uiScene: this.uiScene}
            );
        });
        closeButton?.addEventListener('click', () => {
            let dialogContainer = dialogBox.getChildByProperty('id', uiCodeName+'-ui');
            if(defaultClose){
                if(dialogContainer){
                    dialogContainer.style.display = 'none';
                }
                dialogBox.setDepth(1);
                if(openButton){
                    openButton.style.display = 'block';
                }
            }
            if(closeCallback && 'function' === typeof (closeCallback)){
                closeCallback();
            }
            this.gameManager.events.emit(
                'reldens.closeUI',
                {ui: this, closeButton, openButton, dialogBox, dialogContainer, uiScene: this.uiScene}
            );
        });
        this.uiScene.elementsUi[uiCodeName] = dialogBox;
    }

}

module.exports.UiFactory = UiFactory;

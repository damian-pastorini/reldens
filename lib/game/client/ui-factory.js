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
        let newUiObject = this.uiScene.add.dom(uiX, uiY).createFromCache(uiCodeName);
        let openButton = newUiObject.getChildByProperty('id', uiCodeName+GameConst.UI_OPEN);
        let closeButton = newUiObject.getChildByProperty('id', uiCodeName+GameConst.UI_CLOSE);
        openButton?.addEventListener('click', () => {
            if(defaultOpen){
                let box = newUiObject.getChildByProperty('id', uiCodeName+'-ui');
                box.style.display = 'block';
                openButton.style.display = 'none';
                newUiObject.setDepth(depth);
            }
            if(openCallback && 'function' === typeof (openCallback)){
                openCallback();
            }
        });
        closeButton?.addEventListener('click', () => {
            if(defaultClose){
                let box = newUiObject.getChildByProperty('id', uiCodeName+'-ui');
                box.style.display = 'none';
                newUiObject.setDepth(1);
                if(openButton){
                    openButton.style.display = 'block';
                }
            }
            if(closeCallback && 'function' === typeof (closeCallback)){
                closeCallback();
            }
        });
        this.uiScene.elementsUi[uiCodeName] = newUiObject;
    }

}

module.exports.UiFactory = UiFactory;

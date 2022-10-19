/**
 *
 * Reldens - UserInterface
 *
 * General UI for the game, basic dialog box.
 *
 */

const { GameConst } = require('../constants');

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
        let objectElementId = 'box-'+this.id;
        let exists = uiScene.gameManager.gameDom.getElement('#'+objectElementId);
        if(exists){
            // avoid duplicated elements:
            return true;
        }
        let {uiX, uiY} = uiSceneManager.getUiPosition('npcDialog');

        const uiSceneDriver = uiSceneManager.uiSceneDriver;
        uiSceneDriver.usingUserInterfaces().setupElement(this.id, uiX, uiY);
        uiSceneDriver.usingUserInterfaces().setElementInnerHTMLFromTemplate(this.id, {
            title: this.initialTitle,
            content: this.initialContent,
        });

        this.setupDialogContainer(uiSceneManager);
    }

    setupDialogContainer(uiSceneManager)
    {
        const dialogContainer = uiSceneManager.uiSceneDriver.usingUserInterfaces().getElementChildByProperty(this.id, 'className', 'ui-box ui-box-npc-dialog');
        dialogContainer.id = 'box-' + this.id;
        dialogContainer.classList.add('type-' + this.animProps.type);
        this.setupDialogBoxClose(uiSceneManager, dialogContainer);
    }

    setupDialogBoxClose(uiSceneManager, dialogContainer)
    {
        const boxClose = uiSceneManager.uiSceneDriver.usingUserInterfaces().getElementChildByProperty(this.id, 'className', 'box-close');
        if (boxClose) {
            boxClose.id = 'box-close-' + this.id;
            boxClose.addEventListener('click', () => {
                dialogContainer.style.display = 'none';
                uiSceneManager.getActiveRoomEventsCallback().room.send('*', {
                    act: GameConst.CLOSE_UI_ACTION,
                    id: this.id
                });
            });
        }
    }
}

module.exports.UserInterface = UserInterface;

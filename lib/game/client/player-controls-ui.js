const {sc} = require("@reldens/utils");
const {ActionsConst} = require("../../actions/constants");
const {GameConst} = require("../constants");
const {GameDom} = require("./game-dom");

class PlayerControlsUi
{

    constructor(props)
    {
        this.uiSceneDriver = props.uiSceneDriver;
        this.configManager = props.configManager;
        this.getActiveSceneCallback = props.getActiveSceneCallback;
        this.getActiveRoomEventsCallback = props.getActiveRoomEventsCallback;

        this.holdTimer = 0;
        this.timeout = 0;
    }


    registerControllers(controlsUiConfig)
    {
        const controllersBox = this.uiSceneDriver.usingElementUi().setupElement('controls', controlsUiConfig.uiX, controlsUiConfig.uiY);

        // @TODO - BETA - Controllers will be part of the configuration in the database.
        this.setupDirButtonInBox(GameConst.UP, 'controls');
        this.setupDirButtonInBox(GameConst.DOWN, 'controls');
        this.setupDirButtonInBox(GameConst.LEFT, 'controls');
        this.setupDirButtonInBox(GameConst.RIGHT, 'controls');
        this.setupDefaultActionKey(controllersBox);
    }

    setupDefaultActionKey(controllersBox)
    {
        // if the default action is not specified we won't show the button:
        let defaultActionKey = this.configManager.get('client/ui/controls/defaultActionKey');
        if (!defaultActionKey) {
            return;
        }
        let actionBox = this.createActionBox(defaultActionKey);
        GameDom.appendToElement('.action-buttons', actionBox);
        this.setupActionButtonInBox(defaultActionKey, controllersBox);
    }

    createActionBox(actionKey)
    {
        return this.uiSceneDriver.usingElementUi().parseLoadedContent('actionBox', {
            key: actionKey,
            actionName: actionKey
        });
    }

    setupDirButtonInBox(dir, boxElementKey)
    {
        const btn = this.uiSceneDriver.usingElementUi().getElementChildByID(boxElementKey, dir);
        if (btn) {
            this.configureHoldBehaviour(btn, {dir: dir});
        }
    }

    setupActionButtonInBox(action, actionButton)
    {
        if (!actionButton) {
            return;
        }
        if (this.configManager.get('client/general/controls/action_button_hold')) {
            this.configureHoldBehaviour(actionButton, action);
            return;
        }
        actionButton?.addEventListener('click', () => {
            let currentScene = this.getActiveSceneCallback();
            let dataSend = {
                act: ActionsConst.ACTION,
                target: currentScene.player.currentTarget,
                type: action
            };
            this.getActiveRoomEventsCallback().room.send('*', dataSend);
        });
    }

    configureHoldBehaviour(button, action)
    {
        button.addEventListener('mousedown', (event) => {
            this.startHold(event, button, action);
        });
        button.addEventListener('mouseup', (event) => {
            this.endHold(event, button);
        });
        button.addEventListener('mouseout', (event) => {
            this.endHold(event, button);
        });
        button.addEventListener('touchstart', (event) => {
            this.startHold(event, button, action);
        });
        button.addEventListener('touchend', (event) => {
            this.endHold(event, button);
        });
    }

    startHold(event, button, action)
    {
        event.preventDefault();
        if (this.configManager.get('client/ui/controls/opacityEffect')) {
            button.classList.add('button-opacity-off');
        }
        let currentScene = this.getActiveSceneCallback();
        let dataSend = action;
        // @TODO - BETA - Controllers will be part of the configuration in the database.
        if (!sc.hasOwn(action, 'dir')) {
            dataSend = {
                act: ActionsConst.ACTION,
                target: currentScene.player.currentTarget,
                type: action.type
            };
        }
        this.repeatHold(dataSend);
    }

    endHold(event, button)
    {
        event.preventDefault();
        if (this.configManager.get('client/ui/controls/opacityEffect')) {
            button.classList.remove('button-opacity-off');
        }
        clearTimeout(this.holdTimer);
        this.getActiveRoomEventsCallback().room.send('*', {act: GameConst.STOP});
    }

    repeatHold(sendData)
    {
        this.getActiveRoomEventsCallback().room.send('*', sendData);
        this.holdTimer = setTimeout(() => {
            this.repeatHold(sendData);
        }, (this.timeout || 0));
    }
}

module.exports.PlayerControlsUi = PlayerControlsUi;
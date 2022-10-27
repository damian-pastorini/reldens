const {SettingsUi} = require("./settings-ui");
const {MinimapUi} = require("./minimap-ui");
const {InstructionsUi} = require("./instructions-ui");
const {GameConst} = require("../constants");
const {ActionsConst} = require("../../actions/constants");
const {GameDom} = require("./game-dom");
const {sc, ErrorManager} = require("@reldens/utils");


class UiSceneManager
{

    constructor(config)
    {
        this.name = 'UI Scene Manager';

        this.validateParams(config);
        this.uiSceneDriver = config.uiSceneDriver;
        this.eventsManager = config.eventsManager;
        this.configManager = config.configManager;
        this.cleanTargetCallback = config.cleanTargetCallback;
        this.logoutCallback = config.logoutCallback;
        this.parseTemplateCallback = config.parseTemplateCallback;
        this.getActiveRoomEventsCallback = config.getActiveRoomEventsCallback;
        this.getActiveSceneCallback = config.getActiveSceneCallback;
        this.audioManager = config.audioManager;
        this.getInventoryCallback = config.getInventoryCallback;
        this.getCurrentScreenSizeCallback = config.getCurrentScreenSizeCallback;

        this.gameDom = GameDom;
        this.playerSpriteSize = this.getPlayerSpriteSize();
        this.holdTimer = 0;
        this.uiTarget = {};
        this.setupUiSceneDrivers();
    }

    validateParams(config)
    {
        const {
            uiSceneDriver, eventsManager, configManager, cleanTargetCallback, logoutCallback, parseTemplateCallback,
            getActiveRoomEventsCallback, getActiveSceneCallback, audioManager, getInventoryCallback
        } = config;

        if (!uiSceneDriver || !sc.isObject(uiSceneDriver) || 0 >= sc.length(uiSceneDriver)) {
            ErrorManager.error(this.getErrorMessage('uiSceneDriver'));
        }
        if (!eventsManager || !sc.isObject(eventsManager) || 0 >= sc.length(eventsManager)) {
            ErrorManager.error(this.getErrorMessage('eventsManager'));
        }
        if (!configManager || !sc.isObject(configManager) || 0 >= sc.length(configManager)) {
            ErrorManager.error(this.getErrorMessage('configManager'));
        }
        if (!cleanTargetCallback) {
            ErrorManager.error(this.getErrorMessage('cleanTargetCallback'));
        }
        if (!logoutCallback) {
            ErrorManager.error(this.getErrorMessage('logoutCallback'));
        }
        if (!parseTemplateCallback) {
            ErrorManager.error(this.getErrorMessage('parseTemplateCallback'));
        }
        if (!getActiveRoomEventsCallback) {
            ErrorManager.error(this.getErrorMessage('getActiveRoomEventsCallback'));
        }
        if (!getActiveSceneCallback) {
            ErrorManager.error(this.getErrorMessage('getActiveSceneCallback'));
        }
        if (!audioManager || !sc.isObject(audioManager) || 0 >= sc.length(audioManager)) {
            ErrorManager.error(this.getErrorMessage('audioManager'));
        }
        if (!getInventoryCallback) {
            ErrorManager.error(this.getErrorMessage('getInventoryCallback'));
        }
    }

    getErrorMessage = (param) => 'ERROR - Missing "' + param + '" definition in UiSceneManager class';

    getPlayerSpriteSize()
    {
        return {
            frameWidth: this.configManager.get('client/players/size/width') || 52,
            frameHeight: this.configManager.get('client/players/size/height') || 71
        };
    }

    setupUiSceneDrivers()
    {
        this.uiSceneDriver.setUpPreloadCallback(() => this.preloadUiScene());
        this.uiSceneDriver.setUpCreateCallback(() => this.createUiScene());
    }

    preloadUiScene()
    {
        // @NOTE: the events here run only once over all the game progress.
        this.eventsManager.emitSync('reldens.beforePreloadUiScene', this);
        if (this.configManager.get('client/ui/playerBox/enabled')) {
            this.uiSceneDriver.loadHTML('playerBox', 'assets/html/ui-player-box.html');
        }
        if (this.configManager.get('client/ui/controls/enabled')) {
            this.uiSceneDriver.loadHTML('controls', 'assets/html/ui-controls.html');
        }
        if (this.configManager.get('client/ui/sceneLabel/enabled')) {
            this.uiSceneDriver.loadHTML('sceneLabel', 'assets/html/ui-scene-label.html');
        }
        if (this.configManager.get('client/ui/instructions/enabled')) {
            this.uiSceneDriver.loadHTML('instructions', 'assets/html/ui-instructions.html');
        }
        if (this.configManager.get('client/ui/minimap/enabled')) {
            this.uiSceneDriver.loadHTML('minimap', 'assets/html/ui-minimap.html');
        }
        if (this.configManager.get('client/ui/settings/enabled')) {
            this.uiSceneDriver.loadHTML('settings', 'assets/html/ui-settings.html');
            this.uiSceneDriver.loadHTML('settings-content', 'assets/html/ui-settings-content.html');
        }
        this.uiSceneDriver.loadHTML('uiTarget', 'assets/html/ui-target.html');
        this.uiSceneDriver.loadHTML('uiOptionButton', 'assets/html/ui-option-button.html');
        this.uiSceneDriver.loadHTML('uiOptionIcon', 'assets/html/ui-option-icon.html');
        this.uiSceneDriver.loadHTML('uiOptionsContainer', 'assets/html/ui-options-container.html');
        this.eventsManager.emitSync('reldens.preloadUiScene', this);
    }

    createUiScene()
    {
        // @NOTE: the events here run only once over all the game progress.
        this.eventsManager.emitSync('reldens.beforeCreateUiScene', this);
        // @TODO - BETA - Replace all different DOM references and standardize with React.
        this.createPlayerBox();
        this.createTargetUi();
        this.createSceneLabelBox();
        this.createControlsBox();
        this.createInstructionsBox();
        this.createMiniMap();
        this.createSettingsUi();
        this.eventsManager.emitSync('reldens.createUiScene', this);
    }

    createSettingsUi()
    {
        let settingsConfig = this.getUiConfig('settings');
        if (!settingsConfig.enabled) {
            return;
        }
        this.settingsUi = new SettingsUi();
        this.settingsUi.createSettings(settingsConfig, this.uiSceneDriver, GameDom);
    }

    createMiniMap()
    {
        let minimapConfig = this.getUiConfig('minimap');
        if (!minimapConfig.enabled) {
            return;
        }
        this.minimapUi = new MinimapUi();
        this.minimapUi.createMinimap(minimapConfig, this.uiSceneDriver, this.getActiveSceneCallback);
    }

    createInstructionsBox()
    {
        let instructionConfig = this.getUiConfig('instructions');
        if (!instructionConfig.enabled) {
            return;
        }
        this.instructionsUi = new InstructionsUi();
        this.instructionsUi.createInstructions(instructionConfig, this.uiSceneDriver, GameDom);
    }

    createControlsBox()
    {
        let controlsUi = this.getUiConfig('controls');
        if (!controlsUi.enabled) {
            return;
        }
        let controls = this.uiSceneDriver.addDomCreateFromCache(controlsUi.uiX, controlsUi.uiY, {the: 'controls'});
        this.uiSceneDriver.setUiElement('controls', controls);
        this.registerControllers(this.uiSceneDriver.getUiElement('controls'));
    }

    createSceneLabelBox()
    {
        let sceneLabelUi = this.getUiConfig('sceneLabel');
        if (!sceneLabelUi.enabled) {
            return;
        }
        let sceneLabel = this.uiSceneDriver.addDomCreateFromCache(sceneLabelUi.uiX, sceneLabelUi.uiY, {the: 'sceneLabel'});
        this.uiSceneDriver.setUiElement('sceneLabel', sceneLabel);
    }

    createTargetUi()
    {
        let targetUi = this.getUiConfig('uiTarget');
        if (!targetUi.enabled) {
            return;
        }
        this.uiTarget = this.uiSceneDriver.addDomCreateFromCache(targetUi.uiX, targetUi.uiY, {the: 'uiTarget'});
        let closeButton = this.uiTarget.getChildByProperty('className', 'close-target');
        closeButton.addEventListener('click', () => this.cleanTargetCallback());
    }

    createPlayerBox()
    {
        let playerBox = this.getUiConfig('playerBox');
        if (!playerBox.enabled) {
            return;
        }
        let playerBoxScene = this.uiSceneDriver.addDomCreateFromCache(playerBox.uiX, playerBox.uiY, {the: 'playerBox'});
        this.uiSceneDriver.setUiElement('playerBox', playerBoxScene);
        let logoutButton = this.uiSceneDriver.getUiElement('playerBox').getChildByProperty('id', 'logout');
        logoutButton?.addEventListener('click', () => {
            this.logoutCallback();
        });
    }

    registerControllers(controllersBox)
    {
        // @TODO - BETA - Controllers will be part of the configuration in the database.
        this.setupDirButtonInBox(GameConst.UP, controllersBox);
        this.setupDirButtonInBox(GameConst.DOWN, controllersBox);
        this.setupDirButtonInBox(GameConst.LEFT, controllersBox);
        this.setupDirButtonInBox(GameConst.RIGHT, controllersBox);
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
        let skillTemplate = this.uiSceneDriver.getCacheHtml('actionBox');
        return this.parseTemplateCallback(skillTemplate, {
            key: actionKey,
            actionName: actionKey
        });
    }

    setupDirButtonInBox(dir, box)
    {
        let btn = box.getChildByProperty('id', dir);
        if (btn) {
            this.hold(btn, {dir: dir});
        }
    }

    setupActionButtonInBox(action, box)
    {
        let actionButton = box.getChildByProperty('id', action);
        if (!actionButton) {
            return;
        }
        if (this.configManager.get('client/general/controls/action_button_hold')) {
            this.hold(actionButton, action);
            return;
        }
        actionButton?.addEventListener('click', () => {
            // let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
            let currentScene = this.getActiveSceneCallback();
            let dataSend = {
                act: ActionsConst.ACTION,
                target: currentScene.player.currentTarget,
                type: action
            };
            // this.gameManager.activeRoomEvents.room.send('*', dataSend);
            this.getActiveRoomEventsCallback().room.send('*', dataSend);
        });
    }

    hold(button, action)
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
        // let currentScene = this.gameManager.activeRoomEvents.getActiveScene();
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

    getUiConfig(uiName, newWidth, newHeight)
    {
        let {uiX, uiY} = this.getUiPosition(uiName, newWidth, newHeight);
        return {
            enabled: this.configManager.get('client/ui/' + uiName + '/enabled'),
            uiX: uiX,
            uiY: uiY
        }
    }

    getUiPosition(uiName, newWidth, newHeight)
    {

        let uiX = this.configManager.get('client/ui/' + uiName + '/x');
        let uiY = this.configManager.get('client/ui/' + uiName + '/y');
        if (this.configManager.get('client/ui/screen/responsive')) {
            let rX = this.configManager.get('client/ui/' + uiName + '/responsiveX');
            let rY = this.configManager.get('client/ui/' + uiName + '/responsiveY');
            if (!newWidth) {
                newWidth = GameDom.getElement('.game-container').offsetWidth;
            }
            if (!newHeight) {
                newHeight = GameDom.getElement('.game-container').offsetHeight;
            }
            uiX = rX ? rX * newWidth / 100 : 0;
            uiY = rY ? rY * newHeight / 100 : 0;
        }
        return {uiX, uiY};
    }

    hasUiTargetLoaded()
    {
        return sc.hasOwn(this, 'uiTarget') && sc.length(this.uiTarget) > 0;
    }

    showUiTargetElement(containerHtml)
    {
        if (this.hasUiTargetLoaded()) {
            this.updateUiTarget('block', containerHtml);
        }
    }

    hideUiTargetElement()
    {
        this.updateUiTarget('none', '');
    }

    updateUiTarget(styleDisplay, html)
    {
        this.uiTarget.getChildByID('box-target').style.display = styleDisplay;
        this.uiTarget.getChildByID('target-container').innerHTML = html;
    }

    static get UI_SCENE_KEY()
    {
        return 'uiScene';
    }
}

module.exports.UiSceneManager = UiSceneManager;
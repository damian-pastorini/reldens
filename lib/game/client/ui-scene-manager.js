const {SettingsUi} = require("./settings-ui");
const {MinimapUi} = require("./minimap-ui");
const {InstructionsUi} = require("./instructions-ui");
const {GameConst} = require("../constants");
const {GameDom} = require("./game-dom");
const {sc, ErrorManager} = require("@reldens/utils");
const {PlayerControlsUi} = require("./player-controls-ui");


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
        this.getActiveRoomEventsCallback = config.getActiveRoomEventsCallback;
        this.getActiveSceneCallback = config.getActiveSceneCallback;
        this.audioManager = config.audioManager;
        this.getInventoryCallback = config.getInventoryCallback;
        this.getCurrentScreenSizeCallback = config.getCurrentScreenSizeCallback;

        this.gameDom = GameDom;
        this.playerSpriteSize = this.getPlayerSpriteSize();
        this.uiTarget = {};
        this.setupUiSceneDriver();

        this.playerControlsUi = new PlayerControlsUi({
            uiSceneDriver: this.uiSceneDriver,
            configManager: this.configManager,
            getActiveSceneCallback: this.getActiveSceneCallback,
            getActiveRoomEventsCallback: this.getActiveRoomEventsCallback,
        });
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

    setupUiSceneDriver()
    {
        this.uiSceneDriver.setUpPreloadCallback(() => this.preloadUiScene());
        this.uiSceneDriver.setUpCreateCallback(() => this.createUiScene());
        this.uiSceneDriver.setUpInitCallback(() => this.initUiScene());
    }

    initUiScene()
    {
        this.uiSceneDriver.setVisible(false);
    }

    preloadUiScene()
    {
        // @NOTE: the events here run only once over all the game progress.
        this.eventsManager.emitSync('reldens.beforePreloadUiScene', this);
        if (this.configManager.get('client/ui/playerBox/enabled')) {
            console.log('loading playerBox');
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
        this.settingsUi = new SettingsUi(settingsConfig, this.uiSceneDriver, GameDom);
    }

    createMiniMap()
    {
        let minimapConfig = this.getUiConfig('minimap');
        if (!minimapConfig.enabled) {
            return;
        }
        this.minimapUi = new MinimapUi(minimapConfig, this.uiSceneDriver, this.getActiveSceneCallback);
    }

    createInstructionsBox()
    {
        let instructionConfig = this.getUiConfig('instructions');
        if (!instructionConfig.enabled) {
            return;
        }
        this.instructionsUi = new InstructionsUi(instructionConfig, this.uiSceneDriver, GameDom);
    }

    createControlsBox()
    {
        let controlsUiConfig = this.getUiConfig('controls');
        if (!controlsUiConfig.enabled) {
            return;
        }
        this.playerControlsUi.registerControllers(controlsUiConfig);
    }

    createSceneLabelBox()
    {
        let sceneLabelUi = this.getUiConfig('sceneLabel');
        if (!sceneLabelUi.enabled) {
            return;
        }
        this.uiSceneDriver.usingElementUi().setupElement('sceneLabel', sceneLabelUi.uiX, sceneLabelUi.uiY);
    }

    createTargetUi()
    {
        let targetUi = this.getUiConfig('uiTarget');
        if (!targetUi.enabled) {
            return;
        }
        this.uiTarget = this.uiSceneDriver.usingElementUi().setupElement('uiTarget', targetUi.uiX, targetUi.uiY);
        let closeButton = this.uiSceneDriver.usingElementUi().getElementChildByProperty('uiTarget', 'className', 'close-target');
        closeButton.addEventListener('click', () => this.cleanTargetCallback());
    }

    createPlayerBox()
    {
        const playerBox = this.getUiConfig('playerBox');
        if (!playerBox.enabled) {
            return;
        }
        this.uiSceneDriver.usingElementUi().setupElement('playerBox', playerBox.uiX, playerBox.uiY)
        const logoutButton = this.uiSceneDriver.usingElementUi().getElementChildByProperty('playerBox', 'id', 'logout');
        logoutButton?.addEventListener('click', () => this.logoutCallback());
    }

    showPlayerName(playerName)
    {
        const playerBoxElement = this.uiSceneDriver.usingElementUi().getElementChildByProperty('playerBox', 'className', 'player-name');
        playerBoxElement.innerHTML = playerName;
    }

    updateSceneLabel(newLabel)
    {
        const sceneLabelElement = this.uiSceneDriver.usingElementUi().getElementChildByProperty('sceneLabel', 'className', 'scene-label');
        sceneLabelElement.innerHTML = newLabel;
    }

    updateUi(props)
    {
        const {id, title, content, options} = props;

        // set box depth over the other boxes:
        this.uiSceneDriver.usingUserInterfaces().setElementDepth(id, 2);
        // @TODO -------------------------- make this load responses dynamically, message and templates using animationData.
        this.uiSetTitle(id, title);
        this.uiSetContent(id, content, options);

        let dialogContainer = this.uiSceneDriver.usingUserInterfaces().getElementChildByID(id, 'box-' + id);
        dialogContainer.style.display = 'block';

        // on dialog display clear the current target:
        if (this.configManager.get('client/ui/uiTarget/hideOnDialog')) {
            this.cleanTargetCallback();
        }
    }

    uiSetTitle(id, title)
    {
        if (!title) {
            return false;
        }
        const boxTitle = this.uiSceneDriver.usingUserInterfaces().getElementChildByProperty(id, 'className', 'box-title')
        boxTitle.innerHTML = title;
    }

    uiSetContent(id, content, options)
    {
        if (!content) {
            return false;
        }
        let boxContent = this.uiSceneDriver.usingUserInterfaces().getElementChildByProperty(id, 'className', 'box-content');
        boxContent.innerHTML = content;
        this.uiSetContentOptions(id, options, boxContent);
    }

    uiSetContentOptions(id, options, boxContent)
    {
        if (!options) {
            return false;
        }

        boxContent.innerHTML += this.uiSceneDriver.parseLoadedContent('uiOptionsContainer', {id: 'ui-' + id});

        let optionsKeys = Object.keys(options);
        if (0 === optionsKeys.length) {
            return false;
        }

        for (const [key, {icon, label, value}] of Object.entries(options)) {
            this.addContentToOptionButton(icon, key, id, label, value);
            this.addClickListenerToOptionButton(key, id);
        }
    }

    addContentToOptionButton(icon, key, id, label, value)
    {
        let optTemplate = icon ? 'Icon' : 'Button';
        const buttonElementKey = 'uiOption' + optTemplate;
        let templateVars = {
            id: key,
            object_id: id,
            label,
            value,
            icon: '/assets/custom/items/' + icon + '.png'
        };

        let buttonHtml = this.uiSceneDriver.parseLoadedContent(buttonElementKey, templateVars);
        GameDom.appendToElement('#ui-' + id, buttonHtml);
    }

    addClickListenerToOptionButton(key, id)
    {
        let elementId = '#opt-' + key + '-' + id;
        GameDom.getElement(elementId).addEventListener('click', (event) => {
            let optionSend = {
                id: id,
                act: GameConst.BUTTON_OPTION,
                value: event.target.getAttribute('data-option-value')
            };
            this.getActiveRoomEventsCallback().room.send('*', optionSend);
        });
    }

    updateAllUiElementsPosition(newWidth, newHeight)
    {
        this.uiSceneDriver.updateAllUiElementsPosition((elementKey) => {
            return this.getUiConfig(elementKey, newWidth, newHeight);
        });
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
        return this.uiSceneDriver.usingElementUi().hasUiElementLoaded('uiTarget');
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
        this.uiSceneDriver.usingElementUi().getElementChildByID('uiTarget', 'box-target').style.display = styleDisplay;
        this.uiSceneDriver.usingElementUi().getElementChildByID('uiTarget', 'target-container').innerHTML = html;
    }

    static get UI_SCENE_KEY()
    {
        return 'uiScene';
    }
}

module.exports.UiSceneManager = UiSceneManager;
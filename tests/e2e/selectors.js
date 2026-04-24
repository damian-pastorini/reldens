/**
 *
 * Reldens - Selectors
 *
 * Single source of truth for all CSS/DOM selectors used by the e2e test suite. Other developers
 * who change their game layout can override this file (or replace it before running the suite)
 * without touching any spec or helper.
 *
 * Selectors are grouped by feature module. Functions are used when a selector is parameterized
 * (e.g. by item id, session id, player id, skill key, chat tab id).
 *
 */

class Selectors
{
    constructor()
    {
        this.initBaseSelectors();
        this.initHudAndChatSelectors();
        this.initInventoryAndStatsSelectors();
        this.initInteractionSelectors();
    }

    initBaseSelectors()
    {
        this.canvas = 'canvas';
        this.body = {
            gameStarted: 'body.game-started',
            gameEngineStarted: 'body.game-engine-started'
        };
        this.login = {
            form: '#login-form',
            username: '#username',
            password: '#password',
            submit: '#login-form [type="submit"]',
            error: '#login-form .response-error',
            guestForm: '#guest-form',
            guestSubmit: '#guest-form [type="submit"]'
        };
        this.register = {
            form: '#register-form',
            username: '#reg-username',
            email: '#reg-email',
            password: '#reg-password',
            rePassword: '#reg-re-password',
            submit: '#register-form [type="submit"]',
            termsLinkContainer: '.terms-and-conditions-link-container',
            termsLink: '.terms-and-conditions-link',
            termsBox: '#terms-and-conditions',
            termsCheckbox: '#accept-terms-and-conditions',
            termsAcceptClose: '.terms-and-conditions-accept-close'
        };
        this.characterSelect = {
            container: '#player-selection',
            select: '#player-select-element',
            option: '#player-select-element option',
            newPlayerName: '#new-player-name',
            selectorForm: '#player-selector-form',
            selectorSubmit: '#player-selector-form [type="submit"]',
            createSubmit: '.player-create-submit [type="submit"]',
            sceneSelect: '#player-selector-form .scene-select'
        };
    }

    initHudAndChatSelectors()
    {
        this.hud = {
            chatOpen: '#chat-open',
            logout: '#logout',
            up: '#up',
            settingsOpen: '#settings-open',
            settingsClose: '#settings-close',
            settingsUi: '#settings-ui',
            settingsDynamic: '#settings-dynamic .settings-container',
            instructionsOpen: '#instructions-open',
            instructionsClose: '#instructions-close',
            instructions: '#instructions',
            instructionsContent: '.instructions-content',
            playerStatsOpen: '#player-stats-open',
            playerStatsUi: '#player-stats-ui',
            fullScreen: '#full-screen-btn',
            inventoryOpen: '#inventory-open',
            equipmentOpen: '#equipment-open',
            minimapOpen: '#minimap-open',
            minimapUi: '#minimap-ui',
            minimapClose: '#minimap-close',
            rewardsOpen: '#rewards-open',
            scoresOpen: '.scores-open',
            teamsOpen: '.teams-open',
            clanOpen: '.clan-open'
        };
        this.chat = {
            input: '#chat-input',
            send: '#chat-send',
            tabContent: (tabId) => '.tab-content-'+tabId,
            tabContentGeneral: '.tab-content-1',
            tabContentPrivate: '.tab-content-4',
            tabContentTeams: '.tab-content-8',
            tabContentGlobal: '.tab-content-9',
            tabLabel: '.chat-tab-label',
            tabLabelById: (tabId) => '.chat-tab-label-'+tabId,
            tabLabelActive: '.chat-tab-label-active',
            tabContentActive: '.chat-tab-content-active'
        };
    }

    initInventoryAndStatsSelectors()
    {
        this.inventory = {
            ui: '#inventory-ui',
            items: '#inventory-items',
            item: (itemId) => '#item-'+itemId,
            itemImage: (itemId) => '#item-'+itemId+' .image-container img',
            itemQty: (itemId) => '#item-qty-'+itemId,
            itemEquip: (itemId) => '#item-equip-'+itemId,
            itemUse: (itemId) => '#item-use-'+itemId
        };
        this.equipment = {
            ui: '#equipment-ui',
            items: '#equipment-items',
            groupSlot: '.equipment-group-key',
            slotById: (groupKey) => '.equipment-group-key-'+groupKey,
            slotImage: '.equipment-group-key img',
            itemBoxVisible: '.item-box'
        };
        this.stats = {
            container: '.stat-container',
            value: '.stat-value',
            firstValue: '.stat-container .stat-value',
            levelContainer: '.level-container',
            experienceContainer: '.experience-container',
            levelLabel: '.level-label'
        };
        this.scores = {
            dialog: '.scores-dialog-box',
            dialogTitle: '.scores-dialog-box .box-title',
            dialogContent: '.scores-dialog-box .box-content'
        };
    }

    initInteractionSelectors()
    {
        this.rewards = {
            dialog: '.rewards-dialog-box',
            content: '.rewards-content',
            active: '.reward-active',
            accepted: '.accepted-reward'
        };
        this.teams = {
            dialog: '.teams-dialog-box',
            dialogContent: '.teams-dialog-box .box-content',
            container: '.team-container',
            invite: (playerId) => '.team-invite-'+playerId+' button',
            acceptOption: '[id^="opt-1-teams"]'
        };
        this.clans = {
            dialog: '.clan-dialog-box',
            dialogContent: '.clan-dialog-box .box-content',
            container: '.clan-container',
            disbandAction: '.clan-disband-action',
            nameInput: '.clan-name-input',
            submitCreate: '.submit-clan-create'
        };
        this.npc = {
            dialogue: '.type-npc'
        };
        this.trader = {
            buyTab: '.trade-container-buy',
            sellTab: '.trade-container-sell',
            sellOption: '.trade-option-sell',
            buyButton: '.trade-container-buy .trade-action-buy button',
            sellButton: '.trade-container-sell .trade-action-sell button',
            confirmBuy: '.confirm-buy',
            confirmSell: '.confirm-sell'
        };
        this.playerTrade = {
            startTrade: (sessionId) => '.start-trade-'+sessionId+' button',
            acceptYes: '.accept-trade-yes',
            container: '.trade-container',
            offerButton: '.trade-action-offer',
            confirmAttr: '[class*="confirm-"]',
            cancelButton: '.trade-action-cancel'
        };
        this.combat = {
            targetBox: '#box-target',
            skillButton: (skillKey) => '#'+skillKey
        };
    }
}

module.exports.Selectors = new Selectors();

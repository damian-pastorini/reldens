/**
 *
 * Reldens - ActionsConst
 *
 */

let snippetsPrefix = 'actions.';

module.exports.ActionsConst = {
    BATTLE_TYPE_PER_TARGET: 'bt',
    BATTLE_TYPE_GENERAL: 'bg',
    BATTLE_ENDED: 'bend',
    TARGET_POSITION: 'tgp',
    TARGET_PLAYER: 'tga',
    TARGET_OBJECT: 'tgo',
    FULL_SKILLS_LIST: 'fkl',
    ACTION: 'action',
    DATA_OBJECT_KEY_TARGET: 't',
    DATA_OBJECT_KEY_OWNER: 'o',
    DATA_TARGET_TYPE: 'tT',
    DATA_TARGET_KEY: 'tK',
    DATA_OWNER_TYPE: 'oT',
    DATA_OWNER_KEY: 'oK',
    DATA_TYPE_VALUE_ENEMY: 'e',
    DATA_TYPE_VALUE_PLAYER: 'p',
    DATA_TYPE_VALUE_OBJECT: 'o',
    EXTRA_DATA: {
        KEY: 'sked',
        SKILL_DELAY: 'sd'
    },
    DEFAULT_HIT_ANIMATION_KEY: 'default_hit',
    ACTIONS: {
        SUFFIX: {
            ATTACK: '_atk',
            EFFECT: '_eff',
            HIT: '_hit'
        }
    },
    MESSAGE: {
        DATA: {
            LEVEL: 'lvl',
            EXPERIENCE: 'exp',
            CLASS_PATH_LABEL: 'lab',
            NEXT_LEVEL_EXPERIENCE: 'ne',
            SKILL_LEVEL: 'skl',
            LAST_ATTACK_KEY: 'k'
        },
        DATA_VALUES: {
            NAMESPACE: 'actions',
            lvl: 'level',
            exp: 'experience',
            lab: 'classPathLabel',
            ne: 'nextLevelExperience',
            skl: 'skillLevel'
        }
    },
    SELECTORS: {
        LEVEL_LABEL: '.level-container .level-label',
        CURRENT_EXPERIENCE: '.experience-container .current-experience',
        NEXT_LEVEL_EXPERIENCE: '.experience-container .next-level-experience',
        PLAYER_CREATE_FORM: '#player-create-form',
        UI_PLAYER_EXTRAS: '#ui-player-extras',
        PLAYER_CREATION_ADDITIONAL_INFO: '.player-creation-additional-info',
        PLAYER_SELECTION_ADDITIONAL_INFO: '.player-selection-additional-info',
        CLASS_PATH_LABEL: '.class-path-container .class-path-label',
        SKILLS_CONTAINER: '.skills-container'
    },
    TEMPLATES: {
        SKILLS_CLASS_PATH: 'skillsClassPath',
        SKILLS_LEVEL: 'skillsLevel',
        SKILLS_EXPERIENCE: 'skillsExperience',
        SKILLS: 'skills',
        SKILL_BOX: 'skillBox',
        ACTION_BOX: 'actionBox',
        GAME_OVER: 'gameOver'
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        SELECT_CLASS_PATH: snippetsPrefix+'selectClassPath',
        EXPERIENCE_LABEL: snippetsPrefix+'experienceLabel',
        LEVEL: snippetsPrefix+'currentLevel',
        CLASS_PATH_LABEL: snippetsPrefix+'classPathLabel',
        NEXT_LEVEL_EXPERIENCE: snippetsPrefix+'nextLevelExperience',
        EXPERIENCE: snippetsPrefix+'experience',
        DEATH_PREFIX: snippetsPrefix+'death.',
        DEATH_TITLE: snippetsPrefix+'death.title',
        DEATH_WAIT: snippetsPrefix+'death.wait',
        DEATH_REVIVE_WAIT: snippetsPrefix+'death.reviveWait',
        DEATH_REVIVE_READY: snippetsPrefix+'death.reviveReady',
        DEATH_REVIVE_BUTTON: snippetsPrefix+'death.reviveButton',
        DEATH_RESTORATION_ITEM_USE_BUTTON: snippetsPrefix+'death.restorationItemUseButton',
        DEATH_RESTORATION_ITEM_KEEP_BUTTON: snippetsPrefix+'death.restorationItemKeepButton',
        DEATH_RESURRECTION_AD_BUTTON: snippetsPrefix+'death.resurrectionAdButton'
    },
    AUTO_RECOVERY: {
        CONFIG_PATHS: {
            TICK_MS: 'server/autoRecovery/tickMs',
            PLAYERS: 'server/autoRecovery/players',
            OBJECTS: 'server/autoRecovery/objects'
        },
        PRIVATE_DATA: {
            TICKS: 'autoRecoveryTicks',
            STATE: 'autoRecoveryState'
        },
        DEFAULTS: {
            TICK_MS: 5000,
            PERSIST_EVERY_TICKS: 12,
            START_DELAY_MS: 0
        }
    },
    PVE: {
        CONFIG_PATHS: {
            CHASE_TIME_OUT: 'server/actions/pve/chaseTimeOut'
        },
        DEFAULTS: {
            CHASE_TIME_OUT: 0
        }
    },
    DEATH: {
        CONFIG_PATHS: {
            TELEPORT_ENABLED: 'server/players/death/teleportToTown/enabled',
            TELEPORT_ROOM_ID: 'server/players/death/teleportToTown/roomId',
            RESTORATION_ITEM_KEY: 'server/players/death/restorationItemKey',
            RESURRECTION_ADS_KEY: 'server/players/death/resurrectionAdsKey',
            AUTO_REVIVE: 'server/players/death/autoRevive',
            AUTO_CONSUME_RESTORATION_ITEM: 'server/players/death/autoConsumeRestorationItem',
            GAME_OVER_TIME_OUT: 'server/players/gameOver/timeOut'
        },
        PRIVATE_DATA: {
            PLAYER_DEATH_TIMER: 'playerDeathTimer',
            PLAYER_DEATH_EVENT: 'playerDeathEvent',
            REVIVE_AT: 'playerReviveAt',
            REVIVE_READY: 'playerReviveReady',
            REVIVE_REQUESTED: 'playerReviveRequested',
            RESTORATION_ITEM_CHOICE: 'restorationItemChoice',
            RESURRECTION_AD_REQUESTED: 'resurrectionAdRequested',
            RESURRECTION_AD_STARTED: 'resurrectionAdStarted',
            RESURRECTION_AD_ENDED: 'resurrectionAdEnded',
            RESURRECTION_AD_FAILED: 'resurrectionAdFailed'
        },
        DEFAULTS: {
            TELEPORT_ENABLED: false,
            GAME_OVER_TIME_OUT: 1,
            AUTO_REVIVE: true,
            AUTO_CONSUME_RESTORATION_ITEM: true,
            SECOND_MS: 1000,
            MIN_REVIVE_WAIT_SECONDS: 1,
            RESURRECTION_AD_CHECK_MS: 1000
        },
        ACTIONS: {
            REVIVE_MESSAGE: 'drm',
            REVIVE_REQUEST: 'drq',
            RESTORATION_ITEM_CHOICE: 'drc'
        },
        RESTORATION_ITEM_CHOICES: {
            USE: 'use',
            KEEP: 'keep'
        },
        REVIVE_MODES: {
            IN_PLACE: 'reviveInPlace',
            RESTORATION_ITEM: 'reviveWithRestorationItem',
            ASK_RESTORATION_ITEM: 'askRestorationItem',
            TOWN: 'reviveInTown'
        },
        SELECTORS: {
            GAME_OVER_CONTENT: '#game-over .game-over-content',
            RESURRECTION_AD_BUTTON: '#game-over .game-over-resurrection-ad',
            REVIVE_BUTTON: '#game-over .game-over-revive',
            RESTORATION_ITEM_USE_BUTTON: '#game-over .game-over-restoration-item-use',
            RESTORATION_ITEM_KEEP_BUTTON: '#game-over .game-over-restoration-item-keep'
        }
    }
};

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
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        SELECT_CLASS_PATH: snippetsPrefix+'selectClassPath',
        EXPERIENCE_LABEL: snippetsPrefix+'experienceLabel',
        LEVEL: snippetsPrefix+'currentLevel',
        CLASS_PATH_LABEL: snippetsPrefix+'classPathLabel',
        NEXT_LEVEL_EXPERIENCE: snippetsPrefix+'nextLevelExperience',
        EXPERIENCE: snippetsPrefix+'experience'
    },
    AUTO_RECOVERY: {
        CONFIG_PATHS: {
            TICK_MS: 'server/autoRecovery/tickMs',
            PLAYERS: 'server/autoRecovery/players',
            OBJECTS: 'server/autoRecovery/objects'
        },
        PRIVATE_DATA: {
            TICKS: 'autoRecoveryTicks'
        },
        DEFAULTS: {
            TICK_MS: 5000,
            PERSIST_EVERY_TICKS: 12
        }
    },
    DEATH: {
        CONFIG_PATHS: {
            TELEPORT_ENABLED: 'server/players/death/teleportToTown/enabled',
            TELEPORT_ROOM_ID: 'server/players/death/teleportToTown/roomId',
            RESTORATION_ITEM_KEY: 'server/players/death/restorationItemKey',
            RESURRECTION_ADS_KEY: 'server/players/death/resurrectionAdsKey',
            GAME_OVER_TIME_OUT: 'server/players/gameOver/timeOut'
        },
        PRIVATE_DATA: {
            PLAYER_DEATH_TIMER: 'playerDeathTimer',
            RESURRECTION_AD_STARTED: 'resurrectionAdStarted'
        },
        DEFAULTS: {
            GAME_OVER_TIME_OUT: 1,
            RESURRECTION_AD_CHECK_MS: 1000,
            RESURRECTION_AD_MAX_WAIT_MS: 60000
        }
    }
};

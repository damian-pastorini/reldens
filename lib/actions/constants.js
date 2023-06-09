/**
 *
 * Reldens - actions/constants
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
    DEFAULT_HIT_ANIMATION_KEY: 'default_hit',
    MESSAGE: {
        DATA: {
            LEVEL: 'lvl',
            EXPERIENCE: 'exp',
            CLASS_PATH_LABEL: 'lab',
            NEXT_LEVEL_EXPERIENCE: 'ne',
            SKILL_LEVEL: 'skl'
        }
    },
    SELECTORS: {
        LEVEL_LABEL: '.level-container .level-label',
        CURRENT_EXPERIENCE: '.experience-container .current-experience',
        NEXT_LEVEL_EXPERIENCE: '.experience-container .next-level-experience',
        PLAYER_CREATE_FORM: '#player-create-form',
        UI_PLAYER_EXTRAS: '#ui-player-extras'
    },
    SNIPPETS: {
        PREFIX: snippetsPrefix,
        SELECT_CLASS_PATH: snippetsPrefix+'selectClassPath',
        EXPERIENCE_LABEL: snippetsPrefix+'experienceLabel',
        LEVEL: snippetsPrefix+'level',
        CLASS_PATH_LABEL: snippetsPrefix+'classPathLabel',
        NEXT_LEVEL_EXPERIENCE: snippetsPrefix+'nextLevelExperience',
        EXPERIENCE: snippetsPrefix+'experience'
    }
};

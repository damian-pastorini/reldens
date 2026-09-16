/**
 * Reldens - ActionsConst
 * Precise literal types generated from the runtime constant object
 * (/tmp/claude-1000/-home-kadajett-Dev-reldensResearch/17fbbf2d-6441-4d7f-8631-7ba0d6609de2/scratchpad/reldens-beta/lib/actions/constants.js) at v4.0.0-beta.39.9. No `any`.
 */
export declare const ActionsConst: {
    BATTLE_TYPE_PER_TARGET: "bt";
    BATTLE_TYPE_GENERAL: "bg";
    BATTLE_ENDED: "bend";
    TARGET_POSITION: "tgp";
    TARGET_PLAYER: "tga";
    TARGET_OBJECT: "tgo";
    FULL_SKILLS_LIST: "fkl";
    ACTION: "action";
    DATA_OBJECT_KEY_TARGET: "t";
    DATA_OBJECT_KEY_OWNER: "o";
    DATA_TARGET_TYPE: "tT";
    DATA_TARGET_KEY: "tK";
    DATA_OWNER_TYPE: "oT";
    DATA_OWNER_KEY: "oK";
    DATA_TYPE_VALUE_ENEMY: "e";
    DATA_TYPE_VALUE_PLAYER: "p";
    DATA_TYPE_VALUE_OBJECT: "o";
    EXTRA_DATA: {
        KEY: "sked";
        SKILL_DELAY: "sd";
    };
    DEFAULT_HIT_ANIMATION_KEY: "default_hit";
    ACTIONS: {
        SUFFIX: {
            ATTACK: "_atk";
            EFFECT: "_eff";
            HIT: "_hit";
        };
    };
    MESSAGE: {
        DATA: {
            LEVEL: "lvl";
            EXPERIENCE: "exp";
            CLASS_PATH_LABEL: "lab";
            NEXT_LEVEL_EXPERIENCE: "ne";
            SKILL_LEVEL: "skl";
            LAST_ATTACK_KEY: "k";
        };
        DATA_VALUES: {
            NAMESPACE: "actions";
            lvl: "level";
            exp: "experience";
            lab: "classPathLabel";
            ne: "nextLevelExperience";
            skl: "skillLevel";
        };
    };
    SELECTORS: {
        LEVEL_LABEL: ".level-container .level-label";
        CURRENT_EXPERIENCE: ".experience-container .current-experience";
        NEXT_LEVEL_EXPERIENCE: ".experience-container .next-level-experience";
        PLAYER_CREATE_FORM: "#player-create-form";
        UI_PLAYER_EXTRAS: "#ui-player-extras";
        PLAYER_CREATION_ADDITIONAL_INFO: ".player-creation-additional-info";
        PLAYER_SELECTION_ADDITIONAL_INFO: ".player-selection-additional-info";
        CLASS_PATH_LABEL: ".class-path-container .class-path-label";
        SKILLS_CONTAINER: ".skills-container";
    };
    SNIPPETS: {
        PREFIX: "actions.";
        SELECT_CLASS_PATH: "actions.selectClassPath";
        EXPERIENCE_LABEL: "actions.experienceLabel";
        LEVEL: "actions.currentLevel";
        CLASS_PATH_LABEL: "actions.classPathLabel";
        NEXT_LEVEL_EXPERIENCE: "actions.nextLevelExperience";
        EXPERIENCE: "actions.experience";
    };
};

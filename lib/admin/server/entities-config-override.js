/**
 *
 * Reldens - EntitiesConfigOverrides
 *
 * Configuration object that maps entity types to their parent menu categories in the admin panel.
 * Each menu object contains a parentItemLabel property that defines the navigation group, or a navigationLevel
 * property with the level class of an entity item shown without a group (NavigationLevelSubscriber).
 *
 */

/**
 * @typedef {Object} MenuConfig
 * @property {string} [parentItemLabel]
 * @property {string} [navigationLevel]
 */

/** @type {MenuConfig} */
let topLevelItem = {navigationLevel: 'level-1'};
/** @type {MenuConfig} */
let skillsMenu = {parentItemLabel: 'Skills'};
/** @type {MenuConfig} */
let classPathMenu = {parentItemLabel: 'Classes & Levels'};
/** @type {MenuConfig} */
let settingsMenu = {parentItemLabel: 'Settings'};
/** @type {MenuConfig} */
let usersMenu = {parentItemLabel: 'Users'};
/** @type {MenuConfig} */
let adsMenu = {parentItemLabel: 'Ads'};
/** @type {MenuConfig} */
let audioMenu = {parentItemLabel: 'Audio'};
/** @type {MenuConfig} */
let chatMenu = {parentItemLabel: 'Chat'};
/** @type {MenuConfig} */
let itemsMenu = {parentItemLabel: 'Items & Inventory'};
/** @type {MenuConfig} */
let objectsMenu = {parentItemLabel: 'Game Objects'};
/** @type {MenuConfig} */
let respawnMenu = {parentItemLabel: 'Respawn'};
/** @type {MenuConfig} */
let rewardsMenu = {parentItemLabel: 'Rewards'};
/** @type {MenuConfig} */
let roomsMenu = {parentItemLabel: 'Rooms'};
/** @type {MenuConfig} */
let snippetsMenu = {parentItemLabel: 'Translations'};
/** @type {MenuConfig} */
let clanMenu = {parentItemLabel: 'Clan'};
/** @type {MenuConfig} */
let questsMenu = {parentItemLabel: 'Quests'};

module.exports.EntitiesConfigOverrides = {
    adminSessions: topLevelItem,
    adsBanner: adsMenu,
    ads: adsMenu,
    adsEventVideo: adsMenu,
    adsPlayed: adsMenu,
    adsProviders: adsMenu,
    adsTypes: adsMenu,
    audioCategories: audioMenu,
    audio: audioMenu,
    audioMarkers: audioMenu,
    audioPlayerConfig: audioMenu,
    chat: chatMenu,
    chatMessageTypes: chatMenu,
    clan: clanMenu,
    clanLevels: clanMenu,
    clanLevelsModifiers: clanMenu,
    clanMembers: clanMenu,
    config: settingsMenu,
    configTypes: settingsMenu,
    dropsAnimations: rewardsMenu,
    features: topLevelItem,
    itemsGroup: itemsMenu,
    itemsInventory: itemsMenu,
    itemsItem: itemsMenu,
    itemsItemModifiers: itemsMenu,
    itemsTypes: itemsMenu,
    locale: snippetsMenu,
    objectsAnimations: objectsMenu,
    objectsAssets: objectsMenu,
    objects: objectsMenu,
    objectsItemsInventory: objectsMenu,
    objectsItemsRequirements: objectsMenu,
    objectsItemsRewards: objectsMenu,
    objectsSkills: objectsMenu,
    objectsStats: objectsMenu,
    objectsTypes: objectsMenu,
    operationTypes: settingsMenu,
    players: usersMenu,
    playersState: usersMenu,
    playersStats: usersMenu,
    respawn: respawnMenu,
    rewards: rewardsMenu,
    rewardsEvents: rewardsMenu,
    rewardsEventsState: rewardsMenu,
    rewardsModifiers: rewardsMenu,
    roomsChangePoints: roomsMenu,
    rooms: roomsMenu,
    roomsReturnPoints: roomsMenu,
    scoresDetail: usersMenu,
    scores: usersMenu,
    skillsClassLevelUpAnimations: classPathMenu,
    skillsClassPath: classPathMenu,
    skillsClassPathLevelLabels: classPathMenu,
    skillsClassPathLevelSkills: classPathMenu,
    skillsGroups: skillsMenu,
    skillsLevels: classPathMenu,
    skillsLevelsModifiersConditions: skillsMenu,
    skillsLevelsModifiers: classPathMenu,
    skillsLevelsSet: classPathMenu,
    skillsOwnersClassPath: usersMenu,
    skillsSkillAnimations: skillsMenu,
    skillsSkillAttack: skillsMenu,
    skillsSkill: skillsMenu,
    skillsSkillGroupRelation: skillsMenu,
    skillsSkillOwnerConditions: skillsMenu,
    skillsSkillOwnerEffectsConditions: skillsMenu,
    skillsSkillOwnerEffects: skillsMenu,
    skillsSkillPhysicalData: skillsMenu,
    skillsSkillTargetEffectsConditions: skillsMenu,
    skillsSkillTargetEffects: skillsMenu,
    skillsSkillType: skillsMenu,
    snippets: snippetsMenu,
    stats: usersMenu,
    targetOptions: objectsMenu,
    questsProgress: questsMenu,
    ipLists: topLevelItem,
    users: usersMenu,
    usersLocale: usersMenu,
    usersLogin: usersMenu
};

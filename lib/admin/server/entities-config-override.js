/**
 *
 * Reldens - EntitiesConfigOverrides
 *
 */

let skillsMenu = {parentItemLabel: 'Skills'};
let classPathMenu = {parentItemLabel: 'Classes & Levels'};
let settingsMenu = {parentItemLabel: 'Settings'};
let usersMenu = {parentItemLabel: 'Users'};
let adsMenu = {parentItemLabel: 'Ads'};
let audioMenu = {parentItemLabel: 'Audio'};
let chatMenu = {parentItemLabel: 'Chat'};
let featuresMenu = {parentItemLabel: 'Features'};
let itemsMenu = {parentItemLabel: 'Items & Inventory'};
let objectsMenu = {parentItemLabel: 'Game Objects'};
let respawnMenu = {parentItemLabel: 'Respawn'};
let rewardsMenu = {parentItemLabel: 'Rewards'};
let roomsMenu = {parentItemLabel: 'Rooms'};
let snippetsMenu = {parentItemLabel: 'Translations'};
let clanMenu = {parentItemLabel: 'Clan'};

module.exports.EntitiesConfigOverrides = {
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
    features: featuresMenu,
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
    users: usersMenu,
    usersLocale: usersMenu,
    usersLogin: usersMenu
};

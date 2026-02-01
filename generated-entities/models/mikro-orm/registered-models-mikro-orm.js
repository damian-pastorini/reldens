/**
 *
 * Reldens - Registered Models
 *
 */

const adsBannerModel = require('./ads-banner-model');
const adsModel = require('./ads-model');
const adsEventVideoModel = require('./ads-event-video-model');
const adsPlayedModel = require('./ads-played-model');
const adsProvidersModel = require('./ads-providers-model');
const adsTypesModel = require('./ads-types-model');
const audioCategoriesModel = require('./audio-categories-model');
const audioModel = require('./audio-model');
const audioMarkersModel = require('./audio-markers-model');
const audioPlayerConfigModel = require('./audio-player-config-model');
const chatModel = require('./chat-model');
const chatMessageTypesModel = require('./chat-message-types-model');
const clanModel = require('./clan-model');
const clanLevelsModel = require('./clan-levels-model');
const clanLevelsModifiersModel = require('./clan-levels-modifiers-model');
const clanMembersModel = require('./clan-members-model');
const configModel = require('./config-model');
const configTypesModel = require('./config-types-model');
const dropsAnimationsModel = require('./drops-animations-model');
const featuresModel = require('./features-model');
const itemsGroupModel = require('./items-group-model');
const itemsInventoryModel = require('./items-inventory-model');
const itemsItemModel = require('./items-item-model');
const itemsItemModifiersModel = require('./items-item-modifiers-model');
const itemsTypesModel = require('./items-types-model');
const localeModel = require('./locale-model');
const objectsAnimationsModel = require('./objects-animations-model');
const objectsAssetsModel = require('./objects-assets-model');
const objectsModel = require('./objects-model');
const objectsItemsInventoryModel = require('./objects-items-inventory-model');
const objectsItemsRequirementsModel = require('./objects-items-requirements-model');
const objectsItemsRewardsModel = require('./objects-items-rewards-model');
const objectsSkillsModel = require('./objects-skills-model');
const objectsStatsModel = require('./objects-stats-model');
const objectsTypesModel = require('./objects-types-model');
const operationTypesModel = require('./operation-types-model');
const playersModel = require('./players-model');
const playersStateModel = require('./players-state-model');
const playersStatsModel = require('./players-stats-model');
const respawnModel = require('./respawn-model');
const rewardsModel = require('./rewards-model');
const rewardsEventsModel = require('./rewards-events-model');
const rewardsEventsStateModel = require('./rewards-events-state-model');
const rewardsModifiersModel = require('./rewards-modifiers-model');
const roomsChangePointsModel = require('./rooms-change-points-model');
const roomsModel = require('./rooms-model');
const roomsReturnPointsModel = require('./rooms-return-points-model');
const scoresDetailModel = require('./scores-detail-model');
const scoresModel = require('./scores-model');
const skillsClassLevelUpAnimationsModel = require('./skills-class-level-up-animations-model');
const skillsClassPathModel = require('./skills-class-path-model');
const skillsClassPathLevelLabelsModel = require('./skills-class-path-level-labels-model');
const skillsClassPathLevelSkillsModel = require('./skills-class-path-level-skills-model');
const skillsGroupsModel = require('./skills-groups-model');
const skillsLevelsModel = require('./skills-levels-model');
const skillsLevelsModifiersConditionsModel = require('./skills-levels-modifiers-conditions-model');
const skillsLevelsModifiersModel = require('./skills-levels-modifiers-model');
const skillsLevelsSetModel = require('./skills-levels-set-model');
const skillsOwnersClassPathModel = require('./skills-owners-class-path-model');
const skillsSkillAnimationsModel = require('./skills-skill-animations-model');
const skillsSkillAttackModel = require('./skills-skill-attack-model');
const skillsSkillModel = require('./skills-skill-model');
const skillsSkillGroupRelationModel = require('./skills-skill-group-relation-model');
const skillsSkillOwnerConditionsModel = require('./skills-skill-owner-conditions-model');
const skillsSkillOwnerEffectsConditionsModel = require('./skills-skill-owner-effects-conditions-model');
const skillsSkillOwnerEffectsModel = require('./skills-skill-owner-effects-model');
const skillsSkillPhysicalDataModel = require('./skills-skill-physical-data-model');
const skillsSkillTargetEffectsConditionsModel = require('./skills-skill-target-effects-conditions-model');
const skillsSkillTargetEffectsModel = require('./skills-skill-target-effects-model');
const skillsSkillTypeModel = require('./skills-skill-type-model');
const snippetsModel = require('./snippets-model');
const statsModel = require('./stats-model');
const targetOptionsModel = require('./target-options-model');
const usersModel = require('./users-model');
const usersLocaleModel = require('./users-locale-model');
const usersLoginModel = require('./users-login-model');
const { entitiesConfig } = require('../../entities-config');
const { entitiesTranslations } = require('../../entities-translations');

let rawRegisteredEntities = {
    adsBanner: adsBannerModel,
    ads: adsModel,
    adsEventVideo: adsEventVideoModel,
    adsPlayed: adsPlayedModel,
    adsProviders: adsProvidersModel,
    adsTypes: adsTypesModel,
    audioCategories: audioCategoriesModel,
    audio: audioModel,
    audioMarkers: audioMarkersModel,
    audioPlayerConfig: audioPlayerConfigModel,
    chat: chatModel,
    chatMessageTypes: chatMessageTypesModel,
    clan: clanModel,
    clanLevels: clanLevelsModel,
    clanLevelsModifiers: clanLevelsModifiersModel,
    clanMembers: clanMembersModel,
    config: configModel,
    configTypes: configTypesModel,
    dropsAnimations: dropsAnimationsModel,
    features: featuresModel,
    itemsGroup: itemsGroupModel,
    itemsInventory: itemsInventoryModel,
    itemsItem: itemsItemModel,
    itemsItemModifiers: itemsItemModifiersModel,
    itemsTypes: itemsTypesModel,
    locale: localeModel,
    objectsAnimations: objectsAnimationsModel,
    objectsAssets: objectsAssetsModel,
    objects: objectsModel,
    objectsItemsInventory: objectsItemsInventoryModel,
    objectsItemsRequirements: objectsItemsRequirementsModel,
    objectsItemsRewards: objectsItemsRewardsModel,
    objectsSkills: objectsSkillsModel,
    objectsStats: objectsStatsModel,
    objectsTypes: objectsTypesModel,
    operationTypes: operationTypesModel,
    players: playersModel,
    playersState: playersStateModel,
    playersStats: playersStatsModel,
    respawn: respawnModel,
    rewards: rewardsModel,
    rewardsEvents: rewardsEventsModel,
    rewardsEventsState: rewardsEventsStateModel,
    rewardsModifiers: rewardsModifiersModel,
    roomsChangePoints: roomsChangePointsModel,
    rooms: roomsModel,
    roomsReturnPoints: roomsReturnPointsModel,
    scoresDetail: scoresDetailModel,
    scores: scoresModel,
    skillsClassLevelUpAnimations: skillsClassLevelUpAnimationsModel,
    skillsClassPath: skillsClassPathModel,
    skillsClassPathLevelLabels: skillsClassPathLevelLabelsModel,
    skillsClassPathLevelSkills: skillsClassPathLevelSkillsModel,
    skillsGroups: skillsGroupsModel,
    skillsLevels: skillsLevelsModel,
    skillsLevelsModifiersConditions: skillsLevelsModifiersConditionsModel,
    skillsLevelsModifiers: skillsLevelsModifiersModel,
    skillsLevelsSet: skillsLevelsSetModel,
    skillsOwnersClassPath: skillsOwnersClassPathModel,
    skillsSkillAnimations: skillsSkillAnimationsModel,
    skillsSkillAttack: skillsSkillAttackModel,
    skillsSkill: skillsSkillModel,
    skillsSkillGroupRelation: skillsSkillGroupRelationModel,
    skillsSkillOwnerConditions: skillsSkillOwnerConditionsModel,
    skillsSkillOwnerEffectsConditions: skillsSkillOwnerEffectsConditionsModel,
    skillsSkillOwnerEffects: skillsSkillOwnerEffectsModel,
    skillsSkillPhysicalData: skillsSkillPhysicalDataModel,
    skillsSkillTargetEffectsConditions: skillsSkillTargetEffectsConditionsModel,
    skillsSkillTargetEffects: skillsSkillTargetEffectsModel,
    skillsSkillType: skillsSkillTypeModel,
    snippets: snippetsModel,
    stats: statsModel,
    targetOptions: targetOptionsModel,
    users: usersModel,
    usersLocale: usersLocaleModel,
    usersLogin: usersLoginModel
};

module.exports.rawRegisteredEntities = rawRegisteredEntities;

module.exports.entitiesConfig = entitiesConfig;

module.exports.entitiesTranslations = entitiesTranslations;

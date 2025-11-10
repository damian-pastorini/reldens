/**
 *
 * Reldens - Entities Config
 *
 */

const { AdsBannerEntity } = require('./entities/ads-banner-entity');
const { AdsEntity } = require('./entities/ads-entity');
const { AdsEventVideoEntity } = require('./entities/ads-event-video-entity');
const { AdsPlayedEntity } = require('./entities/ads-played-entity');
const { AdsProvidersEntity } = require('./entities/ads-providers-entity');
const { AdsTypesEntity } = require('./entities/ads-types-entity');
const { AudioCategoriesEntity } = require('./entities/audio-categories-entity');
const { AudioEntity } = require('./entities/audio-entity');
const { AudioMarkersEntity } = require('./entities/audio-markers-entity');
const { AudioPlayerConfigEntity } = require('./entities/audio-player-config-entity');
const { ChatEntity } = require('./entities/chat-entity');
const { ChatMessageTypesEntity } = require('./entities/chat-message-types-entity');
const { ClanEntity } = require('./entities/clan-entity');
const { ClanLevelsEntity } = require('./entities/clan-levels-entity');
const { ClanLevelsModifiersEntity } = require('./entities/clan-levels-modifiers-entity');
const { ClanMembersEntity } = require('./entities/clan-members-entity');
const { ConfigEntity } = require('./entities/config-entity');
const { ConfigTypesEntity } = require('./entities/config-types-entity');
const { DropsAnimationsEntity } = require('./entities/drops-animations-entity');
const { FeaturesEntity } = require('./entities/features-entity');
const { ItemsGroupEntity } = require('./entities/items-group-entity');
const { ItemsInventoryEntity } = require('./entities/items-inventory-entity');
const { ItemsItemEntity } = require('./entities/items-item-entity');
const { ItemsItemModifiersEntity } = require('./entities/items-item-modifiers-entity');
const { ItemsTypesEntity } = require('./entities/items-types-entity');
const { LocaleEntity } = require('./entities/locale-entity');
const { ObjectsAnimationsEntity } = require('./entities/objects-animations-entity');
const { ObjectsAssetsEntity } = require('./entities/objects-assets-entity');
const { ObjectsEntity } = require('./entities/objects-entity');
const { ObjectsItemsInventoryEntity } = require('./entities/objects-items-inventory-entity');
const { ObjectsItemsRequirementsEntity } = require('./entities/objects-items-requirements-entity');
const { ObjectsItemsRewardsEntity } = require('./entities/objects-items-rewards-entity');
const { ObjectsSkillsEntity } = require('./entities/objects-skills-entity');
const { ObjectsStatsEntity } = require('./entities/objects-stats-entity');
const { ObjectsTypesEntity } = require('./entities/objects-types-entity');
const { OperationTypesEntity } = require('./entities/operation-types-entity');
const { PlayersEntity } = require('./entities/players-entity');
const { PlayersStateEntity } = require('./entities/players-state-entity');
const { PlayersStatsEntity } = require('./entities/players-stats-entity');
const { RespawnEntity } = require('./entities/respawn-entity');
const { RewardsEntity } = require('./entities/rewards-entity');
const { RewardsEventsEntity } = require('./entities/rewards-events-entity');
const { RewardsEventsStateEntity } = require('./entities/rewards-events-state-entity');
const { RewardsModifiersEntity } = require('./entities/rewards-modifiers-entity');
const { RoomsChangePointsEntity } = require('./entities/rooms-change-points-entity');
const { RoomsEntity } = require('./entities/rooms-entity');
const { RoomsReturnPointsEntity } = require('./entities/rooms-return-points-entity');
const { ScoresDetailEntity } = require('./entities/scores-detail-entity');
const { ScoresEntity } = require('./entities/scores-entity');
const { SkillsClassLevelUpAnimationsEntity } = require('./entities/skills-class-level-up-animations-entity');
const { SkillsClassPathEntity } = require('./entities/skills-class-path-entity');
const { SkillsClassPathLevelLabelsEntity } = require('./entities/skills-class-path-level-labels-entity');
const { SkillsClassPathLevelSkillsEntity } = require('./entities/skills-class-path-level-skills-entity');
const { SkillsGroupsEntity } = require('./entities/skills-groups-entity');
const { SkillsLevelsEntity } = require('./entities/skills-levels-entity');
const { SkillsLevelsModifiersConditionsEntity } = require('./entities/skills-levels-modifiers-conditions-entity');
const { SkillsLevelsModifiersEntity } = require('./entities/skills-levels-modifiers-entity');
const { SkillsLevelsSetEntity } = require('./entities/skills-levels-set-entity');
const { SkillsOwnersClassPathEntity } = require('./entities/skills-owners-class-path-entity');
const { SkillsSkillAnimationsEntity } = require('./entities/skills-skill-animations-entity');
const { SkillsSkillAttackEntity } = require('./entities/skills-skill-attack-entity');
const { SkillsSkillEntity } = require('./entities/skills-skill-entity');
const { SkillsSkillGroupRelationEntity } = require('./entities/skills-skill-group-relation-entity');
const { SkillsSkillOwnerConditionsEntity } = require('./entities/skills-skill-owner-conditions-entity');
const { SkillsSkillOwnerEffectsConditionsEntity } = require('./entities/skills-skill-owner-effects-conditions-entity');
const { SkillsSkillOwnerEffectsEntity } = require('./entities/skills-skill-owner-effects-entity');
const { SkillsSkillPhysicalDataEntity } = require('./entities/skills-skill-physical-data-entity');
const { SkillsSkillTargetEffectsConditionsEntity } = require('./entities/skills-skill-target-effects-conditions-entity');
const { SkillsSkillTargetEffectsEntity } = require('./entities/skills-skill-target-effects-entity');
const { SkillsSkillTypeEntity } = require('./entities/skills-skill-type-entity');
const { SnippetsEntity } = require('./entities/snippets-entity');
const { StatsEntity } = require('./entities/stats-entity');
const { TargetOptionsEntity } = require('./entities/target-options-entity');
const { UsersEntity } = require('./entities/users-entity');
const { UsersLocaleEntity } = require('./entities/users-locale-entity');
const { UsersLoginEntity } = require('./entities/users-login-entity');

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

let entitiesConfig = {
    adsBanner: AdsBannerEntity.propertiesConfig(adsMenu),
    ads: AdsEntity.propertiesConfig(adsMenu),
    adsEventVideo: AdsEventVideoEntity.propertiesConfig(adsMenu),
    adsPlayed: AdsPlayedEntity.propertiesConfig(adsMenu),
    adsProviders: AdsProvidersEntity.propertiesConfig(adsMenu),
    adsTypes: AdsTypesEntity.propertiesConfig(adsMenu),
    audioCategories: AudioCategoriesEntity.propertiesConfig(audioMenu),
    audio: AudioEntity.propertiesConfig(audioMenu),
    audioMarkers: AudioMarkersEntity.propertiesConfig(audioMenu),
    audioPlayerConfig: AudioPlayerConfigEntity.propertiesConfig(audioMenu),
    chat: ChatEntity.propertiesConfig(chatMenu),
    chatMessageTypes: ChatMessageTypesEntity.propertiesConfig(chatMenu),
    clan: ClanEntity.propertiesConfig(clanMenu),
    clanLevels: ClanLevelsEntity.propertiesConfig(clanMenu),
    clanLevelsModifiers: ClanLevelsModifiersEntity.propertiesConfig(clanMenu),
    clanMembers: ClanMembersEntity.propertiesConfig(clanMenu),
    config: ConfigEntity.propertiesConfig(settingsMenu),
    configTypes: ConfigTypesEntity.propertiesConfig(settingsMenu),
    dropsAnimations: DropsAnimationsEntity.propertiesConfig(rewardsMenu),
    features: FeaturesEntity.propertiesConfig(featuresMenu),
    itemsGroup: ItemsGroupEntity.propertiesConfig(itemsMenu),
    itemsInventory: ItemsInventoryEntity.propertiesConfig(itemsMenu),
    itemsItem: ItemsItemEntity.propertiesConfig(itemsMenu),
    itemsItemModifiers: ItemsItemModifiersEntity.propertiesConfig(itemsMenu),
    itemsTypes: ItemsTypesEntity.propertiesConfig(itemsMenu),
    locale: LocaleEntity.propertiesConfig(snippetsMenu),
    objectsAnimations: ObjectsAnimationsEntity.propertiesConfig(objectsMenu),
    objectsAssets: ObjectsAssetsEntity.propertiesConfig(objectsMenu),
    objects: ObjectsEntity.propertiesConfig(objectsMenu),
    objectsItemsInventory: ObjectsItemsInventoryEntity.propertiesConfig(objectsMenu),
    objectsItemsRequirements: ObjectsItemsRequirementsEntity.propertiesConfig(objectsMenu),
    objectsItemsRewards: ObjectsItemsRewardsEntity.propertiesConfig(objectsMenu),
    objectsSkills: ObjectsSkillsEntity.propertiesConfig(objectsMenu),
    objectsStats: ObjectsStatsEntity.propertiesConfig(objectsMenu),
    objectsTypes: ObjectsTypesEntity.propertiesConfig(objectsMenu),
    operationTypes: OperationTypesEntity.propertiesConfig(settingsMenu),
    players: PlayersEntity.propertiesConfig(usersMenu),
    playersState: PlayersStateEntity.propertiesConfig(usersMenu),
    playersStats: PlayersStatsEntity.propertiesConfig(usersMenu),
    respawn: RespawnEntity.propertiesConfig(respawnMenu),
    rewards: RewardsEntity.propertiesConfig(rewardsMenu),
    rewardsEvents: RewardsEventsEntity.propertiesConfig(rewardsMenu),
    rewardsEventsState: RewardsEventsStateEntity.propertiesConfig(rewardsMenu),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(rewardsMenu),
    roomsChangePoints: RoomsChangePointsEntity.propertiesConfig(roomsMenu),
    rooms: RoomsEntity.propertiesConfig(roomsMenu),
    roomsReturnPoints: RoomsReturnPointsEntity.propertiesConfig(roomsMenu),
    scoresDetail: ScoresDetailEntity.propertiesConfig(usersMenu),
    scores: ScoresEntity.propertiesConfig(usersMenu),
    skillsClassLevelUpAnimations: SkillsClassLevelUpAnimationsEntity.propertiesConfig(classPathMenu),
    skillsClassPath: SkillsClassPathEntity.propertiesConfig(classPathMenu),
    skillsClassPathLevelLabels: SkillsClassPathLevelLabelsEntity.propertiesConfig(classPathMenu),
    skillsClassPathLevelSkills: SkillsClassPathLevelSkillsEntity.propertiesConfig(classPathMenu),
    skillsGroups: SkillsGroupsEntity.propertiesConfig(skillsMenu),
    skillsLevels: SkillsLevelsEntity.propertiesConfig(classPathMenu),
    skillsLevelsModifiersConditions: SkillsLevelsModifiersConditionsEntity.propertiesConfig(classPathMenu),
    skillsLevelsModifiers: SkillsLevelsModifiersEntity.propertiesConfig(classPathMenu),
    skillsLevelsSet: SkillsLevelsSetEntity.propertiesConfig(classPathMenu),
    skillsOwnersClassPath: SkillsOwnersClassPathEntity.propertiesConfig(usersMenu),
    skillsSkillAnimations: SkillsSkillAnimationsEntity.propertiesConfig(skillsMenu),
    skillsSkillAttack: SkillsSkillAttackEntity.propertiesConfig(skillsMenu),
    skillsSkill: SkillsSkillEntity.propertiesConfig(skillsMenu),
    skillsSkillGroupRelation: SkillsSkillGroupRelationEntity.propertiesConfig(skillsMenu),
    skillsSkillOwnerConditions: SkillsSkillOwnerConditionsEntity.propertiesConfig(skillsMenu),
    skillsSkillOwnerEffectsConditions: SkillsSkillOwnerEffectsConditionsEntity.propertiesConfig(skillsMenu),
    skillsSkillOwnerEffects: SkillsSkillOwnerEffectsEntity.propertiesConfig(skillsMenu),
    skillsSkillPhysicalData: SkillsSkillPhysicalDataEntity.propertiesConfig(skillsMenu),
    skillsSkillTargetEffectsConditions: SkillsSkillTargetEffectsConditionsEntity.propertiesConfig(skillsMenu),
    skillsSkillTargetEffects: SkillsSkillTargetEffectsEntity.propertiesConfig(skillsMenu),
    skillsSkillType: SkillsSkillTypeEntity.propertiesConfig(skillsMenu),
    snippets: SnippetsEntity.propertiesConfig(snippetsMenu),
    stats: StatsEntity.propertiesConfig(usersMenu),
    targetOptions: TargetOptionsEntity.propertiesConfig(objectsMenu),
    users: UsersEntity.propertiesConfig(usersMenu),
    usersLocale: UsersLocaleEntity.propertiesConfig(usersMenu),
    usersLogin: UsersLoginEntity.propertiesConfig(usersMenu)
};

module.exports.entitiesConfig = entitiesConfig;

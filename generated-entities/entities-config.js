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

let entitiesConfig = {
    adsBanner: AdsBannerEntity.propertiesConfig(),
    ads: AdsEntity.propertiesConfig(),
    adsEventVideo: AdsEventVideoEntity.propertiesConfig(),
    adsPlayed: AdsPlayedEntity.propertiesConfig(),
    adsProviders: AdsProvidersEntity.propertiesConfig(),
    adsTypes: AdsTypesEntity.propertiesConfig(),
    audioCategories: AudioCategoriesEntity.propertiesConfig(),
    audio: AudioEntity.propertiesConfig(),
    audioMarkers: AudioMarkersEntity.propertiesConfig(),
    audioPlayerConfig: AudioPlayerConfigEntity.propertiesConfig(),
    chat: ChatEntity.propertiesConfig(),
    chatMessageTypes: ChatMessageTypesEntity.propertiesConfig(),
    clan: ClanEntity.propertiesConfig(),
    clanLevels: ClanLevelsEntity.propertiesConfig(),
    clanLevelsModifiers: ClanLevelsModifiersEntity.propertiesConfig(),
    clanMembers: ClanMembersEntity.propertiesConfig(),
    config: ConfigEntity.propertiesConfig(),
    configTypes: ConfigTypesEntity.propertiesConfig(),
    dropsAnimations: DropsAnimationsEntity.propertiesConfig(),
    features: FeaturesEntity.propertiesConfig(),
    itemsGroup: ItemsGroupEntity.propertiesConfig(),
    itemsInventory: ItemsInventoryEntity.propertiesConfig(),
    itemsItem: ItemsItemEntity.propertiesConfig(),
    itemsItemModifiers: ItemsItemModifiersEntity.propertiesConfig(),
    itemsTypes: ItemsTypesEntity.propertiesConfig(),
    locale: LocaleEntity.propertiesConfig(),
    objectsAnimations: ObjectsAnimationsEntity.propertiesConfig(),
    objectsAssets: ObjectsAssetsEntity.propertiesConfig(),
    objects: ObjectsEntity.propertiesConfig(),
    objectsItemsInventory: ObjectsItemsInventoryEntity.propertiesConfig(),
    objectsItemsRequirements: ObjectsItemsRequirementsEntity.propertiesConfig(),
    objectsItemsRewards: ObjectsItemsRewardsEntity.propertiesConfig(),
    objectsSkills: ObjectsSkillsEntity.propertiesConfig(),
    objectsStats: ObjectsStatsEntity.propertiesConfig(),
    objectsTypes: ObjectsTypesEntity.propertiesConfig(),
    operationTypes: OperationTypesEntity.propertiesConfig(),
    players: PlayersEntity.propertiesConfig(),
    playersState: PlayersStateEntity.propertiesConfig(),
    playersStats: PlayersStatsEntity.propertiesConfig(),
    respawn: RespawnEntity.propertiesConfig(),
    rewards: RewardsEntity.propertiesConfig(),
    rewardsEvents: RewardsEventsEntity.propertiesConfig(),
    rewardsEventsState: RewardsEventsStateEntity.propertiesConfig(),
    rewardsModifiers: RewardsModifiersEntity.propertiesConfig(),
    roomsChangePoints: RoomsChangePointsEntity.propertiesConfig(),
    rooms: RoomsEntity.propertiesConfig(),
    roomsReturnPoints: RoomsReturnPointsEntity.propertiesConfig(),
    scoresDetail: ScoresDetailEntity.propertiesConfig(),
    scores: ScoresEntity.propertiesConfig(),
    skillsClassLevelUpAnimations: SkillsClassLevelUpAnimationsEntity.propertiesConfig(),
    skillsClassPath: SkillsClassPathEntity.propertiesConfig(),
    skillsClassPathLevelLabels: SkillsClassPathLevelLabelsEntity.propertiesConfig(),
    skillsClassPathLevelSkills: SkillsClassPathLevelSkillsEntity.propertiesConfig(),
    skillsGroups: SkillsGroupsEntity.propertiesConfig(),
    skillsLevels: SkillsLevelsEntity.propertiesConfig(),
    skillsLevelsModifiersConditions: SkillsLevelsModifiersConditionsEntity.propertiesConfig(),
    skillsLevelsModifiers: SkillsLevelsModifiersEntity.propertiesConfig(),
    skillsLevelsSet: SkillsLevelsSetEntity.propertiesConfig(),
    skillsOwnersClassPath: SkillsOwnersClassPathEntity.propertiesConfig(),
    skillsSkillAnimations: SkillsSkillAnimationsEntity.propertiesConfig(),
    skillsSkillAttack: SkillsSkillAttackEntity.propertiesConfig(),
    skillsSkill: SkillsSkillEntity.propertiesConfig(),
    skillsSkillGroupRelation: SkillsSkillGroupRelationEntity.propertiesConfig(),
    skillsSkillOwnerConditions: SkillsSkillOwnerConditionsEntity.propertiesConfig(),
    skillsSkillOwnerEffectsConditions: SkillsSkillOwnerEffectsConditionsEntity.propertiesConfig(),
    skillsSkillOwnerEffects: SkillsSkillOwnerEffectsEntity.propertiesConfig(),
    skillsSkillPhysicalData: SkillsSkillPhysicalDataEntity.propertiesConfig(),
    skillsSkillTargetEffectsConditions: SkillsSkillTargetEffectsConditionsEntity.propertiesConfig(),
    skillsSkillTargetEffects: SkillsSkillTargetEffectsEntity.propertiesConfig(),
    skillsSkillType: SkillsSkillTypeEntity.propertiesConfig(),
    snippets: SnippetsEntity.propertiesConfig(),
    stats: StatsEntity.propertiesConfig(),
    targetOptions: TargetOptionsEntity.propertiesConfig(),
    users: UsersEntity.propertiesConfig(),
    usersLocale: UsersLocaleEntity.propertiesConfig(),
    usersLogin: UsersLoginEntity.propertiesConfig()
};

module.exports.entitiesConfig = entitiesConfig;

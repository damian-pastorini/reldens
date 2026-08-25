/** Opaque reldens AdminManager instance. */
export type AdminManager = object;
/** Opaque reldens AnimationEngine instance. */
export type AnimationEngine = object;
/** Opaque reldens AudioManager instance. */
export type AudioManager = object;
/** Opaque reldens ChatUi instance. */
export type ChatUi = object;
/** Opaque reldens Client instance. */
export type Client = object;
/** Opaque reldens ClientStartHandler instance. */
export type ClientStartHandler = object;
/** Opaque reldens CollisionsManager instance. */
export type CollisionsManager = object;
/** Opaque reldens ConfigManager instance. */
export type ConfigManager = object;
/** Opaque reldens EnemyObject instance. */
export type EnemyObject = object;
/** Opaque reldens FeaturesManager instance. */
export type FeaturesManager = object;
/** Opaque reldens GameEngine instance. */
export type GameEngine = object;
/** Opaque reldens GameManager instance. */
export type GameManager = object;
/** Opaque reldens HTMLFormElement instance. */
export type HTMLFormElement = object;
/** Opaque reldens HTMLInputElement instance. */
export type HTMLInputElement = object;
/** Opaque reldens LoginManager instance. */
export type LoginManager = object;
/** Opaque reldens Manager instance. */
export type Manager = object;
/** Opaque reldens Minimap instance. */
export type Minimap = object;
/** Opaque reldens ObjectsManager instance. */
export type ObjectsManager = object;
/** Opaque reldens ObjectsPlugin instance. */
export type ObjectsPlugin = object;
/** Opaque reldens P2world instance. */
export type P2world = object;
/** Opaque reldens Player instance. */
export type Player = object;
/** Opaque reldens PlayerEngine instance. */
export type PlayerEngine = object;
/** Opaque reldens PlayerState instance. */
export type PlayerState = object;
/** Opaque reldens Pve instance. */
export type Pve = object;
/** Opaque reldens Room instance. */
export type Room = object;
/** Opaque reldens RoomEvents instance. */
export type RoomEvents = object;
/** Opaque reldens RoomGame instance. */
export type RoomGame = object;
/** Opaque reldens RoomLogin instance. */
export type RoomLogin = object;
/** Opaque reldens RoomRespawn instance. */
export type RoomRespawn = object;
/** Opaque reldens RoomScene instance. */
export type RoomScene = object;
/** Opaque reldens RoomsManager instance. */
export type RoomsManager = object;
/** Opaque reldens SceneDynamic instance. */
export type SceneDynamic = object;
/** Opaque reldens ScenePreloader instance. */
export type ScenePreloader = object;
/** Opaque reldens ServerManager instance. */
export type ServerManager = object;
/** Opaque reldens TeamsPlugin instance. */
export type TeamsPlugin = object;
/** Opaque reldens TemplateReloader instance. */
export type TemplateReloader = object;
/** Opaque reldens UsersModel instance. */
export type UsersModel = object;
/** Opaque reldens UsersPlugin instance. */
export type UsersPlugin = object;
/** Events whose listeners receive ONE object; keys per event. */
export interface ReldensObjectEventPayloads {
    "reldens.adminAfterEntityDelete": { adminManager: AdminManager; driverResource: object; idProperty: string; ids: number[]; };
    "reldens.adminAfterEntitySave": { adminManager: AdminManager; driverResource: object; entityData: object; entityPath: string; req: object; res: object; };
    "reldens.adminBeforeEntityEdit": { adminManager: AdminManager; driverResource: object; entityPath: string; req: object; res: object; };
    "reldens.adminBeforeEntityLoad": { adminManager: AdminManager; driverResource: object; entityId: string; };
    "reldens.adminBeforeEntitySave": { adminManager: AdminManager; driverResource: object; entityPath: string; req: object; res: object; };
    "reldens.adminBeforeFieldRender": { adminContentsRender: object; adminFilesContents: object; adminManager: AdminManager; driverResource: object; loadedEntity: object; property: object; propertyKey: string; renderedEditProperties: object; req: object; templateData: object; };
    "reldens.adminEditPropertiesPopulation": { adminManager: AdminManager; driverResource: object; entityData: object; entityId: string; loadedEntity: object; renderedEditProperties: object; req: object; };
    "reldens.adminIsAuthenticated": { adminManager: AdminManager; allowContinue: { result: boolean; callback: null; }; next: object; req: object; res: object; };
    "reldens.adminListPropertiesPopulation": { adminManager: AdminManager; driverResource: object; listProperties: object; req: object; };
    "reldens.adminSideBarBeforeRender": { adminManager: AdminManager; navigationContents: object; navigationView: string; };
    "reldens.adminSideBarBeforeSubItems": { adminManager: AdminManager; navigationContents: object; };
    "reldens.adminViewPropertiesPopulation": { adminManager: AdminManager; driverResource: object; idProperty: string; loadedEntity: object; renderedViewProperties: object; req: object; };
    "reldens.afterContentProcess": { processedContent: string; renderContext: object; variables: object; };
    "reldens.afterCreateAdminManager": { serverManager: ServerManager; };
    "reldens.afterEnrichPlayerWithLocale": { client: Client; roomGame: RoomGame; superInitialGameData: object; userModel: UsersModel; };
    "reldens.afterGiveRewards": { itemRewards: object[]; playerSchema: object; targetObject: object; winningRewards: object; };
    "reldens.afterPlayerJoinedClan": { clan: object; playerJoining: PlayerState; };
    "reldens.afterPlayerJoinedTeam": { currentTeam: object; playerJoining: PlayerState; };
    "reldens.afterRunAdditionalRespawnSetup": { clonedObjProps: object; multipleObj: object; objClass: object; objInstance: object; objectIndex: number; respawnArea: object; roomRespawn: RoomRespawn; };
    "reldens.afterRunAdditionalSetup": { objectData: object; objectInstance: object; objectsManager: ObjectsManager; };
    "reldens.afterTeamLeave": { currentTeam: object; leavingPlayerName: string; };
    "reldens.afterVariablesCreated": { renderContext: object; variables: object; };
    "reldens.battleEnded": { actionData: object; playerSchema: PlayerState; pve: Pve; room: RoomScene; };
    "reldens.beforeClanDisband": { continueDisband: boolean; playerSchema: PlayerState; singleRemoveId: number; teamsPlugin: TeamsPlugin; };
    "reldens.beforeClanJoin": { clanToJoin: object; continueBeforeJoin: boolean; teamsPlugin: TeamsPlugin; };
    "reldens.beforeClanUpdatePlayers": { clanToJoin: object; continueBeforeJoinUpdate: boolean; teamsPlugin: TeamsPlugin; };
    "reldens.beforeContentProcess": { content: string; renderContext: object; variables: object; };
    "reldens.beforeCreateAdminManager": { serverManager: ServerManager; };
    "reldens.beforeEnrichPlayerWithClan": { client: object; continueProcess: boolean; playerSchema: PlayerState; room: RoomScene; teamsPlugin: TeamsPlugin; };
    "reldens.beforeEnrichPlayerWithClanUpdate": { client: object; continueProcess: boolean; playerSchema: PlayerState; room: RoomScene; teamsPlugin: TeamsPlugin; };
    "reldens.beforeGetParsedValue": { config: object; configManager: ConfigManager; };
    "reldens.beforeGiveRewards": { continueEvent: boolean; playerSchema: object; targetObject: object; };
    "reldens.beforeInitializeManagers": { continueProcess: boolean; serverManager: ServerManager; };
    "reldens.beforeJoinGame": { formData: object; gameManager: GameManager; isNewUser: boolean; };
    "reldens.beforeLoadConfigurations": { configManager: ConfigManager; };
    "reldens.beforeRemovingDroppedReward": { client: object; continueEvent: boolean; playerSchema: object; room: object; roomObject: object; };
    "reldens.beforeSceneExecuteMessages": { canContinue: boolean; client: Client; messageData: object; playerSchema: PlayerState; room: RoomScene; };
    "reldens.beforeSetupAdminManager": { serverManager: ServerManager; };
    "reldens.beforeTeamCreate": { continueBeforeCreate: boolean; teamProps: object; teamsPlugin: TeamsPlugin; };
    "reldens.beforeTeamDisband": { playerSchema: PlayerState; room: RoomScene; singleRemoveId: number; teamsPlugin: TeamsPlugin; continueDisband?: boolean; continueLeave?: boolean; };
    "reldens.beforeTeamJoin": { continueBeforeJoin: boolean; currentTeam: object; teamsPlugin: TeamsPlugin; };
    "reldens.beforeTeamUpdatePlayers": { continueBeforeJoinUpdate: boolean; currentTeam: object; teamsPlugin: TeamsPlugin; };
    "reldens.buildAdminContentsAfter": { adminManager: AdminManager; };
    "reldens.clanDisconnectAfterSendUpdate": { continueLeave: boolean; playerSchema: PlayerState; teamsPlugin: TeamsPlugin; };
    "reldens.clanDisconnectBeforeSendUpdate": { playerId: number; playerSchema: PlayerState; sendUpdate: object; teamsPlugin: TeamsPlugin; };
    "reldens.clanJoinInviteRejected": { clanInvite: object; clientSendingInvite: Client; playerRejectingName: string; };
    "reldens.clanLeave": { message: object; playerSchema: PlayerState; teamsPlugin: TeamsPlugin; };
    "reldens.clanLeaveAfterSendUpdate": { continueLeave: boolean; playerSchema: PlayerState; singleRemoveId: number; teamsPlugin: TeamsPlugin; };
    "reldens.clanLeaveBeforeSendUpdate": { currentClan: object; disbandClan: boolean; playerId: number; playerSchema: PlayerState; sendUpdate: object; singleRemoveId: number; teamsPlugin: TeamsPlugin; };
    "reldens.closeUI": { closeButton: boolean; ui: ChatUi; box?: object; dialogBox?: object; dialogContainer?: object; minimap?: Minimap; openButton?: boolean; uiScene?: object; };
    "reldens.cmsManagerInitializeServices": { manager: Manager; };
    "reldens.createAnimationAfter": { animationEngine: AnimationEngine; };
    "reldens.createAppServer": { continueProcess: boolean; serverManager: ServerManager; };
    "reldens.createCurrentPlayer": { key: string; player: PlayerState; previousScene: string | boolean; roomEvents: RoomEvents; };
    "reldens.createEngineSceneDone": { currentScene: SceneDynamic; previousScene: string | boolean; roomEvents: RoomEvents; };
    "reldens.createGameServer": { continueProcess: boolean; options: object; };
    "reldens.createdUserInterface": { ObjectsPlugin: ObjectsPlugin; gameManager: GameManager; id: string; userInterface: object; };
    "reldens.createdWorldObject": { bodyMass: number; bodyObject: object; collision: boolean; hasState: boolean; objectIndex: number; p2world: P2world; pathFinder: object; posX: number; posY: number; roomObject: object; tileH: number; tileW: number; };
    "reldens.disconnectLoggedBefore": { client: Client; player: object; room: RoomScene; userModel: UsersModel; };
    "reldens.dynamicForm.afterSave": { formConfig: object; preparedValues: object; result: object; };
    "reldens.dynamicForm.afterValidation": { formConfig: object; formKey: string; req: object; submittedValues: object; validationResult: { isValid: boolean; }; };
    "reldens.dynamicForm.beforeSave": { formConfig: object; preparedValues: object; };
    "reldens.dynamicForm.beforeValidation": { formConfig: object; formKey: string; req: object; submittedValues: object; };
    "reldens.dynamicFormRenderer.afterFieldsRender": { attributes: object; domain: string; enhancedData: object; fieldsToRender: object; formConfig: object; formFields: object; req: object; systemVariables: object; };
    "reldens.dynamicFormRenderer.beforeFieldsRender": { attributes: object; domain: string; enhancedData: object; fieldsToRender: object; formConfig: object; req: object; systemVariables: object; };
    "reldens.dynamicFormRequestHandler.afterSave": { formConfig: object; formKey: string; req: object; res: object; submissionResult: object; };
    "reldens.dynamicFormRequestHandler.beforeSave": { formConfig: object; formKey: string; preparedValues: object; req: object; res: object; };
    "reldens.dynamicFormRequestHandler.beforeValidation": { formKey: string; req: object; res: object; submittedValues: object; };
    "reldens.endChangedScene": { message: object; roomEvents: RoomEvents; };
    "reldens.endObjectHitObject": { bodyA: object; bodyB: object; priorityObject: object; };
    "reldens.endObjectHitWall": { objectBody: object; };
    "reldens.endPlayerHitChangePoint": { changeData: object; changePoint: object; collisionsManager: CollisionsManager; playerBody: object; playerSchema: PlayerState; };
    "reldens.endPlayerHitObjectBegin": { otherBody: object; playerBody: object; };
    "reldens.endPlayerHitWallEnd": { playerBody: object; wallBody: object; };
    "reldens.eventBuildSideBarBefore": { adminManager: AdminManager; navigationContents: object; };
    "reldens.featuresManagerLoadFeaturesAfter": { featuresCollection: object; featuresManager: FeaturesManager; };
    "reldens.formsTransformer.afterRender": { domain: string; enhancedData: object; formConfig: object; formContent: string; formKey: string; req: object; systemVariables: object; };
    "reldens.formsTransformer.beforeRender": { domain: string; enhancedData: object; fieldsToRender: object; formAttributes: object; formConfig: object; formKey: string; req: object; systemVariables: object; };
    "reldens.guestInvalidChangePoint": { changePoint: object; collisionsManager: CollisionsManager; contactClient: Client; isGuest: boolean; playerBody: object; playerSchema: PlayerState; };
    "reldens.joinRoomEnd": { client: Client; isGuest: boolean; loggedPlayer: object; options: object; roomScene: RoomScene; userModel: UsersModel; };
    "reldens.manager.initializeAdminManager": { adminFilesContents: object; authenticationCallback: object; manager: Manager; translations: object; };
    "reldens.objectBodyChange": { body: object; changes: object; key: string; };
    "reldens.objectBodyChanged": { body: object; key: string; };
    "reldens.objectHitObjectEnd": { bodyA: object; bodyB: object; };
    "reldens.objectHitWallBegin": { continue: boolean; objectBody: object; wall: object; };
    "reldens.onPreparePlayerCreationFormSubmit": { form: object; gameManager: object; usersPlugin: UsersPlugin; };
    "reldens.onPreparePlayerSelectorFormSubmit": { form: object; gameManager: object; select: object; selectedPlayer: object; usersPlugin: UsersPlugin; };
    "reldens.onPrepareSinglePlayerSelectorFormSubmit": { form: HTMLFormElement; gameManager: object; player: object; selectElement: HTMLInputElement; usersPlugin: UsersPlugin; };
    "reldens.onRoomDispose": { result: { confirm: boolean; }; roomId: number; roomName: string; };
    "reldens.onSavePlayerStateBefore": { playerId: number; playerSchema: PlayerState; room: RoomScene; updatePatch: object; updateReady: { continueUpdate: boolean; }; };
    "reldens.onSavePlayerStatsBefore": { client: Client; objectState: { updateReady: boolean; }; playerSchema: PlayerState; room: RoomScene; };
    "reldens.openUI": { openButton: boolean; ui: ChatUi; box?: object; dialogBox?: object; dialogContainer?: object; minimap?: Minimap; uiScene?: object; };
    "reldens.parsingMapLayerAfter": { layer: object; world: P2world; };
    "reldens.parsingMapLayerBefore": { layer: object; world: P2world; };
    "reldens.parsingMapLayersAfterBodiesQueue": { layer: object; world: P2world; };
    "reldens.playerDeath": { affectedProperty: object; attackerPlayer: PlayerState; room: RoomScene; targetClient: Client; targetSchema: PlayerState; };
    "reldens.playerHitObjectEnd": { playerBody: object; result: { stopFull: boolean; continue: boolean; }; };
    "reldens.playerHitPlayer": { bodyA: object; bodyB: object; };
    "reldens.playerHitPlayerEnd": { bodyA: object; bodyB: object; };
    "reldens.playerHitWallBegin": { playerBody: object; wallBody: object; };
    "reldens.playerLeftScene": { code: number; roomEvents: RoomEvents; };
    "reldens.playersOnAddReady": { player: PlayerEngine; previousScene: string | boolean; roomEvents: RoomEvents; };
    "reldens.removePlayerBefore": { playerSchema: PlayerState; room: RoomScene; stateObject: { isRemoveReady: boolean; }; };
    "reldens.restoreObjectAfter": { enemyObject: EnemyObject; room: RoomScene; };
    "reldens.roomLoginOnAuth": { client: Client; loginResult: object; options: object; request: object; result: { confirm: boolean; }; roomLogin: RoomLogin; };
    "reldens.roomLoginOnCreate": { options: object; roomLogin: RoomLogin; };
    "reldens.roomsMessageActionsGlobal": object;
    "reldens.runBattlePveAfter": { attackResult: object; playerSchema: PlayerState; roomScene: RoomScene; target: object; };
    "reldens.runGameOver": { defaultBehavior: boolean; message: object; roomEvents: RoomEvents; };
    "reldens.serverBeforeDefineRooms": { serverManager: ServerManager; };
    "reldens.serverBeforeListen": { serverManager: ServerManager; };
    "reldens.serverBeforeLoginManager": { serverManager: ServerManager; };
    "reldens.serverConfigFeaturesReady": { configProcessor: ConfigManager; serverManager: ServerManager; };
    "reldens.serverConfigReady": { configProcessor: ConfigManager; serverManager: ServerManager; };
    "reldens.serverReady": { serverManager: ServerManager; };
    "reldens.setAudio": { audioManager: AudioManager; categoryKey: string; enabled: boolean; };
    "reldens.setupActions": { enemyObject: EnemyObject; };
    "reldens.setupAdminManagers": { adminManager: AdminManager; };
    "reldens.setupAdminRouter": { adminManager: AdminManager; };
    "reldens.setupAdminRoutes": { adminManager: AdminManager; };
    "reldens.setupEntitiesRoutes": { adminManager: AdminManager; driverResource: object; entityPath: string; entityRoute: string; };
    "reldens.startChangedScene": { message: object; roomEvents: RoomEvents; };
    "reldens.startObjectHitObject": { bodyA: object; bodyB: object; };
    "reldens.startObjectHitWall": { objectBody: object; };
    "reldens.startPlayerHitChangePoint": { changePoint: object; collisionsManager: CollisionsManager; playerBody: object; };
    "reldens.startPlayerHitObjectBegin": { otherBody: object; playerBody: object; };
    "reldens.startPlayerHitWallEnd": { playerBody: object; wallBody: object; };
    "reldens.teamJoinInviteRejected": { playerRejectingName: string; playerSendingInvite: Client; };
    "reldens.teamLeave": { data: object; playerSchema: PlayerState; room: RoomScene; teamsPlugin: TeamsPlugin; };
    "reldens.teamLeaveBeforeSendUpdate": { areLessPlayerThanRequired: boolean; currentTeam: object; isOwnerDisbanding: boolean; playerId: number; playerSchema: PlayerState; room: RoomScene; sendUpdate: object; singleRemoveId: number; teamsPlugin: TeamsPlugin; };
    "reldens.templateReloader.templatesChanged": { changedFiles: object; reloader: TemplateReloader; };
    "reldens.tryClanStart": { client: Client; continueStart: boolean; data: object; playerSchema: PlayerState; room: RoomScene; teamsPlugin: TeamsPlugin; };
    "reldens.tryTeamStart": { client: Client; continueStart: boolean; data: object; playerSchema: PlayerState; room: RoomScene; teamsPlugin: TeamsPlugin; };
}

/** Events whose listeners receive POSITIONAL arguments; the emit argument expressions. */
export interface ReldensPositionalEventArgs {
    "reldens.actionsPrepareEventsListeners": [actionsPlugin: object, classPath: string];
    "reldens.activateRoom": [room: Room, gameManager: GameManager];
    "reldens.activatedRoom": [sceneRoom: Room, gameManager: GameManager];
    "reldens.activatedRoom_": [sceneRoom: Room, gameManager: GameManager];
    "reldens.afterInitEngineAndStartGame": [initialGameData: object, joinedFirstRoom: Room];
    "reldens.afterProcessPlayerDropsBeforeBroadcast": [dropsMappedData: object, eventResult: boolean];
    "reldens.afterProcessRewardsDropsBeforeBroadcast": [dropsMappedData: object, eventResult: boolean];
    "reldens.afterSceneDynamicCreate": [self: SceneDynamic];
    "reldens.allAudiosLoaded": [self: AudioManager, audios: object, currentScene: SceneDynamic, audio: object];
    "reldens.audioLoaded": [self: AudioManager, audios: object, currentScene: SceneDynamic, audio: object];
    "reldens.audioManagerDeleteAudios": [self: AudioManager, room: Room, gameManager: GameManager, message: object];
    "reldens.audioManagerUpdateAudiosLoaded": [self: AudioManager, room: Room, gameManager: GameManager, message: object];
    "reldens.audioManagerUpdateCategoriesLoaded": [self: AudioManager, room: Room, gameManager: GameManager, message: object];
    "reldens.beforeCreateEngine": [initialGameData: object, gameManager: GameManager];
    "reldens.beforeCreateUiScene": [self: ScenePreloader];
    "reldens.beforeEnrichUserWithLocale": [startEvent: object];
    "reldens.beforeInitEngineAndStartGame": [initialGameData: object, gameManager: GameManager];
    "reldens.beforeJoinGameRoom": [gameRoom: Room];
    "reldens.beforePreload": [scenePreloader: ScenePreloader, eventUiScene: object];
    "reldens.beforePreloadUiScene": [self: ScenePreloader];
    "reldens.beforeReconnectGameClient": [message: object, self: RoomEvents];
    "reldens.beforeSceneDynamicCreate": [self: SceneDynamic];
    "reldens.beforeSuperInitialGameData": [superInitialGameData: object, self: RoomGame, client: Client, userModel: UsersModel];
    "reldens.changeSceneDestroyPrevious": [self: SceneDynamic];
    "reldens.chatMessageObjectCreated": [self: ChatUi, message: object];
    "reldens.clientStartAfter": [self: ClientStartHandler];
    "reldens.clientStartBefore": [self: GameManager];
    "reldens.createDynamicAnimation_": [objectsPlugin: ObjectsPlugin, animProps: object];
    "reldens.createDynamicAnimationsBefore": [objectsPlugin: ObjectsPlugin, sceneDynamic: SceneDynamic];
    "reldens.createEngineScene": [player: PlayerState, room: Room, previousScene: string | boolean, roomEvents: RoomEvents];
    "reldens.createNewPlayerBefore": [loginData: object, playerData: object, self: LoginManager];
    "reldens.createNewPlayerCriticalError": [self: LoginManager, loginData: object, error: object, result: { error: boolean; message: string; }];
    "reldens.createNewUserAfter": [newUser: UsersModel, self: LoginManager, result: object];
    "reldens.createNewUserError": [self: LoginManager, userData: object, result: object];
    "reldens.createPlayerAfter": [client: Client, userModel: UsersModel, currentPlayer: PlayerState, self: RoomScene];
    "reldens.createPlayerAnimations": [scenePreloader: ScenePreloader, avatarKey: string];
    "reldens.createPlayerBefore": [client: Client, userModel: UsersModel, self: RoomScene];
    "reldens.createPlayerStatsAfter": [client: Client, userModel: UsersModel, currentPlayer: PlayerState, roomScene: RoomScene];
    "reldens.createPreload": [scenePreloader: ScenePreloader, eventUiScene: object];
    "reldens.createUiScene": [self: ScenePreloader];
    "reldens.createWorld": [roomData: object, objectsManager: ObjectsManager, self: RoomScene];
    "reldens.createdMinimap": [self: Minimap];
    "reldens.createdNewPlayer": [player: object, loginData: object, self: LoginManager, result: { error: boolean; }];
    "reldens.createdPlayerSchema": [client: Client, userModel: UsersModel, currentPlayer: PlayerState, self: RoomScene];
    "reldens.createdPreloaderInstance": [self: RoomEvents, scenePreloader: ScenePreloader];
    "reldens.createdPreloaderRecurring": [self: RoomEvents, scenePreloader: ScenePreloader];
    "reldens.createdRoomsEventsInstance": [joinedFirstRoom: Room, gameManager: GameManager];
    "reldens.defineRoomsInGameServerDone": [self: RoomsManager];
    "reldens.gameEngineClearTarget": [gameEngine: GameEngine, clearedTargetData: object];
    "reldens.gameEngineShowTarget": [gameEngine: GameEngine, target: object, previousTarget: object, targetName: string];
    "reldens.gameEngineTabTarget": [gameEngine: GameEngine, closerTarget: object, previousTarget: object];
    "reldens.gameOver": [message: object, self: RoomEvents];
    "reldens.gameOverReload": [self: RoomEvents, defaultReload: { confirmed: boolean; }];
    "reldens.gameRoomError": [self: GameManager];
    "reldens.guestLoginInvalidParams": [self: LoginManager, user: UsersModel, userData: object, result: { error: string; }];
    "reldens.initUiAfter": [message: object, self: RoomEvents];
    "reldens.initUiBefore": [message: object, self: RoomEvents];
    "reldens.invalidData": [self: LoginManager, userData: object, result: { error: string; }];
    "reldens.joinRoomInvalid": [self: RoomScene, client: Client, options: object, userModel: UsersModel, isGuest: boolean];
    "reldens.joinRoomStart": [self: RoomScene, client: Client, options: object, userModel: UsersModel];
    "reldens.joinedRoom": [sceneRoom: Room, gameManager: GameManager];
    "reldens.joinedRoom_": [sceneRoom: Room, gameManager: GameManager];
    "reldens.loadFeature_": [featuresList_featureCode: object, self: FeaturesManager];
    "reldens.loadFeatures": [self: FeaturesManager, featuresCodeList: object];
    "reldens.loginError": [self: LoginManager, user: UsersModel, userData: object, result: object];
    "reldens.loginInvalidParams": [self: LoginManager, user: UsersModel, userData: object, result: { error: string; }];
    "reldens.loginInvalidPassword": [self: LoginManager, user: UsersModel, userData: object, result: { error: string; }];
    "reldens.loginInvalidRole": [self: LoginManager, user: UsersModel, userData: object, result: { error: string; }];
    "reldens.loginSuccess": [self: LoginManager, user: UsersModel, userData: object, result: object];
    "reldens.onJoinRoomGame": [client: Client, options: object, userModel: UsersModel, self: RoomGame];
    "reldens.playerAttack": [message: object, room: RoomScene];
    "reldens.playerEngineAddPlayer": [playerEngine: PlayerEngine, id: string, addPlayerData: object];
    "reldens.playerNewName": [self: LoginManager, loginData: object, result: { error: boolean; message: string; }];
    "reldens.playerNewNameUnavailable": [self: LoginManager, loginData: object, isNameAvailable: boolean, result: { error: boolean; message: string; }];
    "reldens.playerPersistDataAfter": [client: Client, userModel: UsersModel, currentPlayer: PlayerState, params: object, self: RoomScene];
    "reldens.playerPersistDataBefore": [client: Client, userModel: UsersModel, currentPlayer: PlayerState, params: object, self: RoomScene];
    "reldens.playerSceneUnavailable": [self: LoginManager, loginData: object, result: object];
    "reldens.playerStatsUpdateAfter": [message: object, self: RoomEvents];
    "reldens.playerStatsUpdateBefore": [message: object, self: RoomEvents];
    "reldens.playersOnAdd": [player: PlayerState, key: string, previousScene: string | boolean, roomEvents: RoomEvents];
    "reldens.playersOnRemove": [player: PlayerState, key: string, roomEvents: RoomEvents];
    "reldens.playersQueueBefore": [player: PlayerState, key: string, previousScene: string | boolean, roomEvents: RoomEvents];
    "reldens.preloadUiScene": [self: ScenePreloader];
    "reldens.processForgotPassword": [self: LoginManager, userData: object, sendResult: object];
    "reldens.processUserRequestIsValidDataBefore": [self: LoginManager, userData: object];
    "reldens.register": [self: LoginManager, userData: object, result: { error: string; }];
    "reldens.registrationInvalidParams": [self: LoginManager, user: UsersModel, userData: object, result: { error: string; }];
    "reldens.roomsDefinition": [defineExtraRooms: object[]];
    "reldens.roomsMessageActionsByRoom": [roomMessageActions: object, roomName: string];
    "reldens.runPlayerAnimation": [playerEngine: PlayerEngine, playerId: number, playerState: PlayerState, playerSprite: object];
    "reldens.savePlayerStatsUpdateClient": [client: Client, playerSchema: PlayerState, self: RoomScene];
    "reldens.sceneRoomOnCreate": [self: RoomScene];
    "reldens.setSceneOnPlayers": [self: LoginManager, user: UsersModel, userData: object];
    "reldens.startEngineScene": [roomEvents: RoomEvents, player: PlayerState, room: Room, previousScene: string | boolean];
    "reldens.startGameAfter": [self: GameManager];
    "reldens.startGameBefore": [self: GameManager];
    "reldens.updateGameSizeAfter": [gameEngine: GameEngine, newWidth: number, newHeight: number];
    "reldens.updateGameSizeBefore": [gameEngine: GameEngine, newWidth: number, newHeight: number];
}

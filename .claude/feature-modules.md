# Feature Modules Reference

Complete reference for all 24 feature modules under `lib/`.

## Core/Game Management

### Game (`lib/game/`)
Core game engine
- ServerManager - Main server orchestrator (lib/game/server/manager.js)
- GameManager - Main client orchestrator (lib/game/client/game-manager.js)
- Data server configuration
- Entities loader
- Maps loader
- Login manager
- Installation scripts
- Theme manager
- Server health (`lib/game/server/health/`): usage limits, rooms availability between servers and the blocking switch, see `.claude/server-health-monitor.md`
- In memory registries (`lib/game/server/memory/`): `ActivePlayers`, `LoginAttempts` and `KeyedOperationsLock`, which
  runs the async operations per key: `share()` runs one operation per key and gives every waiting caller its result
  (the clan loads), `queue()` runs them one after the other per key (the user locale and the player audio config
  saves); the operations resolve their own errors so the key is always cleared

### Rooms (`lib/rooms/`)
Core multiplayer room system
- `server/scene.js` (RoomScene): Main game room with physics, collisions, objects
- `server/login.js` (RoomLogin): Authentication and player initialization
- Double login: a lobby login of an account that is already online ends the old session in every room, the scene
  removes the old player (the old tab shows the session ended message) and the chat and lobby connections of the old
  tab are closed; every room leave removes only its own session from `ActivePlayers`, so closing the old tab never
  removes the sessions of the new one
- `server/player-relocator.js` (PlayerRelocator): moves a player to a room and position decided by the server, without
  a change point (used by the teleport NPC and the death teleport, see `.claude/gameplay-features.md`)
- Client connects via `lib/game/client/room-events.js` to handle server state synchronization

### World (`lib/world/`)
Physics engine integration (P2.js), pathfinding, collisions
- Authoritative physics calculations
- Collision detection and handling
- Pathfinding algorithms

### Config (`lib/config/`)
Configuration management
- Database-driven configuration
- Environment variable handling
- Runtime configuration overrides

### Features (`lib/features/`)
Plugin-like modular system
- Features are loaded from database (`features` table with `is_enabled` flag)
- `server/manager.js` (FeaturesManager) dynamically loads enabled features
- Each feature can hook into events via `setup()` method
- `plugin-interface.js` (PluginInterface) is the base interface of every feature plugin; the client plugins that require
  the GameManager and the EventsManager extend `client/client-core-plugin.js` (ClientCorePlugin), whose
  `setupCoreProperties(props)` reads both from the setup props and logs the missing one with the plugin class name

## Gameplay Systems

### Actions (`lib/actions/`)
Combat system (PvP/PvE), skills, battle mechanics
- Server handles authoritative battle calculations
- Client receives battle states and renders animations
- `server/battle.js` - Main battle system
- `server/pve.js` - PvE combat logic
- `server/pvp.js` - PvP combat logic
- `reldens.playerDeath` (`server/events/player-death-event.js`) carries `revivePlayerCallback`, the battle revive bound
  to the dead player, so a listener can revive the player without receiving the battle
- `server/room-auto-recovery.js` (with `players-auto-recovery.js`, `objects-auto-recovery.js` and
  `stats-recovery-calculator.js`): the stats auto recovery of every scene room
- `server/player-death-relocator.js` and `server/resurrection-ad-gate.js`: the death teleport to town, the restoration
  item and the resurrection ad (see `.claude/gameplay-features.md`)
- `server/death-revive-notifier.js` and `client/game-over-revive-message.js`: the revive mode shown in the game over box,
  the seconds left to the revive, the revive, restoration item choice and resurrection ad buttons
- `server/death-revive-requests.js`: the revive request and the restoration item choice of the dead player, without the
  auto revive or the restoration item auto consume

### Inventory (`lib/inventory/`)
Items system with equipment and usable items
- Integrates with @reldens/items-system
- Item management, equipment slots, consumables
- `reldens.createPlayerInventoryBeforeSend` (`{client, playerSchema, room, inventoryServer, sendData}`) is emitted
  before the groups data is sent to the joined player (a listener can change `sendData`) and
  `reldens.createPlayerInventoryAfter` (the same event data) after it is sent
- `items_inventory.customData` keeps the data of one item instance, `server/items-growth-applier.js` loads and saves the
  items growth, shares the owner experience with the items and sends the reached level, the growth mechanics are the
  `ItemGrowthLeveler` and `ItemGrowthCalculator` of `@reldens/items-system` (see `.claude/gameplay-features.md`)
- Every new inventory item gets its own Modifier copies targeting its owner (`ItemsFactory.isolateModifiers()` in
  `StorageObserver.saveNewItem()`), the items model data modifiers are shared by every item created from them
- The equip and use messages are rejected for an item key that is not in the inventory or an item of another type
- A trashed equipped item is unequipped first (its modifiers and equip effects, like a skin, are reverted), unless the
  inventory is locked by a trade, which refuses the removal
- On a player death (`server/subscribers/player-death-subscriber.js`) every droppable item is picked at most once, so
  the dropped quantity is the configured one capped by the droppable items, and only the picked equipped items are
  unequipped, the other equipped items stay active

### Respawn (`lib/respawn/`)
Player and NPC respawn system
- Death handling
- Respawn points configuration

### Rewards (`lib/rewards/`)
Loot and rewards system
- Drop tables
- Reward distribution
- The accept of a reward event (`server/rewards-events-message-actions.js`) gives the items only of a `ready` and not
  `complete` state, the accepts of a player run one after the other, every given item is stored in the state
  `givenItems` as soon as it is given (an item the inventory does not add or a rejected give stops the claim, which is
  never sent as accepted), so a claim that failed after some items gives only the missing ones when it is claimed
  again; the completed state drops `givenItems` and a new claim date clears it (`LoginStateHandler.resetRewardState()`)

### Scores (`lib/scores/`)
Leaderboards and ranking system
- Player scores tracking
- Global leaderboards
- Kill points: `server/scores/obtainedScorePerPlayer` plus the killed player level times
  `server/scores/obtainedScorePerPlayerLevelMultiplier`, and the enemy `private_params` `"killScore"` with
  `server/scores/useNpcCustomScore`
- `server/scores-period-reset.js` resets the scores once per period (`server/scores/reset/*`), started by the plugin on
  `reldens.serverReady`, and `server/scores-period-key-builder.js` builds the UTC daily, weekly (ISO) and monthly keys;
  `server/scores-reset-claim.js` reads the pending reset claim shared by the reset and the kill score
- The score updates of a player run one after the other and an existing score row is saved only while it holds the
  read id and counters (`ScoresUpdater.saveScore()`), a changed or deleted row is read again and the update retried
- The scores panel labels (`client/scores/labels/title`, `content` and `myScore`) can be snippet keys or plain texts,
  the `%myScore` of a plain own score label is replaced by the score too
- The top scores (`server/scores-provider.js`) are ordered by the total score and then by the score id, so the full
  scores pages and the top scores cut never list a player twice or skip one; the storage drivers sort by one column,
  so the scores with the first and last total of a page are loaded again sorted by id
- The full scores page (`server/subscriber/create-scores-route.js`) shows the first page for a page parameter that is
  not an integer from 1 (zero, negative, decimal, not numeric or repeated), and uses the default page size
  (`ScoresConst.FULL_TABLE_PAGE_SIZE`) for a `server/scores/fullTableView/pageSize` that is not an integer from 1; the
  player names of the scores table template (`ui-scores-table.html`, used by the page and the panel) are escaped

### Teams (`lib/teams/`)
Party/guild system
- Team formation
- Shared objectives
- Clan levels and bonuses
- Every invite is used once: the team join and decline remove it from `teamPendingInvites`, the clan decline uses
  `Clan.consumeInvite()`, a decline without a pending invite is rejected without notifying the inviter; the clan join
  reserves the invite (`Clan.reserveInvite()`) while the member row is created and releases it as used on success or
  restores it when the creation fails, is rejected or a `reldens.beforeClanJoin` listener cancels it
  (`Clan.releaseInvite()`), so a failed join can be retried, two overlapping accepts add the member once and a decline
  sent while the join runs is rejected
- `Team` and `Clan` extend `SharedModifiersGroup` (`server/shared-modifiers-group.js`): the group level, shared
  properties and modifiers, applied to the joined players (`applyModifiers()`) and reverted when they leave
  (`revertModifiers()`)
- `TeamsPlugin.fetchPlayerClan()` finds the loaded clan of a player (its `privateData.clan`), used by the stats
  updates, the clan disconnection, the clan leave and the saved stats listener, where
  `Clan.revertModifiersOnSavedStats()` saves the stats of the clan players without the clan modifiers
- A clan is loaded once when several members log in together (`CreatePlayerClanHandler` shares the load through a
  `KeyedOperationsLock`), and a failed load resolves to false in `ClanFactory.create()` so the next login loads it again
- The owner joining its team or clan again (a scene change, or a clan a member loaded first) becomes the owner client;
  the scene change record of a team member (`teamChangingRoomPlayers`) is consumed on its next player creation, and a
  member arriving to a team that no longer exists gets the team left message
- Each clan pending invite keeps the player that sent it (`Clan.addInvite()`, dropped by `Clan.declineInvite()` and by
  the join that uses it), so the accepted and rejected lines reach the inviting player, the owner or a member with the
  open invites on
- `ClanLeave.execute()` disbands the clan only when the owner leaves or removes its own id (compared as strings), and
  only a disband is sent as one to the leave listeners: the members get the disbanded line with the owner name, a
  member leaving by itself the left line and a member removed by the owner the removed line
- `ClanCreate` deletes the created clan row when the owner membership is not stored, and the membership and the clan
  row when the clan cannot be loaded, always answering the client; `ClanJoin` saves the joined player data (which sends
  the clan update through the stats save) only after the `reldens.beforeClanUpdatePlayers` listeners let it continue
- Client: a team box removed at runtime removes its preload listeners (`UserInterface.removeEventsListeners()`), the
  team and clan leave buttons are bound inside their own boxes, and declining a clan request shows again the panel of
  the own clan, or the create form for a player with no clan

## Player Systems

### Users (`lib/users/`)
Authentication, registration, player management
- Supports guest users, Firebase authentication
- `lib/game/server/login-manager.js` creates the classes of the login flows in `lib/game/server/`: `GameLogin` (game
  and guest logins), `AdministrationLogin` (administration panel login), `PasswordValidationGuard` (the login checks
  shared by both logins: blocked requests, concurrent validations cap, stored identity block, bans, the rejections
  with their dummy password validation and the failures registration), `UserRegistration` (accounts and
  guests), `PlayerCreation` (new players), `PlayerRoomState` (the states placed in a room and the players state and
  scene on login), `ForgotPassword` (forgot password requests, reset emails and the reset page routes) and
  `UserDisconnection` (disconnection from every room and from the other servers)
- Login protections: failed login lockout with stored address blocks, account bans, registration and guests limits per
  address, see `.claude/ip-lists-and-login-blocks.md`
- The forgot password interval is kept per user in the `users.password_reset_sent_at` column, shared by every server
  and kept after a restart. `UsersManager.reservePasswordResetSentTime()` sets the column with a conditional update
  (empty or older than the interval) before the email is sent, so concurrent requests send a single email, and a
  failed send restores the previous value
- Player creation and management
- Skins: `server/skin-ad-ticket-gate.js` (the skin ticket requests the skin ad and pays its reward) and
  `server/player-skin-applier.js` (an equipped `"skinKey"` item changes the player avatar), and the client
  `client/skins-sprites-preloader.js`, `client/skin-ad-messages-listener.js` and `client/players-skin-switcher.js` (see
  `.claude/gameplay-features.md`)

### Chat (`lib/chat/`)
Multi-channel chat (global, room, private messages)
- Message types and tabs
- Real-time messaging
- The overhead chat is shown only for the messages with a sender, a known chat type (`ChatUi.isValidMessageType()`,
  the `ChatConst.TYPES` values) and a configured chat type

### Audio (`lib/audio/`)
Sound and music system
- Background music management
- Sound effects for actions and events
- Audio configuration per scene/room
- The player audio categories switches are saved with the repository `upsert()`, queued per player and category
  (`AudioManager.savePlayerConfig()`)
- The global audios saved or deleted in the administration panel are sent to every created room
  (`AudioManager.broadcastToCreatedRooms()` with `AudioConst.AUDIO_UPDATE` or `AudioConst.AUDIO_DELETE`)

### Prediction (`lib/prediction/`)
Client-side prediction system
- Reduces perceived latency
- Smooths player movement

## Integration/Support

### Admin (`lib/admin/`)
Admin panel integration with @reldens/cms
- Manages game configuration through web interface
- Handles entity CRUD operations
- Supports hot-plug configuration updates

### Firebase (`lib/firebase/`)
Firebase integration
- Firebase authentication
- Client-side Firebase SDK integration
- `FirebaseIdTokenVerifier` verifies the ID token on the server and only accepts Firebase accounts with a verified
  email; the login is validated by the username and that verified email (`reldens.loginPasswordValidationFallback`
  event), the password sent to the login flow is random, so no Firebase value works on the regular password form
- The accounts created through the Firebase login are stored with the `firebase` origin in the `users.origin` column

### Ads (`lib/ads/`)
Advertisement integration system
- Third-party ad network support (CrazyGames, GameMonetize, Google AdSense), registered in `client/providers-list.js`
- Ad placement configuration
- `server/ads-collection-finder.js` finds an enabled ad (ad and provider enabled) of `server/ads/collection` by its key
  or ID and matches the messages by its ID
- `AD_STARTED` does not disable a dead player and `AD_ENDED` only activates a disabled player
- Only the enabled ads are started and rewarded, a replay ad waits its `"replayCooldown"` (event data, default
  `AdsConst.REPLAY_COOLDOWN`) after its last reward, an `AD_ENDED` before the minimum duration is rejected, `AD_FAILED`
  closes the play without reward, a disabled player is activated again after `server/ads/videoMaximumDuration`, and
  the `reldens.beforeGiveAdRewardItem` subscribers can cancel a reward (see "Ads rewards rules" in
  `.claude/gameplay-features.md`)
- The client ads plugin is preloaded with the page (`FeaturesManager.preloadFeatures()` from
  `GameManager.clientStart()`), so the SDK scripts of the providers enabled in the initial client config (`config.js`)
  are appended before the login and loaded before the game starts; a provider enabled only in the login game config gets
  its script appended on the provider activation (`client/sdk-handler.js`, every SDK URL is appended once)
- The CrazyGames provider (`client/providers/crazy-games.js`) activates its banners and video ads once its SDK is found
  (retried every `sdkRetryTime` up to `sdkMaxRetries`) and no adblock is detected, there is no ad queue; no ad is
  requested while the SDK environment is `disabled`, another ad plays or a non replay ad is in the played ads list
- `client/ads/general/sdkRequired` (off by default): on, the login forms stay hidden until every enabled provider SDK
  script loads and when one fails the page shows the `.ads-sdk-error` block (theme `index.html`) and the game can not
  start (`client/required-sdk-login-guard.js`); on the server start the SDK URLs of the enabled providers are requested
  (`server/required-sdk-reachability-check.js`, timeout `server/ads/sdkCheckTimeout`, the relative URLs are served by
  the same server and skipped) and one that fails stops the start (`continueProcess` of the
  `reldens.serverConfigFeaturesReady` event); off, the game starts without the ads that could not load

### Sync (`lib/sync/`)
Colyseus primitives isolation layer
- `server/colyseus/sync-server-driver.js`: Node-only `Server`, `Room`, `CloseCode`, `WebSocketTransport` and `monitor`
- `shared/colyseus/sync-schema-driver.js`: isomorphic `@colyseus/schema` primitives safe for the client bundle
- `client/colyseus/sync-client-driver.js`: browser `Client` and `getStateCallbacks` from `@colyseus/sdk`

### Import (`lib/import/`)
Data import utilities
- Maps and objects importers, rooms associations creator
- Skills, class paths, attributes and experience per level importers
- Tile and map image extruders, published map merger

### Objects (`lib/objects/`)
Game objects (NPCs, interactables, respawn areas)
- `server/manager.js` loads and manages room objects
- Objects can listen to messages via `listenMessages` interface
- Physical collision behavior is configured via `private_params` in the `objects` DB table:
  - `"collisionType":2` - makes the object body STATIC (p2.js Body.STATIC), blocking the player from walking through it
  - `"collisionType":1` - DYNAMIC body (default), enemies and moving objects use this
  - `"hasState":true` - required alongside `collisionType:2` for respawnable objects that need Colyseus state sync
  - `"collisionType":4` - KINEMATIC body, moved by its own velocity and never pushed, used by the NPCs that wander
  - `"randomMovement":{"maxTiles":3}` - the object wanders around its original tile (`ObjectRandomMovement`), requires
    `hasState:true`
  - See `.claude/collision-configuration-guide.md` for full details
- Timing objects (`server/object/type/timing-object.js`, the mining rocks and the fishing spots) run an action for
  `timingDuration` and give the reward at the end; the `private_params` cancel rules are `"cancelOnMove":true` (the
  player position changed), `"cancelOnHit":true` (the player affected property, `client/actions/skills/affectedProperty`,
  installed as `hp`, decreased between two consecutive checks, a hit from an enemy or another player) and
  `"cancelOnOutOfRange":true` (the player left the interaction area); `TimingObject.startTiming()` runs the checks every
  100 ms and keeps the last affected value on each check, so a heal during the action does not hide a later hit:
  ```js
  let currentAffectedValue = sc.get(playerSchema.stats, affectedProperty, 0);
  if(this.cancelOnHit && currentAffectedValue < lastAffectedValue){
      this.cancelTiming(client);
      return;
  }
  lastAffectedValue = currentAffectedValue;
  ```
  A player that leaves the room (it is not the room state player of its session anymore) stops the timing without a
  message and gets no reward, the object stays busy (`isActive`) until the completion settles, so no other timing
  starts while the reward item is added, and a rejected completion (a failed reward item add) is caught and frees the
  object after it settles, so the object can always be used again
- Teleport objects (`server/object/type/teleport-object.js`, class type `9`) are NPCs whose dialog options move the
  player to the `private_params` `"destinations"` of the chosen option (see `.claude/gameplay-features.md`)

### Snippets (`lib/snippets/`)
Text snippets, locales and translations
- `snippets`, `locale` and `usersLocale` entities for the UI and message texts
- `translator.js` plus the client translations mapper and templates handler; a text that is not a snippet key is
  returned as it is with its `%` parameters replaced
- The settings language selector (`SnippetsUi`) sends the chosen locale with its change time, `UsersLocaleUpdater`
  saves it as the user locale with the repository `upsert()`, queued per user, and ignores the changes older than the
  last one; a failed save sends the error back and `LanguageSaveErrorListener` (registered when the UI is created)
  asks `SnippetsUi.showSaveError()` to show it only for the last change
- Each language option shows the locale country code, or the locale code when it has none, as text; the saved user
  locale is applied on the login only while its locale is enabled (`InitialGameDataEnricher.withLocale()`), otherwise
  the default locale is active
- A message rejected by the room actions rules (`allActionsDisabled` or `disallowedActions` in the room custom data,
  `RoomScene.isAllowedAction()`) emits `reldens.sceneMessageActionNotAllowed` (`{room, client, messageData,
  playerSchema}`); the snippets plugin answers a blocked language change with the save error, so it never fails silently

### Bundlers (`lib/bundlers/`)
Asset bundling driver configuration
- `drivers/parcel-config.json`: the Parcel config `ThemeManager` passes to the client and CSS bundling

### Quests (`lib/quests/`)
Quest progress tracking system (persistence layer only, not a full quest definition system)
- `quests_progress` DB table: per-player and global quest flag storage (`player_id` nullable for global flags)
- `server/plugin.js` (QuestsPlugin): listens `reldens.createPlayerAfter`, queries `questsProgress` entity for player and global rows, sends merged keys to client via `{act: 'playerQuestsData', quests: [...]}` message
- `client/plugin.js` (QuestsClientPlugin): listens `reldens.activateRoom`, stores received quest keys on `gameManager.playerQuestsData`, emits `reldens.playerQuestsLoaded`
- Objects and features consume `gameManager.playerQuestsData` to restore state on room join
- Entity key: `questsProgress` (maps to `quests_progress` table in all storage drivers)

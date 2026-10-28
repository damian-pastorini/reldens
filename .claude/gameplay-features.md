# Gameplay Features

Seven gameplay features: stats auto recovery, the teleport NPC, points per kill by level, item growth, death teleport to
town (with the restoration item and the resurrection ad), the scores reset per period and the ad items that give a
skin.

Every feature lives in its core module and is wired by that module plugin, so it runs only while the module feature is
enabled in the `features` table:

- `actions` (`lib/actions/server/plugin.js`): the auto recovery (`RoomAutoRecovery` on `reldens.sceneRoomOnCreate` and
  `reldens.onRoomDispose`), the death teleport (`PlayerDeathRelocator` on `reldens.playerDeath`) and the resurrection ad
  gate (`ResurrectionAdGate` on `reldens.beforeSceneExecuteMessages`)
- `inventory` (`lib/inventory/server/plugin.js`): the item growth (`ItemsGrowthApplier` on
  `reldens.createPlayerInventoryAfter`)
- `scores` (`lib/scores/server/plugin.js`): the points per kill (`IncreaseScoreOnKill`) and the scores reset
  (`ScoresPeriodReset`, created and started on `reldens.serverReady` with the rooms manager)
- `users` (`lib/users/server/plugin.js`): the skin ticket gate (`SkinAdTicketGate` on
  `reldens.beforeSceneExecuteMessages` and `reldens.beforeGiveAdRewardItem`) and the skin applier (`PlayerSkinApplier`
  on `reldens.createPlayerInventoryAfter`); `lib/users/client/plugin.js` binds the client skins classes in
  `listenSkinsEvents()`
- `objects`: the teleport NPC object type

Every feature with a switch is disabled by default (the `enabled` rows are `0`), and the sample ads are disabled
(`ads.enabled = 0`). An ad is played and rewarded only when the ad and its provider (`ads_providers.enabled`) are
enabled, see "Ads rewards rules" below. The sample items icons are in `theme/default/assets/custom/` and the sample
rows (items, ads, the teleport NPC) are in the sample data files.

## Database changes

Applied to the install and basic config files, both sample data files, and to existing databases by
`migrations/development/rc.1-sql-update.sql`:

- `items_inventory.customData` (TEXT, after `is_active`): the custom data of one item instance, the item growth keeps
  its level and experience there; the update adds it only when the column is missing
- `objects_types` row `9` `teleport`
- the features enabled in the basic config are added when missing (the quests feature was never added by an update),
  the existing features keep their enabled value
- the config rows listed below
- sample data: the `skin` items group (7), the items `restoration_scroll` (9), `skin_ad_ticket` (10),
  `skin_warlock_robe` (11) and `growing_sword` (12, with the `atk` +10 modifier 6), the ads `resurrection-video` (7) and
  `skin-ad-ticket` (8) with their `ads_event_video` rows (3 and 4), the teleport NPC "Portia" (object 43 in the town,
  room 41, asset 33, tile 4640: column 48 of the southern street row 56, away from the players start, because the path
  finder grid does not mark the NPC bodies, so an NPC on the start area blocks the town door walk and changes the
  pathfinding e2e cases) and the `killScore` 8 of the Tree (object 6)

The update adds every sample row only when its key is free (the items, the skin group, the ads, the teleport NPC and its
tile), finds the related rows by their keys (the skin and weapon groups, the `crazyGames` provider, the `eventVideo`
type, the `reldens-new-age-town` room) and merges the Tree `killScore` into its current `private_params` with
`JSON_SET` only when it has none, so the content and the ids of an existing game are never replaced.

After the update on an existing database refresh the entities (`npm exec -- reldens generateEntities --override`),
otherwise `itemsInventory` has no `customData` and the item growth can not load or save the item levels.

## Configuration

- `server/autoRecovery/tickMs` (`5000`): recovery interval of every scene room, read once when the room is created
- `server/autoRecovery/players/enabled` (`0`): players recovery switch
- `server/autoRecovery/players/properties/hp` (`1`): amount recovered per tick, one row per stat key
- `server/autoRecovery/players/persistEveryTicks` (`12`): save the stats in the storage every N recoveries
- `server/autoRecovery/objects/enabled` (`0`): enemies recovery switch
- `server/autoRecovery/objects/onlyOutOfBattle` (`1`): skip the enemies in battle with a player
- `server/autoRecovery/objects/properties/hp` (`1`): amount recovered per tick, one row per stat key
- `server/scores/obtainedScorePerPlayerLevelMultiplier` (`0`): extra points per level of the killed player
- `server/players/death/teleportToTown/enabled` (`0`): death teleport switch
- `server/players/death/teleportToTown/roomId` (`41`): town room, falls back to `server/players/initialState/room_id`
- `server/players/death/restorationItemKey` (`restoration_scroll`): item that revives where the player died
- `server/players/death/resurrectionAdsKey` (`resurrection-video`): ad that rewards the restoration item
- `server/scores/reset/enabled` (`0`): scores reset switch
- `server/scores/reset/period` (`daily`): `daily`, `weekly` or `monthly`
- `server/scores/reset/checkIntervalMs` (`60000`): period check interval, read once on start
- `server/scores/reset/resetDetails` (`0`): also delete the `scores_detail` rows
- `server/scores/reset/lastPeriodKey` (empty): last reset period, written by the reset itself
- `client/players/skins/keys` (`warlock`): skins sprites to preload (comma separated)
- `server/skins/adsKey` (`skin-ad-ticket`): ad played by the skin ticket
- `server/skins/adTicketItemKey` (`skin_ad_ticket`): item that requests the skin ad
- `server/ads/videoMaximumDuration` (no row, `AdsConst.VIDEOS_MAXIMUM_DURATION` `60000`): time after which a player
  disabled by an ad start is activated again when the ad never ends

The config paths and defaults are in `ActionsConst.AUTO_RECOVERY`, `ActionsConst.DEATH`, `ScoresConst.RESET`,
`UsersConst.SKINS` and `AdsConst.CONFIG_PATHS`. The values are read on every use (hot plug applies), except the two
intervals.

## Stats auto recovery

`lib/actions/server/`:

- `RoomAutoRecovery` starts one interval per scene room on `reldens.sceneRoomOnCreate` and clears it on
  `reldens.onRoomDispose`; a tick never overlaps the previous one of the same room and a failed tick is logged and
  releases the room for the next one
- `PlayersAutoRecovery` raises the configured stats of every alive player up to `statsBase`, skipping the dead, the
  disabled, the players changing scene and the ones without a client; every tick emits
  `reldens.savePlayerStatsUpdateClient` and sends the `PLAYER_STATS` message, every `persistEveryTicks` recoveries it
  calls `room.savePlayerStats()` (the count is the `autoRecoveryTicks` private data)
- `ObjectsAutoRecovery` raises the configured stats of every active enemy up to `initialStats`; the enemy
  `private_params` `"autoRecovery"` overrides the amounts (`{"hp": 5}`) or disables it (`false`), and the life bar
  update is broadcast when the life property changed
- `StatsRecoveryCalculator.recover(stats, maxStats, amounts)` never passes the maximum and returns the changed keys

## Teleport NPC

`TeleportObject` (`lib/objects/server/object/type/teleport-object.js`, class type `9`, events prefix `tpnpc`) extends
`NpcObject`. The dialog options come from the `client_params` `"options"` and the destinations from the
`private_params` `"destinations"`, keyed by the option value, so the client only sends the option value:

```json
{"destinations": {"1": {"room": "reldens-forest-level-1"}, "2": {"room": "reldens-new-age-town-house-01", "x": 400, "y": 300, "dir": "down"}}}
```

- an option without destination (the sample "Nowhere") closes the dialog
- a dead or disabled player gets the dialog closed and is never relocated, so the NPC can not skip the death resolution
- a destination without a string `room`, or a room `room.validateRoom()` refuses for that user (guests included), shows
  the `"invalidDestinationMessage"` private param (default `I can not take you there.`)
- otherwise the dialog closes and `PlayerRelocator` moves the player

`PlayerRelocator` (`lib/rooms/server/player-relocator.js`) moves a player without a change point. The same room places
the body on the new position and saves the state; another room runs the change point flow (`isNextRoomAvailable()`, the
state save, the `CHANGING_SCENE` broadcast, `broadcastSceneChange()`). A failed state save restores the previous state
(`RoomScene.replacePlayerState()`) and never sends `CHANGING_SCENE`, so the client keeps the current scene visible.
Without `x` and `y` the destination room default return point is used. A player without body or already changing scene
is skipped, checked again after the destination room load, so overlapping relocations (a double option click) or a
change point started meanwhile run a single scene change. The death teleport uses it too.

The change points flow (`RoomScene.nextSceneInitialPosition()`) follows the same order: the `CHANGING_SCENE` broadcast
is sent only after the next room, its return point and the state save succeeded, and a failed save restores the
previous state, so a failed scene change never leaves the client scene hidden.

## Points per kill

`IncreaseScoreOnKill` (`lib/scores/server/subscriber/increase-score-on-kill.js`):

- player kill: `obtainedScorePerPlayer + killedPlayerLevel * obtainedScorePerPlayerLevelMultiplier`, the level is the
  killed player class path `currentLevel` (`IncreaseScoreOnKillMapper.fromPlayerDeathEvent()`)
- enemy kill with `scores/useNpcCustomScore` enabled: the enemy `private_params` `"killScore"` (`0` gives no points),
  falling back to `obtainedScorePerNpc` when it is missing or not a number

## Item growth

An item with a `"growth"` custom data (`items_item.customData`) grows with the experience of its owner:

```json
{"growth": {"experienceShare": 100, "modifiersIncreasePercentPerLevel": 50, "requireEquipped": true, "levels": {"2": 5, "3": 30, "4": 90, "5": 200}}}
```

- `experienceShare`: percent of the experience gained that the item receives (100 when missing)
- `requireEquipped`: only an equipped item grows, unless it is `false`
- `levels`: experience required by every level, the level never goes down
- `modifiersIncreasePercentPerLevel`: every level after the first increases the modifiers values by that percent of the
  original value (`SET`, `METHOD` and `SET_N` operations are never scaled)

Every item instance keeps its own level and experience in its `items_inventory.customData`
(`{"growth": {"level": 2, "experience": 12}}`). `ItemsGrowthApplier` (`lib/inventory/server/items-growth-applier.js`)
runs on `reldens.createPlayerInventoryAfter`: it loads the rows of the growing items and scales their modifiers, listens
the inventory `ADD_ITEM` (a new item starts at level 1) and the class path `LEVEL_EXPERIENCE_ADDED`. A level up
unequips the item, scales the modifiers, equips it again and sends the system chat message
`<label> reached level <level>.`. Every item instance has its own modifiers (the items loaded from the storage by
`ItemsFactory.fromModel()`, the new items by `ItemsFactory.isolateModifiers()`), so the growth scales the modifiers
values of that instance only. The maths are in `ItemGrowthCalculator`
(`lib/inventory/server/item-growth-calculator.js`).

The items created during the game (`ItemsManager.createItemInstance()` of `@reldens/items-system`: rewards, drops,
trades) receive the Modifier instances of the shared items model data (`room.config.inventory.items`), and the package
sets those modifiers target to the last owner that created an item, so equipping one player item could apply its
modifiers to another player. `StorageObserver.saveNewItem()` (`lib/inventory/server/storage-observer.js`, on
`ADD_ITEM_BEFORE`) replaces them with copies targeting the item owner (`ItemsFactory.isolateModifiers()`) before the
item is stored and added.

## Death teleport to town

`Battle.clientDeathUpdate()` (`lib/actions/server/battle.js`) stores the revive timer in the `playerDeathTimer` private
data and emits `reldens.playerDeath` with `revivePlayerCallback`, the battle revive bound to the room, the body, the
player, the affected property and the client, so the listeners never receive the battle. With the teleport enabled
`PlayerDeathRelocator` (`lib/actions/server/player-death-relocator.js`) replaces that timer by its own, with the same
`players/gameOver/timeOut`, and on its end:

- a player who left the room or is alive again is ignored
- with a restoration item (quantity above 0) one is consumed and the player revives where it died
- while the resurrection ad plays (started less than 60 seconds before and not failed) it checks again every second
- otherwise it revives in the town: in the same room the player is placed on the return point and revived, from
  another room the affected stat is restored, the `REVIVED` message is sent and the player moves to the town room; a
  failed relocation revives where it died
- a failed resolution is logged

The resurrection ad (`ads_event_video` on the client `reldens.gameOver` event, `"replayCooldown":0`) rewards one
restoration item. `ResurrectionAdGate` (`lib/actions/server/resurrection-ad-gate.js`) accepts its `AD_STARTED` message
(`reldens.beforeSceneExecuteMessages`) only from a dead player and once per death (`resurrectionAdStarted` private data,
cleared on every death). `AdsMessageActions` no longer disables a dead player on `AD_STARTED` and only activates a
disabled player on `AD_ENDED`, so the ad never revives a dead player. The `AD_FAILED` message of the started
resurrection ad sets the `resurrectionAdFailed` private data (cleared on every death too): a failed ad gives no item, so
the next death check stops waiting and the player revives in the town, and no other ad can start in the same death. The death timers are cleared when the player leaves
(`RoomScene.removeAllPlayerReferences()`) and when the room is disposed (`RoomScene.clearPlayersTimers()`).

## Scores reset per period

`ScoresPeriodReset` (`lib/scores/server/scores-period-reset.js`) checks the period on every `checkIntervalMs` (the
interval never keeps the process alive). `ScoresPeriodKeyBuilder` (`lib/scores/server/scores-period-key-builder.js`)
builds the UTC period key: `2026-10-17` (daily), the ISO week `2026-W42` (weekly) or `2026-10` (monthly). The stored
`scores/reset/lastPeriodKey` row is only changed with conditional updates (its id and the value read), so with many
servers on the same storage only one resets each period; the first check only stores the key. The reset:

- reads the last `scores` and `scores_detail` ids and claims the period storing a pending value
  (`<periodKey>|resetting|{"claimedAt":<ms>,"scoresMaxId":<id>,"detailsMaxId":<id>}`, `ScoresConst.RESET.PENDING_MARK`)
- deletes the `scores` rows up to `scoresMaxId` (and the `scores_detail` rows up to `detailsMaxId` with `resetDetails`),
  so the rows created after the claim, the points of the new period, are never deleted
- stores the period key and sends the stored scores to its scene rooms players

A reset that fails or stops before the end keeps the pending value: the other checks wait while it is younger than
`ScoresConst.RESET.DEFAULTS.PENDING_TIMEOUT_MS` (`60000`) and then any server takes it over and completes it with the
same claimed ids (a stale pending value of an older period reads the current ids), so a retry or an owner that resumes
late never deletes the new period points. While a reset is pending, a kill of a player whose score row was created up
to the claimed `scoresMaxId` deletes that previous period row and stores the new points in a new row
(`IncreaseScoreOnKill.releasePreviousPeriodScore()`), so the reset delete never removes them. The score updates of a
player run one after the other (`IncreaseScoreOnKill.queuePlayerUpdate()`), so overlapping kills share one row, and an
existing row is saved only while it still holds the read id and counters (`ScoresUpdater.saveScore()`): a row deleted
by the reset or changed by another server after the read is read again and the update retried
(`ScoresConst.SCORE_UPDATE_ATTEMPTS`), so no stale total is ever written back. The pending claim is read by
`ScoresResetClaim` (`lib/scores/server/scores-reset-claim.js`). Every server keeps the last period key it observed:
when it finds a new stored period key reset by another server it sends the stored top scores and the player scores to
its own scene rooms (its first check after the start only remembers the key). A period is marked as observed only
after its scores were sent, so a failed send is retried on the next check. A failed check is logged and releases the
next one. The running instance is the `scoresPeriodReset` property of the scores plugin
(`serverManager.featuresManager.featuresList.scores.package`).

## Ad items that give a skin

- using the skin ticket item (`skins/adTicketItemKey`) replaces its normal use: `SkinAdTicketGate`
  (`lib/users/server/skin-ad-ticket-gate.js`) sends `{act: 'skinAdS', adsId}` when the player has a ticket and the ad
  exists, and accepts the skin ad `AD_STARTED` message only from a player with a ticket; the ticket is consumed on
  `reldens.beforeGiveAdRewardItem`, right before the reward (`skin_warlock_robe`, from the `ads_event_video` of the
  `reldens.skinAdTicket` event, `"replayCooldown":0`), so every reward costs one ticket, a failed ad keeps the ticket,
  and a player without the ticket at the end gets no reward
- an item with a `"skinKey"` custom data changes the player look while equipped: `PlayerSkinApplier`
  (`lib/users/server/player-skin-applier.js`) sets `playerSchema.avatarKey` on the inventory `EQUIP_ITEM`, restores the
  class path avatar (or another equipped skin) on `UNEQUIP_ITEM` and applies the equipped skin on the join
- client (`lib/users/client/`): `SkinsSpritesPreloader` loads `/assets/custom/sprites/<skinKey>.png` for the
  `players/skins/keys` that are not class paths and creates their animations (`gameManager.mappedAvatars`),
  `SkinAdMessagesListener` fires `reldens.skinAdTicket` on the `skinAdS` message so the ads providers play the video,
  and `PlayersSkinSwitcher` switches every player sprite texture when its `avatarKey` changes

`AdsCollectionFinder` (`lib/ads/server/ads-collection-finder.js`) finds an enabled ad of `server/ads/collection` (the ad
and its provider enabled) by its key or its ID and checks if a message carries its ID; the disabled ads are never found.

## Ads rewards rules

`AdsMessageActions` (`lib/ads/server/message-actions.js`):

- `AD_STARTED` (`adS`) and `AD_ENDED` (`adE`) are accepted only for an enabled ad (`AdsCollectionFinder.findById()`),
  an unknown or disabled ad stores nothing and never disables the player
- a non replay ad already ended can not be started again; a replay ad can be started again only when its last
  rewarded play ended at least its `"replayCooldown"` milliseconds before (the `ads_event_video.event_data` key,
  `AdsConst.REPLAY_COOLDOWN` `60000` when missing), so a replay ad can not be farmed by sending the messages in a loop
- an `AD_ENDED` received before the provider `videoMinimumDuration` (`AdsConst.VIDEOS_MINIMUM_DURATION` `3000`) is
  rejected and the play stays open, it is never rewarded later by a timer
- `AD_FAILED` (`adF`, sent by the CrazyGames videos handler on the ad error instead of `AD_ENDED`) activates the
  disabled player and closes the open play without reward, so a later `AD_ENDED` of that play is rejected
- the alive player disabled on `AD_STARTED` is activated again on `AD_ENDED`, on `AD_FAILED` or after
  `server/ads/videoMaximumDuration` (the `adsReactivationTimer` private data, the timer skips a player that left the
  room), so a player can not stay disabled (and out of the battles) by never ending an ad
- the concurrent `AD_ENDED` claims of the same player and ad give a single reward
- after a valid `AD_ENDED` closed the play, `reldens.beforeGiveAdRewardItem` (`{playedAd, room, playerSchema,
  continueEvent}`) is emitted on the room events, a subscriber that sets `continueEvent` to `false` cancels the reward
  and the play stays closed

`InventoryMessageActions` (`lib/inventory/server/message-actions.js`) rejects the equip of an item key that is not in
the inventory or of an item without `equip()`, and the use of an item without `use()`.

## Events added

- `reldens.createPlayerInventoryBeforeSend` (`{client, playerSchema, room, inventoryServer, sendData}`), emitted by
  the inventory `PlayerSubscriber` before the groups data (`sendData`) is sent to the client, so a listener can change
  it
- `reldens.createPlayerInventoryAfter` (the same event data), emitted by the inventory `PlayerSubscriber` after the
  inventory data is sent to the client
- `reldens.playerDeath` carries `revivePlayerCallback`
- `reldens.beforeGiveAdRewardItem` (`{playedAd, room, playerSchema, continueEvent}`), emitted by `AdsMessageActions`
  before the reward of a valid ended ad
- `reldens.skinAdTicket` (client), the skin ad event

## Tests

Unit tests (the stubs of the gameplay classes are built by `tests/fixtures/gameplay-player-builder.js`):
`test-teleport-object.js`, `test-player-relocator.js` (with `tests/fixtures/relocation-room-builder.js`),
`test-increase-score-on-kill.js`, `test-item-growth-calculator.js`, `test-ads-collection-finder.js`,
`test-scores-period-key-builder.js`, `test-stats-recovery-calculator.js`, `test-players-auto-recovery.js`,
`test-objects-auto-recovery.js`, `test-room-auto-recovery.js`, `test-player-death-relocator.js` and
`test-player-death-relocator-failures.js` (with `tests/fixtures/death-relocation-builder.js`),
`test-scene-change-point.js` (the change points flow, with `tests/fixtures/scene-change-room-builder.js`),
`test-rc1-sql-update.js` (the rc.1 update run on the tests database: no updated row changes, disabled features and
existing content kept, only the missing features and sample rows added),
`test-resurrection-ad-gate.js`, `test-items-growth-applier.js`, `test-scores-period-reset.js` (with
`tests/fixtures/scores-period-reset-builder.js`), `test-player-subscriber.js` (the inventory before send and after
events), `test-skin-ad-ticket-gate.js`, `test-player-skin-applier.js`, `test-skins-sprites-preloader.js`,
`test-skin-ad-messages-listener.js`, `test-players-skin-switcher.js`, `test-ads-reward-claims.js`,
`test-items-factory.js` (the modifiers isolation) and `test-message-actions-guards.js` (the equip and use checks), run
self-hosted with `RELDENS_TESTS_CONFIRMED=1 npm run test:default`.

E2E specs (see "Gameplay features specs" in `.claude/e2e-testing-guide.md`): `test-auto-recovery.spec.js`,
`test-kill-score.spec.js`, `test-item-growth.spec.js`, `test-ad-skins.spec.js`, `test-teleport-npc.spec.js`,
`test-death-teleport.spec.js` and `test-scores-reset.spec.js`, run self-hosted with
`npm run test:e2e -- --db-reset=<tests/config.json dbName>`.

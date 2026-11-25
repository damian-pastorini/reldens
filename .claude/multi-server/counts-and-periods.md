# Multiple Servers - Counts, Statuses and Periods

Back to the [overview](overview.md). The status route and the usage limits are described in the
[server health monitor](../server-health-monitor.md).

## Status report

Every server answers `GET /reldens-server-status` with its `ServerHealthMonitor.usageReport`, which includes
`roomsUsage`, the summary of `RoomsUsageCollector` (`lib/game/server/health/rooms-usage-collector.js`):

- `roomsCount`, `sceneRoomsCount`, `playersCount`, `physicsBusyPercent`.
- `playersByStoredRoomId`: the players count per stored room ID.
- `activeUsersKeys`: one key per logged user of that server, the HMAC of
  `GameConst.HEALTH.ACTIVE_USER_KEY_PREFIX` plus the user ID signed with the shared signed tokens secret. The servers
  can match the same user without publishing the user IDs; with an empty secret no key is listed.

`RoomsAvailability` (`lib/game/server/health/rooms-availability.js`) reads the reports of the other servers of the rooms
(`fetchRemoteStatuses()`, all requested before any answer is awaited, and cached) and only uses the reachable ones (`fetchOtherServersRoomsUsage()`).

## Admin counts

- Logged users (dashboard): `RoomsAvailability.countActiveUsers()` counts the distinct keys of this server (live, from
  its own `RoomsUsageCollector`) and of every reachable other server. A user present on several servers (like the main
  login server keeping the game room with `server/players/disconnectUsersOnServerChange` disabled, see
  [Login and server change](login-and-server-change.md)) counts once.
- Logged users per day (dashboard): the stored `users_login` rows grouped by local day, counting each user once per
  day; a server change is a continued login, so it adds no row.
- Players in a room (rooms view banner and delete warning, `RoomsActivePlayersWarning`): the players of this server
  room plus `RoomsAvailability.countOtherServersRoomPlayers(roomId)`, the `playersByStoredRoomId` of the reachable other
  servers. The stored room IDs only match between servers sharing the database.
- An unreachable server (down, a different secret, or no usage report) adds nothing to these counts.

See the [admin panel guide](../admin-panel-guide.md) for the pages.

## Dates and periods

Every stored date and date comparison uses the server local time (`sc.getCurrentDate()`, `sc.formatDate()`).

- Scores reset (`ScoresPeriodReset`, `lib/scores/server/scores-period-reset.js`): the period key (daily date, week
  Monday date with the week mark, or month) is built in local time and the last reset key is stored in its config row, changed with conditional
  updates, so with many servers sharing the database only one resets each period. A stored key newer than the key of
  this server (a server in a later time zone already started the next period) is never reset back: this server only
  sends the new scores to its players and resets again when its own next period starts.
- Login rewards (`LoginStateHandler`): the daily and straight days rewards count local days. See the
  [gameplay features](../gameplay-features.md).

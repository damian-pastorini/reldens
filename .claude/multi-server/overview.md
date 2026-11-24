# Multiple Servers - Overview

A Reldens game can run on several game servers. Each server is a full Reldens process (game room, scene rooms, feature
rooms, admin panel) and the servers either share one database or each one has its own. A room belongs to a server
through its `server_url` column; a player moving into a room of another server reconnects the client to that server.

## Documents

- [Signed requests between servers](signed-requests.md) - the shared secret, the signed routes, nonces, replay and
  failure rules.
- [Login and server change](login-and-server-change.md) - the session of one user across the servers, the scene change
  to another server, the `server/players/disconnectUsersOnServerChange` modes and the client connections.
- [Names check](names-check.md) - unique usernames, emails and player names between servers with their own database.
- [Teams and clans sync](teams-and-clans-sync.md) - the groups with members playing on different servers.
- [Chat and rooms sync](chat-and-rooms-sync.md) - the private messages relay and the deleted rooms closed everywhere.
- [Counts, statuses and periods](counts-and-periods.md) - the server status reports, the admin counts and the scores
  reset periods across servers.
- [Server health monitor](../server-health-monitor.md) - the usage limits, the rooms availability between servers and
  the status route.

## How a server knows the other servers

There is no servers list setting for the game flows: the other servers are the distinct addresses of the rooms
`server_url` values.

- `ServerConfigEnricher.enrichRoomsServersUrls()` (`lib/game/server/server-config-enricher.js`) loads every room and
  writes `client/rooms/servers` (room name to server URL). A room with an empty `server_url` gets this server
  `server/publicUrl` (or `server/baseUrl`), so it is a room of every server that loads it. It also writes
  `client/rooms/loginServerUrl` (this server URL), used by the client to recognize the rooms of its login server.
- `ServerUrlMatcher` (`lib/game/server-url-matcher.js`) compares the URLs by origin and path: the `ws`/`wss` schemes are
  mapped to `http`/`https` and the trailing slashes are removed, an invalid URL gives an empty address.
  `fetchServersAddresses(serversUrls, excludedAddresses)` returns the distinct valid addresses of a URLs list or map
  that are not excluded.
- `ServerManagersInitializer.createServerToServerMessengerProps()` reads the servers values once when the managers
  start and keeps them in one `ServerToServerMessengerProps` instance (`serverManager.serverToServerMessengerProps`):
  the signed tokens instance, `client/rooms/servers`, this server address (`server/publicUrl`), every address of this
  server (`server/publicUrl` and `server/baseUrl`) and the other servers addresses (the rooms servers that are none of
  this server addresses). The login manager, the rooms availability and every feature messenger use that instance.
- Every multi-server feature builds its list from that map, so a server that has no room with its URL is not known by
  the others (a login server whose rooms have no `server_url` is not reached from the other servers).
- The names check is the only exception: it uses `server/rooms/databases` (`RELDENS_ROOMS_DATABASES`), the servers with
  their own database, see [Names check](names-check.md).

With `server/rooms/validateRoomOnServer` (default on, read once when the rooms are defined and passed to every room) a
room stored with a server URL is created only on the server whose `server/baseUrl` or `server/publicUrl` is that
address (`RoomLogin.isValidRoomOnServer()`).

## Required settings for every server

- The same `RELDENS_SIGNED_TOKENS_SECRET` (it falls back to `RELDENS_ADMIN_SECRET`); without it no signed request is
  generated and every request between servers fails.
- `RELDENS_PUBLIC_URL` set to the address the other servers use to reach this one: the requests are signed for the
  target address, and the receiver validates them against its own `server/publicUrl` (the user disconnection also
  accepts its `server/baseUrl`).
- The rooms `server_url` values written with those public URLs.
- `server/players/disconnectUsersOnServerChange` (default `1`), see
  [Login and server change](login-and-server-change.md).

See [environment variables](../environment-variables.md) for the full list.

## Routes between servers

- `POST /reldens-disconnect-user` - user disconnection and presence check (`UserDisconnection`).
- `POST /reldens-check-user-name` and `POST /reldens-check-player-name` - names check (`CrossServerNamesCheck`).
- `GET /reldens-server-status` - status and usage report (`ServerStatusRoute`).
- `POST /reldens-teams-sync` - teams (`TeamCrossServerStateSync`).
- `POST /reldens-clans-sync` - clans (`ClanCrossServerStateSync`).
- `POST /reldens-chat-sync` - private messages (`PrivateMessageCrossServerRelay`).
- `POST /reldens-rooms-sync` - deleted rooms (`DeletedRoomsCrossServerClose`).

## Known limits

- The offline death data (`OfflinePlayerDeaths`) is kept in the memory of the server where the player died: a player
  that dies on one server and logs in on another one restores the death with a new full game over time.
- The teams and clans syncs only reach the servers of `client/rooms/servers`; a group member on a server with no room
  of its own is not synced.

# Multiple Servers - Names Check

Back to the [overview](overview.md). The requests are described in [Signed requests](signed-requests.md).

Servers with their own database can not see the users and players stored by the others, so `CrossServerNamesCheck`
(`lib/game/server/cross-server-names-check.js`) keeps the usernames, the emails and the player names unique between
them. Servers sharing one database do not need it: the storage itself already has every row. This check is the only
part of the servers with their own database that is implemented, the other multiple servers flows still expect a
shared database (see the [overview](overview.md)).

## Settings

- `server/rooms/databases` (`RELDENS_ROOMS_DATABASES`): comma separated URLs of the other servers to check. This
  server own addresses (`server/publicUrl` and `server/baseUrl`) and the invalid URLs are removed from the list
  (`LoginManager.createCrossServerNamesCheck(routePath)`). With an empty list nothing is requested.
- The shared `RELDENS_SIGNED_TOKENS_SECRET` and a valid `RELDENS_PUBLIC_URL` on every server.

## Flow

The `LoginManager` creates one check per names route, each a signed messenger of its own route (see
[Signed requests](signed-requests.md)): `userNamesCheck` (username and email, route `/reldens-check-user-name`) used by
`UserRegistration`, and `playerNamesCheck` (player name, route `/reldens-check-player-name`) used by `PlayerCreation`:

1. `holdEverywhere(values)` creates a random hold ID and holds the values here for
   `GameConst.NAMES_CHECK.LOCAL_HOLD_MS`; values already held here refuse the creation.
2. It sends a `check` message (the hold ID as target, the values in the payload) to every listed server with
   `sendToServers()`. Each server validates the token (one use, bound to its own address and its route), checks its
   storage (`UsersManager.loadUserByUsername()` / `loadUserByEmail()` / `isNameAvailable()`) and holds the values under
   the same hold ID for `GameConst.NAMES_CHECK.REMOTE_HOLD_MS`.
3. A refused or failed check on any server (error status, unreachable, timeout of
   `GameConst.SERVERS_SYNC.REQUEST_TIMEOUT_MS`) releases the holds everywhere once every check answered (so no check
   still on its way holds the values after the release) and refuses the registration or the player creation.
4. After the row is stored (or the creation failed), `release(values, holdId)` removes the local hold and sends a
   `release` message to every server, which removes only the holds of that hold ID; it answers whether every server
   confirmed it.

The values are compared lowercase, the expired holds are removed on every hold, and a message must carry the expected
number of values (2 for the users route, 1 for the players route), each a non empty string of at most 255 characters,
a hold ID of `GameConst.NAMES_CHECK.HOLD_ID_LENGTH` characters and the `check` or `release` action.

Both routes limit only the requests that are not signed (`SignedServerToServerMessenger.registerRoute()`).

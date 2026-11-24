# Multiple Servers - Names Check

Back to the [overview](overview.md). The requests are described in [Signed requests](signed-requests.md).

Servers with their own database can not see the users and players stored by the others, so `CrossServerNamesCheck`
(`lib/game/server/cross-server-names-check.js`) keeps the usernames, the emails and the player names unique between
them. Servers sharing one database do not need it: the storage itself already has every row.

## Settings

- `server/rooms/databases` (`RELDENS_ROOMS_DATABASES`): comma separated URLs of the other servers to check. This
  server own addresses (`server/publicUrl` and `server/baseUrl`) and the invalid URLs are removed from the list
  (`LoginManager.createCrossServerNamesCheck()`). With an empty list nothing is requested.
- The shared `RELDENS_SIGNED_TOKENS_SECRET` and a valid `RELDENS_PUBLIC_URL` on every server.

## Flow

Used by `UserRegistration` (username and email, route `/reldens-check-user-name`) and `PlayerCreation` (player name,
route `/reldens-check-player-name`):

1. `holdEverywhere(routePath, values)` creates a random hold ID and holds the values here for
   `GameConst.NAMES_CHECK.LOCAL_HOLD_MS`; values already held here refuse the creation.
2. It sends a `check` request to every listed server, one after the other. Each server validates the token (one use, bound
   to its own address), checks its storage (`UsersManager.loadUserByUsername()` / `loadUserByEmail()` /
   `isNameAvailable()`) and holds the values under the same hold ID for `GameConst.NAMES_CHECK.REMOTE_HOLD_MS`.
3. The first refused or failed check (error status, unreachable, timeout of `GameConst.NAMES_CHECK.REQUEST_TIMEOUT_MS`)
   stops the checks, releases the holds and refuses the registration or the player creation.
4. After the row is stored (or the creation failed), `release()` removes the local hold and sends a `release` request
   to every server, which removes only the holds of that hold ID.

The values are compared lowercase, the expired holds are removed on every hold, and a request must carry the expected
number of values (2 for the users route, 1 for the players route), each a non empty string of at most 255 characters.

Both routes are behind the home rate limiter (`ServerManager`, `limitedRoutes`).

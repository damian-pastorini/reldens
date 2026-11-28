# Multiple Servers - Signed Requests

Back to the [overview](overview.md).

Every request between game servers carries an `ExpiringHmacToken` (`lib/game/server/expiring-hmac-token.js`) signed
with `server/security/signedTokensSecret` (`RELDENS_SIGNED_TOKENS_SECRET`, falling back to `RELDENS_ADMIN_SECRET`).
All the servers must use the same secret.

## Token

- `generate(values, expiresAt)` signs the JSON of the values plus the expiration time and returns
  `<expiresAt>.<hex HMAC>`; with an empty secret it returns `false` and the request is not sent.
- `validate(values, token, now)` rebuilds the token for the same values and compares it in constant time; an expired or
  malformed token is invalid.
- `markUsed(token, now)` / `isUsed(token, now)` keep the used tokens until they expire, so a captured request can not be
  replayed.

## Feature messenger

`SignedServerToServerMessenger` (`lib/game/server/signed-server-to-server-messenger.js`) is the base of every signed
message between the servers: the teams, clans, chat and rooms syncs, the user disconnection (`UserDisconnection`) and
the names check (`CrossServerNamesCheck`, one per names route). Each one is built with its own route plus the shared
`ServerToServerMessengerProps` instance (see the [overview](overview.md)): the one token instance of the server,
`client/rooms/servers` (as the normalized address of every room), the other servers addresses, this server address
(from `server/publicUrl`) and every address of this server (its public and base URLs). Every subclass implements
`receiveAction()`.

- `createRequestBody(serverUrl, action, targetId, payload)` builds `{action, targetId, payload (JSON), nonce, token}`.
  The token signs the route, the destination address, the action, the target, the payload JSON and a random nonce, and
  expires after `GameConst.SIGNED_TOKENS.SERVERS_SYNC_EXPIRATION`; with an empty secret it answers `false`.
- `sendRequest(serverUrl, action, targetId, payload)` posts that body to `serverUrl + routePath`. It answers the parsed
  response only when it has `isSuccess: true`, otherwise `false` (no secret, error status, network error, timeout of
  `GameConst.SERVERS_SYNC.REQUEST_TIMEOUT_MS`).
- `sendToServers(serversUrls, ...)` sends to every server, one after the other (each unreachable server costs its own
  timeout), and returns `{serverUrl, response}` per server. It is the only place that sends a signed message to several
  servers.
- `receiveRequest(req)` validates the token against every address of this server (public or base URL) and marks it
  used before calling the subclass `receiveAction(action, targetId, payload)`. A server without a valid
  `server/publicUrl` nor `server/baseUrl` rejects every request. An error in `receiveAction()` answers
  `{isSuccess: false}` with the status 500.
- `serverUrlForRoom(roomName)` returns the other server address of a room, or `''` for a room of this server.

## Messages of the login flows

- User disconnection (`/reldens-disconnect-user`): the target is the username, the action is `disconnect` (a login),
  `serverChange` (a scene join) or `checkOnly` (a scene join with the disconnection disabled), and the payload carries
  the sender instance ID. See [Login and server change](login-and-server-change.md).
- Names check (`/reldens-check-user-name` and `/reldens-check-player-name`): the target is the hold ID, the action is
  `check` or `release` and the payload carries the values. See [Names check](names-check.md).
- Server status (`RemoteServersStatus` / `ServerStatusRoute`): not a messenger message, it signs only
  `GameConst.HEALTH.STATUS_TOKEN_VALUE` and is sent as a query parameter. The statuses of several servers are
  requested one after the other (`RemoteServersStatus.fetchStatuses()`). See
  [Server health monitor](../server-health-monitor.md).

## Rate limits

Every messenger registers its route with `SignedServerToServerMessenger.registerRoute()`, which sends to the home
limiter every request that is not an unused valid signed one (`isUnusedSignedRequest()`), so the other servers are
never limited and a flood of invalid requests is limited before it reaches the handler and its log line. The status
route is behind the home limiter (`ServerManager`, `limitedRoutes`).

## Failure rules

- Disconnection: a failed request (error status, unreachable, timeout) refuses the login or the scene join, unless the
  disconnection is disabled (then the presence check failure counts as "not logged there").
- Names check: a failed check is "not free", so the registration or the player creation is refused.
- Teams, clans, chat, rooms syncs: a failed request is logged; each feature keeps its local state (see each document).

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

`SignedServerToServerMessenger` (`lib/game/server/signed-server-to-server-messenger.js`) is the base of the teams,
clans, chat and rooms syncs. Each feature builds its messenger with its own route plus the shared
`ServerToServerMessengerProps` instance (see the [overview](overview.md)): the one token instance of the server,
`client/rooms/servers`, the other servers addresses and this server address (from `server/publicUrl`). Every subclass
implements `receiveAction()`.

- `sendRequest(serverUrl, action, targetId, payload)` posts `{action, targetId, payload (JSON), nonce, token}` to
  `serverUrl + routePath`. The token signs the route, the destination address, the action, the target, the payload JSON
  and a random nonce, and expires after `GameConst.SIGNED_TOKENS.SERVERS_SYNC_EXPIRATION`. It answers the parsed
  response only when it has `isSuccess: true`, otherwise `false` (error status, network error, timeout of
  `GameConst.SERVERS_SYNC.REQUEST_TIMEOUT_MS`).
- `sendToServers(serversUrls, ...)` sends to every server (all the requests started before any answer is awaited, so
  the unreachable servers cost one timeout) and returns `{serverUrl, response}` per
  server.
- `receiveRequest(req)` validates the token against this server address and marks it used before calling the subclass
  `receiveAction(action, targetId, payload)`. A server without a valid `server/publicUrl` rejects every request.
- `serverUrlForRoom(roomName)` returns the other server address of a room, or `''` for a room of this server.

## Other signed requests

- User disconnection (`UserDisconnection`): signs the route, the target server address, the username and the
  `serverChange` / `checkOnly` marks; one use per token, accepted when signed for any address of this server (public or
  base URL). See [Login and server change](login-and-server-change.md).
- Names check (`CrossServerNamesCheck`): signs the route, the target address, the action, the hold ID and the values;
  one use per token. See [Names check](names-check.md).
- Server status (`RemoteServersStatus` / `ServerStatusRoute`): signs only `GameConst.HEALTH.STATUS_TOKEN_VALUE` and is
  sent as a query parameter. See [Server health monitor](../server-health-monitor.md).

## Rate limits

The disconnect route uses the home limiter only for requests that are not an unused valid signed request
(`UserDisconnection.isUnusedSignedRequest()`), so the other servers are never limited. The names check and the status
routes are behind the home limiter (`ServerManager`, `limitedRoutes`).

## Failure rules

- Disconnection: a failed request (error status, unreachable, timeout) refuses the login or the scene join, unless the
  disconnection is disabled (then the presence check failure counts as "not logged there").
- Names check: a failed check is "not free", so the registration or the player creation is refused.
- Teams, clans, chat, rooms syncs: a failed request is logged; each feature keeps its local state (see each document).

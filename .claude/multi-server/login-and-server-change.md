# Multiple Servers - Login and Server Change

Back to the [overview](overview.md). The requests used here are described in [Signed requests](signed-requests.md).

## One session per user

A user keeps one session. Every room join (`RoomLogin.onAuth()`, `lib/rooms/server/login.js`) calls
`UserDisconnection.broadcastDisconnectionMessage(user, isSceneChange)` (`lib/game/server/user-disconnection.js`, a
signed messenger of the `/reldens-disconnect-user` route), which sends the username to every other server with
`sendToServers()`, one server after the other (each unreachable server costs its own timeout):

- A new login (`isSceneChange` not set) sends the `disconnect` action. Each server closes every room of that user (game
  room included) with the consented close code, so the old client shows the "session ended" alert.
- A scene join (`isSceneChange: true`, sent by the client on its first scene and on every scene change) sends the
  `serverChange` action: the old server closes the user rooms with
  `GameConst.DISCONNECTION.SERVER_CHANGE_CLOSE_CODE` (4100), which the moving client ignores.
- The receiving server takes a server change as such only when the user is changing scene there (its player body
  `isChangingScene`) or has no scene player there (before its first scene); a user settled in a scene there is
  disconnected like on a new login (`UserDisconnection.isSettledInScene()`), so a join that only claims a scene change
  never leaves the other client frozen.
- The answer `{isSuccess, wasLogged}`: `wasLogged` is true when the user was present there and not settled in a scene.
  A message carrying this server own instance ID in its payload (an alias of this same server) answers
  `wasLogged: false` and disconnects nothing.
- `RoomLogin.disconnectFromOtherServers()` refuses the join ("Could not connect to the game.") when a disconnection
  failed, and sets `userModel.isLoginContinued = isSceneChange && wasLogged`.
- `UserDisconnection.disconnectUserFromEveryRoom()` ends the scene rooms of the user first and stops at the first room
  that can not end its session (the player state not saved), so a refused disconnection, here or on another server,
  keeps every other session of the user, its chat and game room too.

`RoomGame.onJoin()` (`lib/rooms/server/game.js`) ends any other session of the same user already in this game room, and
records a new login (`users_login` row and login count) unless `isLoginContinued`, so a server change never counts as a
second login.

A guest scene join is accepted only when the guest is active on this server or another server confirmed it
(`RoomLogin.isUnconfirmedGuestArrival()`), so an ended guest session never logs in again.

## `server/players/disconnectUsersOnServerChange`

- `1` (default): the behaviour above. A failed disconnection (server down, error status, timeout) refuses the login or
  the scene join, so a second session can never stay open on an unreachable server.
- `0`: the servers never disconnect a user from the other servers. The login server acts as the main server that keeps
  the user game room while the user plays on other servers. A new login sends nothing; a scene join sends the
  `checkOnly` action to learn whether the user is logged elsewhere, so the server change is a continued login and
  the logins are not counted twice. A failed check counts as "not logged there" and never refuses the join. The admin
  logged users count still counts such a user once (see [Counts, statuses and periods](counts-and-periods.md)).

## Scene change to a room of another server

Server side (the server the player leaves):

1. The change point (`CollisionsManager` -> `RoomScene.nextSceneInitialPosition()`) or a relocation (`PlayerRelocator`:
   teleport objects, death town teleport) marks the body `isChangingScene`, checks the destination availability
   (`RoomsAvailability`, see [Server health monitor](../server-health-monitor.md)), saves the player state with the new
   room and broadcasts `GameConst.CHANGING_SCENE`.
2. Features keep their data for the move on `reldens.endPlayerHitChangePoint` / `reldens.playerRelocateToRoom` (teams:
   [Teams and clans sync](teams-and-clans-sync.md)).
3. When the destination server sends the server change request, this server closes the user rooms with code 4100.

Client side (`lib/game/client/game-manager.js`, `game-client.js`):

1. `reconnectGameClient()` sets the changing scene flag and joins the new scene with `isSceneChange: true`.
2. `GameClient.joinOrCreate()` uses one Colyseus client per room server (`fetchRoomServerUrl()`; a room of the login
   server URL, written with another host alias, uses the client own server URL). For a room of another server it first
   joins that server game room and its feature rooms (`client/rooms/autoConnectServerGameRoom`,
   `client/rooms/autoConnectServerFeatureRooms`, `client/rooms/featuresRoomsNames`), each only when not already open.
3. Coming back to the login server, `rejoinLoginServerRooms()` joins its game room and feature rooms again when they
   were closed by the server change.
4. The previous room is left after the new one is joined; the room left by a scene change is never the active one.
5. `GameRoomsConnections.endSessionOnGameRoomLeave(code)` shows `game.errors.sessionEnded` only for the consented close
   of the game room or of the active scene room; code 4100 is ignored.
6. Features with a room per server (global chat) send through the room of the current scene server
   (`GameClient.serverFeatureRoom()`).

## Related documents

- [Player state flow](../player-state-flow.md)
- [Guest system](../guest-system-technical-guide.md)
- [IP lists and login blocks](../ip-lists-and-login-blocks.md)

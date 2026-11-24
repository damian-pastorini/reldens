# Multiple Servers - Teams and Clans Sync

Back to the [overview](overview.md). The requests are described in [Signed requests](signed-requests.md).

The teams plugin (`lib/teams/server/plugin.js`) creates `TeamCrossServerStateSync` (route `/reldens-teams-sync`) and
`ClanCrossServerStateSync` (route `/reldens-clans-sync`), both based on `GroupCrossServerStateSync`, and registers
their routes on `reldens.serverBeforeListen`. With no other server in `client/rooms/servers` nothing is sent.

## Local and remote members

`SharedModifiersGroup` (base of `Team` and `Clan`) keeps two member lists:

- `players` / `clients`: the members playing on this server; only they get the group modifiers here.
- `remotePlayers`: the members playing on other servers, as `{serverUrl, data}` (the mapped shared properties, no
  client, no modifiers). `remoteServersUrls()` lists their servers.

A member joining on this server (`Team.join()`) stops being remote. A received entry is accepted only for a positive
integer player ID that is not local and a server URL of the configured other servers
(`GroupCrossServerStateSync.isRemoteEntry()`).

## Teams

- Scene change to a room of this server: `EndPlayerHitChangePointTeamHandler.savePlayerTeam()` keeps the team for the
  next scene, like on a single server.
- Scene change to another server (`TeamsPlugin.savePlayerTeamOnRoomChange()` on `reldens.endPlayerHitChangePoint` and
  `reldens.playerRelocateToRoom`): the player leaves the team here (modifiers reverted), becomes a remote member, and an
  `arrive` request is sent to the destination with every member (local and remote). A failed arrival removes the player
  from the team and sends the update to the other servers. When no local member is left, this server drops its team
  copy.
- Arrival (`receiveArrival()`): the destination creates the team copy when it does not have it (the owner entry must
  come from a configured server or be this server), applies the members, and joins the player when it is already in a
  scene here, or keeps it in `teamChangingRoomPlayers` so it joins on its scene join.
- Updates: `TeamUpdatesHandler.updateTeamPlayers()` sends the members to the local clients and an `update` (this
  server local members) to the team servers only (`remoteServersUrls()`); the update flow is the same as the clans one
  (see below), both are `GroupCrossServerStateSync.sendUpdate()` and `receiveUpdate()`.
- Leave and disband (`TeamLeave`): a removed remote member is dropped here and the `leave` is sent to the team servers
  (`sendLeave()`); a disband sends a `leave` with an empty player ID, which removes the whole team copy there.

## Clans

Clans are stored rows, so the clan sync expects the servers to share the database.

- Scene change to another server: `ClanDisconnect.disconnectPlayer()` removes the player from the online clan members
  here; the destination loads the clan from the storage on the player join (`CreatePlayerClanHandler`).
- Updates: `ClanUpdatesHandler.updateClanPlayers()` sends the clan to the local clients and an `update` with this server
  online members to every other server; each answers with its own online members. The group (team or clan) is sent
  again to the local clients only when those answers changed the remote members; a received update replaces the
  members of its sender and is sent to the local clients.
- Members change (a `members` request with `{isDisbanded}` sent by `ClanJoin` and `ClanLeave` to every other server
  after a join, a leave, a removal or a disband, `ClanCrossServerStateSync.receiveMembersChange()`): the change
  was stored by the sending server, so every other server loads the stored members of the clan again (only the
  `clanMembers` rows, the clan itself stays in memory), removes its online players that are no longer members (clan
  removed message) and the remote non members; a disband is sent as such, so the servers drop the clan with no load.

## Related documents

- [Feature modules](../feature-modules.md) (teams module)

# Multiple Servers - Chat and Rooms Sync

Back to the [overview](overview.md). The requests are described in [Signed requests](signed-requests.md).

## Private messages

The chat plugin (`lib/chat/server/plugin.js`) creates `PrivateMessageCrossServerRelay` (route `/reldens-chat-sync`)
with `client/chat/messages/characterLimit` and `client/players/name/maximumLength` read once, and registers its route
on `reldens.serverBeforeListen`. Every `RoomChat` registers itself in the relay on `onCreate`.

`RoomChat.sendPrivateMessage()` (`lib/chat/server/room-chat.js`):

1. A recipient that is not a non empty string is ignored.
2. A recipient in this server chat room gets the message directly.
3. Otherwise the relay sends a `privateMessage` request (target: the recipient name, payload: the sender name and the
   text) to every other server, unless the name is longer than a player name or has characters a player name can not
   have (`UsersConst.PLAYER_NAME_INVALID_CHARACTERS`).
4. The receiving server validates the sender name, cleans the text with the character limit, delivers it to the
   recipient in its chat room and answers the recipient player ID.
5. With a recipient ID (local or answered) the sender gets its copy and the message is saved once, by the sender
   server, with the recipient ID; without it the sender gets the "player not found" message.

## Global messages

The global chat goes to the chat room of the server where it is sent; the client sends it through the chat room of its
current scene server (`GameClient.serverFeatureRoom()`). Global messages are not relayed between servers.

## Deleted rooms

The rooms plugin (`lib/rooms/server/plugin.js`) creates `DeletedRoomsCrossServerClose` (route `/reldens-rooms-sync`)
when the server starts (`reldens.serverBeforeListen`):

- On `reldens.adminAfterEntityDelete` for the rooms entity with a successful delete, it sends `closeDeletedRooms` with
  the deleted room IDs to every other server and logs the servers that did not answer.
- The receiver closes those rooms with `DeletedRoomCloser.closeRooms()`, like the admin delete does on the server where
  the room was deleted (the caches purge, the room removed from the selectors, the closing warnings and the close after
  the countdown, see the [admin panel guide](../admin-panel-guide.md)).

The room IDs are the stored IDs, so this sync expects the servers to share the database.

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

INSERT INTO config VALUES(NULL, 'client', 'players/tapMovement/enabled', '1', 'b');

# Chat:

INSERT INTO config VALUES(NULL, 'client', 'ui/chat/useOverheadChat', '1', 'b');
INSERT INTO config VALUES(NULL, 'client', 'chat/messages/characterLimit', '100', 'i');
INSERT INTO config VALUES(NULL, 'client', 'chat/messages/characterLimitOverhead', '50', 'i');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

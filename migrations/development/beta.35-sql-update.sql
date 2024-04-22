#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'general/users/allowRegistration', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'general/users/allowGuest', '1', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/guestUser/roleId', '2', 2);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'gameEngine/banner', '0', 3);
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/guestUser/allowOnRooms', '1', 3);

# Rooms:
UPDATE `rooms` SET `customData` = '{"allowGuest":true}' WHERE `name` IN ('reldens-house-1', 'reldens-town', 'reldens-forest');
UPDATE `rooms` SET `customData` = NULL WHERE `name` = 'reldens-house-1-2d-floor';
UPDATE `rooms` SET `customData` = '{"allowGuest":true,"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":2,"movementSpeed":160,"usePathFinder":false}' WHERE `name` = 'reldens-gravity';

# Rewards assets fix:
UPDATE `objects_items_rewards_animations` SET `file` = CONCAT(`file`, '.png') WHERE `file` NOT LIKE '%.png';

# Items close inventory fix:
UPDATE items_item SET customData = JSON_REMOVE(customData, '$.animationData.closeInventoryOnUse') WHERE JSON_CONTAINS(customData, '{"animationData":{"closeInventoryOnUse":true}}');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

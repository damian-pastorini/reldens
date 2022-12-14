#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Room Gravity:
SET @top_down_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'TopDownRoom');
UPDATE `rooms` SET `room_class_key`=NULL, `customData`='{"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":5,"movementSpeed":200,"usePathFinder":false}' WHERE `id`= @top_down_room_id;

# Features:
INSERT INTO `features` VALUES (11, 'prediction', 'Prediction', 0);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

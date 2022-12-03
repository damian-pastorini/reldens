#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:
UPDATE `config` SET `value` = '1' WHERE `path` = 'rooms/selection/allowOnLogin';
UPDATE `config` SET `value` = '1' WHERE `path` = 'rooms/selection/allowOnRegistration';
UPDATE `config` SET `path` = 'rooms/world/timeStep' WHERE `path` = 'rooms/world/timestep';
DELETE FROM `config` WHERE `path` = 'rooms/world/gravity_enabled';
INSERT INTO `config` VALUES (NULL, 'client', 'general/engine/clientInterpolation', '1', 'b');
INSERT INTO `config` VALUES (NULL, 'client', 'general/engine/interpolationSpeed', '0.4', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'general/engine/experimentalClientPrediction', '0', 'b');
DELETE FROM `config` WHERE `path` = 'players/size/width' AND `scope` = 'server';
DELETE FROM `config` WHERE `path` = 'players/size/height' AND `scope` = 'server';
INSERT INTO `config` VALUES (NULL, 'client', 'players/physicalBody/width', '25', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'players/physicalBody/height', '25', 'i');
UPDATE `config` SET `scope` = 'client', `path` = 'general/controls/allowSimultaneousKeys'  WHERE `path` = 'general/controls/allow_simultaneous_keys';
INSERT INTO `config` VALUES (NULL, 'server', 'objects/actions/closeInteractionOnOutOfReach', '1', 'b');
INSERT INTO `config` VALUES (NULL, 'client', 'trade/players/awaitTimeOut', '1', 'b');
INSERT INTO `config` VALUES (NULL, 'client', 'trade/players/timeOut', '8000', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/default/responsiveX', '10', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/default/responsiveY', '10', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/default/x', '120', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/default/y', '100', 'i');

# Features:
INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('prediction', 'Prediction', '1');

# Rooms:
ALTER TABLE `rooms`	ADD COLUMN `customData` TEXT NULL COLLATE 'utf8_unicode_ci' AFTER `room_class_key`;

# Top-Down room demo:
INSERT INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES (NULL, 'TopDownRoom', 'Gravity World!', 'reldens-gravity', 'reldens-forest', NULL, '{"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012}');

SET @reldens_top_down_demo_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'TopDownRoom');
INSERT INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES (NULL, @reldens_top_down_demo_room_id, 'left', 340, 600, 0, NULL);

SET @reldens_house2_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'ReldensHouse_2');
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (NULL, @reldens_top_down_demo_room_id, 540, @reldens_house2_room_id);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (NULL, @reldens_house2_room_id, 500, @reldens_top_down_demo_room_id);
INSERT INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES (NULL, @reldens_house2_room_id, 780, @reldens_top_down_demo_room_id);

# Objects:
SET @reldens_forest_room_id = (SELECT `id` FROM `rooms` WHERE `name` = 'ReldensForest');
INSERT INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES (NULL, @reldens_forest_room_id, 'forest-collisions', 258, 'npc_5', 'quest_npc_1', 'Miles', NULL, NULL, 1);

SET @reldens_object_alfred_id = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'npc_1' AND `client_key` = 'people_town_1');
SET @reldens_object_healer_id = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'npc_2' AND `client_key` = 'healer_1');
SET @reldens_object_merchant_id = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'npc_3' AND `client_key` = 'merchant_1');
SET @reldens_object_weapons_master_id = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'npc_4' AND `client_key` = 'weapons_master_1');
SET @reldens_object_quest_npc = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'npc_5' AND `client_key` = 'quest_npc_1');
SET @enemy_forest_1 = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'enemy_1' AND `client_key` = 'enemy_forest_1');
SET @enemy_forest_2 = (SELECT `id` FROM `objects` WHERE `object_class_key` = 'enemy_2' AND `client_key` = 'enemy_forest_2');

# Objects assets:
INSERT INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `file_1`, `file_2`, `extra_params`) VALUES (NULL, @reldens_object_quest_npc, 'spritesheet', 'quest_npc_1', 'people-quest-npc', NULL, '{"frameWidth":52,"frameHeight":71}');

# Objects contents (client_params):
UPDATE `objects` SET `client_params`='{"autoStart":true}' WHERE `id` = @enemy_forest_1;
UPDATE `objects` SET `client_params`='{"autoStart":true}' WHERE `id` = @enemy_forest_2;
UPDATE `objects` SET `client_params`='{"content":"Hello! My name is Alfred. Go to the forest and kill some monsters! Now... leave me alone!"}' WHERE `id`= @reldens_object_alfred_id;
UPDATE `objects` SET `client_params`='{"content":"Hello traveler! I can restore your health, would you like me to do it?","options":{"1":{"label":"Heal HP","value":1},"2":{"label":"Nothing...","value":2},"3":{"label":"Need some MP","value":3}},"ui":true}' WHERE `id` = @reldens_object_healer_id;
UPDATE `objects` SET `client_params`='{"content":"Hi there! What would you like to do?","options":{"buy":{"label":"Buy","value":"buy"},"sell":{"label":"Sell","value":"sell"}}}' WHERE `id`= @reldens_object_merchant_id;
UPDATE `objects` SET `client_params`='{"content":"Hi, I am the weapons master, choose your weapon and go kill some monsters!","options":{"1":{"key":"axe","label":"Axe","value":1,"icon":"axe"},"2":{"key":"spear","label":"Spear","value":2,"icon":"spear"}},"ui":true}' WHERE  `id`= @reldens_object_weapons_master_id;
UPDATE `objects` SET `client_params`='{"content":"Hi there! Do you want a coin? I can give you one if you give me a tree branch.","options":{"1":{"label":"Sure!","value":1},"2":{"label":"No, thank you.","value":2}},"enabled":true,"ui":true}' WHERE `id`= @reldens_object_quest_npc;

# Object properties (private_params):
UPDATE `objects` SET `private_params`='{"runOnAction":true,"playerVisible":true}' WHERE `id` = @reldens_object_alfred_id;
UPDATE `objects` SET `private_params`='{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}' WHERE `id` = @reldens_object_healer_id OR `id` = @reldens_object_merchant_id OR `id` = @reldens_object_weapons_master_id OR `id` = @reldens_object_quest_npc;

# Object new tables:

CREATE TABLE `objects_items_inventory` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`owner_id` INT(10) UNSIGNED NOT NULL,
	`item_id` INT(10) NOT NULL,
	`qty` INT(10) NOT NULL DEFAULT '0',
	`remaining_uses` INT(10) NULL DEFAULT NULL,
	`is_active` INT(10) NULL DEFAULT NULL COMMENT 'For example equipped or not equipped items.',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FK_items_inventory_items_item` (`item_id`) USING BTREE,
	INDEX `FK_objects_items_inventory_objects` (`owner_id`) USING BTREE,
	CONSTRAINT `FK_objects_items_inventory_objects` FOREIGN KEY (`owner_id`) REFERENCES `objects` (`id`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `objects_items_inventory_ibfk_1` FOREIGN KEY (`item_id`) REFERENCES `items_item` (`id`) ON UPDATE CASCADE ON DELETE NO ACTION
) COMMENT='Inventory table is to save the items for each owner.' COLLATE='utf8_unicode_ci' ENGINE=InnoDB ROW_FORMAT=COMPACT AUTO_INCREMENT=0;

CREATE TABLE `objects_items_requirements` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`object_id` INT(10) UNSIGNED NOT NULL,
	`item_key` VARCHAR(255) NOT NULL DEFAULT '' COLLATE 'utf8_unicode_ci',
	`required_item_key` VARCHAR(255) NOT NULL DEFAULT '' COLLATE 'utf8_unicode_ci',
	`required_quantity` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	`auto_remove_requirement` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FK_objects_items_requirements_objects` (`object_id`) USING BTREE,
	INDEX `FK_objects_items_requirements_items_item` (`item_key`) USING BTREE,
	INDEX `FK_objects_items_requirements_items_item_2` (`required_item_key`) USING BTREE,
	CONSTRAINT `FK_objects_items_requirements_items_item` FOREIGN KEY (`item_key`) REFERENCES `items_item` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_objects_items_requirements_items_item_2` FOREIGN KEY (`required_item_key`) REFERENCES `items_item` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_objects_items_requirements_objects` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB AUTO_INCREMENT=0;

CREATE TABLE `objects_items_rewards` (
	`id` INT(10) UNSIGNED NOT NULL AUTO_INCREMENT,
	`object_id` INT(10) UNSIGNED NOT NULL,
	`item_key` VARCHAR(255) NOT NULL DEFAULT '' COLLATE 'utf8_unicode_ci',
	`reward_item_key` VARCHAR(255) NOT NULL DEFAULT '' COLLATE 'utf8_unicode_ci',
	`reward_quantity` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	`reward_item_is_required` INT(10) UNSIGNED NOT NULL DEFAULT '0',
	PRIMARY KEY (`id`) USING BTREE,
	INDEX `FK_objects_items_requirements_objects` (`object_id`) USING BTREE,
	INDEX `FK_objects_items_rewards_items_item` (`item_key`) USING BTREE,
	INDEX `FK_objects_items_rewards_items_item_2` (`reward_item_key`) USING BTREE,
	CONSTRAINT `FK_objects_items_rewards_items_item` FOREIGN KEY (`item_key`) REFERENCES `items_item` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `FK_objects_items_rewards_items_item_2` FOREIGN KEY (`reward_item_key`) REFERENCES `items_item` (`key`) ON UPDATE NO ACTION ON DELETE NO ACTION,
	CONSTRAINT `objects_items_rewards_ibfk_1` FOREIGN KEY (`object_id`) REFERENCES `objects` (`id`) ON UPDATE CASCADE ON DELETE RESTRICT
) COLLATE='utf8_unicode_ci' ENGINE=InnoDB ROW_FORMAT=COMPACT AUTO_INCREMENT=0;

# Object items, requirements, rewards:
INSERT INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES (2, 10, 4, -1, -1, 0);
INSERT INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES (2, 10, 4, -1, -1, 0);
INSERT INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES (3, 10, 5, -1, -1, 0);
INSERT INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES (5, 10, 3, -1, 1, 0);
INSERT INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES (6, 10, 6, -1, 1, 0);
INSERT INTO `objects_items_requirements` (`id`, `object_id`, `item_key`, `required_item_key`, `required_quantity`, `auto_remove_requirement`) VALUES (1, 10, 'axe', 'coins', 5, 1);
INSERT INTO `objects_items_requirements` (`id`, `object_id`, `item_key`, `required_item_key`, `required_quantity`, `auto_remove_requirement`) VALUES (2, 10, 'spear', 'coins', 2, 1);
INSERT INTO `objects_items_requirements` (`id`, `object_id`, `item_key`, `required_item_key`, `required_quantity`, `auto_remove_requirement`) VALUES (3, 10, 'heal_potion_20', 'coins', 2, 1);
INSERT INTO `objects_items_requirements` (`id`, `object_id`, `item_key`, `required_item_key`, `required_quantity`, `auto_remove_requirement`) VALUES (5, 10, 'magic_potion_20', 'coins', 2, 1);
INSERT INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES (1, 10, 'axe', 'coins', 2, 0);
INSERT INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES (2, 10, 'spear', 'coins', 1, 0);
INSERT INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES (3, 10, 'heal_potion_20', 'coins', 1, 0);
INSERT INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES (5, 10, 'magic_potion_20', 'coins', 1, 0);

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

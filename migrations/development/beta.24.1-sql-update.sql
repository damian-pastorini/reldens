#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# New configuration:
DELETE FROM `config` WHERE `scope` = 'client' AND `path` LIKE 'ui/trade/%';
INSERT INTO `config` VALUES (NULL, 'client', 'ui/trade/responsiveX', '5', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/trade/responsiveY', '5', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/trade/x', '5', 'i');
INSERT INTO `config` VALUES (NULL, 'client', 'ui/trade/y', '5', 'i');

# Missing inserts after beta.24 key error:
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

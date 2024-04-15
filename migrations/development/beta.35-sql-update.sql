#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Rewards assets fix:
UPDATE `objects_items_rewards_animations` SET `file` = CONCAT(`file`, '.png') WHERE `file` NOT LIKE '%.png';

# Items close inventory fix:
UPDATE items_item SET customData = JSON_REMOVE(customData, '$.animationData.closeInventoryOnUse') WHERE JSON_CONTAINS(customData, '{"animationData":{"closeInventoryOnUse":true}}');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

--

SET FOREIGN_KEY_CHECKS = 0;

--

TRUNCATE `ads`;
TRUNCATE `ads_banner`;
TRUNCATE `ads_event_video`;
TRUNCATE `ads_providers`;
TRUNCATE `audio`;
TRUNCATE `audio_categories`;
TRUNCATE `audio_markers`;
TRUNCATE `audio_player_config`;
TRUNCATE `chat`;
TRUNCATE `clan`;
TRUNCATE `clan_levels_modifiers`;
TRUNCATE `clan_members`;
TRUNCATE `drops_animations`;
TRUNCATE `items_group`;
TRUNCATE `items_inventory`;
TRUNCATE `items_item`;
TRUNCATE `items_item_modifiers`;
TRUNCATE `objects`;
TRUNCATE `objects_animations`;
TRUNCATE `objects_assets`;
TRUNCATE `objects_items_inventory`;
TRUNCATE `objects_items_requirements`;
TRUNCATE `objects_items_rewards`;
TRUNCATE `objects_skills`;
TRUNCATE `objects_stats`;
TRUNCATE `players`;
TRUNCATE `players_state`;
TRUNCATE `players_stats`;
TRUNCATE `respawn`;
TRUNCATE `rewards`;
TRUNCATE `rewards_modifiers`;
TRUNCATE `rewards_events`;
TRUNCATE `rewards_events_state`;
TRUNCATE `rooms`;
TRUNCATE `rooms_change_points`;
TRUNCATE `rooms_return_points`;
TRUNCATE `skills_class_level_up_animations`;
TRUNCATE `skills_class_path`;
TRUNCATE `skills_class_path_level_labels`;
TRUNCATE `skills_class_path_level_skills`;
TRUNCATE `skills_groups`;
TRUNCATE `skills_levels`;
TRUNCATE `skills_levels_modifiers`;
TRUNCATE `skills_levels_modifiers_conditions`;
TRUNCATE `skills_levels_set`;
TRUNCATE `skills_owners_class_path`;
TRUNCATE `skills_skill`;
TRUNCATE `skills_skill_animations`;
TRUNCATE `skills_skill_attack`;
TRUNCATE `skills_skill_group_relation`;
TRUNCATE `skills_skill_owner_conditions`;
TRUNCATE `skills_skill_owner_effects`;
TRUNCATE `skills_skill_owner_effects_conditions`;
TRUNCATE `skills_skill_physical_data`;
TRUNCATE `skills_skill_target_effects`;
TRUNCATE `skills_skill_target_effects_conditions`;
TRUNCATE `snippets`;
TRUNCATE `stats`;
TRUNCATE `users`;
TRUNCATE `users_locale`;

-- ENTITIES WITHOUT REQUIRED FK (Category 1): ads, config, features, snippets, users

REPLACE INTO `ads` (`id`, `key`, `provider_id`, `type_id`, `width`, `height`, `position`, `top`, `bottom`, `left`, `right`, `replay`, `enabled`) VALUES
	(3, 'fullTimeBanner', 1, 1, 320, 50, NULL, NULL, 0, NULL, 80, NULL, 0),
	(4, 'ui-banner', 1, 1, 320, 50, NULL, NULL, 80, NULL, 80, NULL, 0),
	(5, 'crazy-games-sample-video', 1, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0),
	(6, 'game-monetize-sample-video', 2, 2, NULL, NULL, NULL, NULL, NULL, NULL, NULL, 1, 0),
	(100, 'test-ad-list', 1, 1, 300, 100, NULL, 10, NULL, 10, NULL, NULL, 1),
	(101, 'test-ad-edit', 1, 1, 250, 80, NULL, 20, NULL, 20, NULL, NULL, 1),
	(102, 'test-ad-delete', 1, 1, 200, 60, NULL, 30, NULL, 30, NULL, NULL, 1);

REPLACE INTO `ads_banner` (`id`, `ads_id`, `banner_data`) VALUES
	(1, 3, '{"fullTime": true}'),
	(2, 4, '{"uiReferenceIds":["box-open-clan","equipment-open","inventory-open","player-stats-open"]}');

REPLACE INTO `ads_event_video` (`id`, `ads_id`, `event_key`, `event_data`) VALUES
	(1, 5, 'activatedRoom_ReldensTown', '{"rewardItemKey":"coins","rewardItemQty":1}'),
	(2, 6, 'activatedRoom_ReldensForest', '{"rewardItemKey":"coins","rewardItemQty":1}');

REPLACE INTO `ads_providers` (`id`, `key`, `enabled`) VALUES
	(1, 'crazyGames', 0),
	(2, 'gameMonetize', 0);

-- Config test data (category 1)
REPLACE INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES
	(1001, 'client', 'ui.players.allowGuest', 'true', 1),
	(1002, 'server', 'players.initialStats.hp', '100', 2),
	(1003, 'test', 'config.list.test', 'List test value', 1),
	(1004, 'test', 'config.edit.test', 'Edit test value', 1),
	(1005, 'test', 'config.delete.test', 'Delete test value', 1);

-- Features test data (category 1)
REPLACE INTO `features` (`id`, `code`, `title`, `is_enabled`) VALUES
	(1001, 'chat', 'Chat System', 1),
	(1002, 'inventory', 'Inventory System', 1),
	(1003, 'test-feature-list', 'Test Feature List', 1),
	(1004, 'test-feature-edit', 'Test Feature Edit', 1),
	(1005, 'test-feature-delete', 'Test Feature Delete', 1);

-- Users test data (category 1)
REPLACE INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `created_at`, `updated_at`, `played_time`) VALUES
	(1, 'root@yourgame.com', 'root', '879abc0494b36a09f184fd8308ea18f2643d71263f145b1e40e2ec3546d42202:6a186aff4d69daadcd7940a839856b394b12f0aec64a5df745c83cf9d881dc9dcb121b03d946872571f214228684216df097305b68417a56403299b8b2388db3', 99, '1', '2022-03-17 18:57:44', '2023-10-21 16:51:55', 0),
	(1001, 'test-list@test.com', 'test-user-list', 'test-password-hash', 1, '1', '2025-01-01 00:00:00', '2025-01-01 00:00:00', 100),
	(1002, 'test-edit@test.com', 'test-user-edit', 'test-password-hash', 1, '1', '2025-01-01 01:00:00', '2025-01-01 01:00:00', 200),
	(1003, 'test-delete@test.com', 'test-user-delete', 'test-password-hash', 1, '1', '2025-01-01 02:00:00', '2025-01-01 02:00:00', 300),
	(1004, 'test-locale-main@test.com', 'test-user-locale-main', 'test-password-hash', 1, '1', '2025-01-01 03:00:00', '2025-01-01 03:00:00', 400),
	(1005, 'test-locale-delete@test.com', 'test-user-locale-delete', 'test-password-hash', 1, '1', '2025-01-01 04:00:00', '2025-01-01 04:00:00', 500);

REPLACE INTO `users_locale` (`id`, `locale_id`, `user_id`) VALUES
	(1, 1, 1),
	(1001, 1, 1001),
	(1002, 1, 1002),
	(1003, 1, 1003);

-- Snippets test data (category 1)
REPLACE INTO `snippets` (`id`, `locale_id`, `key`, `value`) VALUES
	(1001, 1, 'test.snippet.list', 'Test snippet for list validation'),
	(1002, 1, 'test.snippet.edit', 'Test snippet for edit validation'),
	(1003, 1, 'test.snippet.delete', 'Test snippet for delete validation');

-- ENTITIES WITH UPLOADS BUT WITHOUT REQUIRED FK (Category 3): items

REPLACE INTO `items_group` (`id`, `key`, `label`, `description`, `files_name`, `sort`, `items_limit`, `limit_per_item`) VALUES
	(1, 'weapon', 'Weapon', 'All kinds of weapons.', 'weapon.png', 2, 1, 0),
	(2, 'shield', 'Shield', 'Protect with these items.', 'shield.png', 3, 1, 0),
	(3, 'armor', 'Armor', '', 'armor.png', 4, 1, 0),
	(4, 'boots', 'Boots', '', 'boots.png', 6, 1, 0),
	(5, 'gauntlets', 'Gauntlets', '', 'gauntlets.png', 5, 1, 0),
	(6, 'helmet', 'Helmet', '', 'helmet.png', 1, 1, 0);

REPLACE INTO `items_item` (`id`, `key`, `type`, `group_id`, `label`, `description`, `qty_limit`, `uses_limit`, `useTimeOut`, `execTimeOut`, `customData`) VALUES
	(1, 'coins', 3, NULL, 'Coins', NULL, 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(2, 'branch', 10, NULL, 'Tree branch', 'An useless tree branch (for now)', 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(3, 'heal_potion_20', 5, NULL, 'Heal Potion', 'A heal potion that will restore 20 HP.', 0, 1, NULL, NULL, '{"canBeDropped":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"usePlayerPosition":true,"followPlayer":true,"startsOnTarget":true},"removeAfterUse":true}'),
	(4, 'axe', 1, 1, 'Axe', 'A short distance but powerful weapon.', 0, 0, NULL, NULL, '{"canBeDropped":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"destroyOnComplete":true,"usePlayerPosition":true,"followPlayer":true,"startsOnTarget":true}}'),
	(5, 'spear', 1, 1, 'Spear', 'A short distance but powerful weapon.', 0, 0, NULL, NULL, '{"canBeDropped":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"destroyOnComplete":true,"usePlayerPosition":true,"followPlayer":true,"startsOnTarget":true}}'),
	(6, 'magic_potion_20', 5, NULL, 'Magic Potion', 'A magic potion that will restore 20 MP.', 0, 1, NULL, NULL, '{"canBeDropped":true,"animationData":{"frameWidth":64,"frameHeight":64,"start":6,"end":11,"repeat":0,"usePlayerPosition":true,"followPlayer":true,"startsOnTarget":true},"removeAfterUse":true}'),
	(1001, 'test-item-list', 1, 1, 'Test Item List', 'Test item for list validation', 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(1002, 'test-item-edit', 1, 1, 'Test Item Edit', 'Test item for edit validation', 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(1003, 'test-item-delete', 1, 1, 'Test Item Delete', 'Test item for delete validation', 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(1004, 'test-drop-anim-main', 1, 1, 'Test Drop Anim Main', 'Test item for drop animation main', 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(1005, 'test-drop-anim-delete', 1, 1, 'Test Drop Anim Delete', 'Test item for drop animation delete', 0, 1, NULL, NULL, '{"canBeDropped": true}'),
	(1006, 'test-drop-anim-editfail', 1, 1, 'Test Drop Anim EditFail', 'Test item for drop animation edit fail', 0, 1, NULL, NULL, '{"canBeDropped": true}');

REPLACE INTO `items_item_modifiers` (`id`, `item_id`, `key`, `property_key`, `operation`, `value`, `maxProperty`) VALUES
	(1, 4, 'atk', 'stats/atk', 5, '5', NULL),
	(2, 3, 'heal_potion_20', 'stats/hp', 1, '20', 'statsBase/hp'),
	(3, 5, 'atk', 'stats/atk', 5, '3', NULL),
	(4, 6, 'magic_potion_20', 'stats/mp', 1, '20', 'statsBase/mp');

-- ENTITIES WITH UPLOADS AND FK (Category 4): rooms

REPLACE INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES
	(2, 'reldens-house-1', 'House - 1', 'reldens-house-1.json', 'reldens-house-1.png', NULL, '{"allowGuest":true}'),
	(3, 'reldens-house-2', 'House - 2', 'reldens-house-2.json', 'reldens-house-2.png', NULL, '{"allowGuest":true}'),
	(4, 'reldens-town', 'Town', 'reldens-town.json', 'reldens-town.png', NULL, '{"allowGuest":true}'),
	(5, 'reldens-forest', 'Forest', 'reldens-forest.json', 'reldens-forest.png', NULL, '{"allowGuest":true}'),
	(6, 'reldens-house-1-2d-floor', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor.json', 'reldens-house-1-2d-floor.png', NULL, NULL),
	(7, 'reldens-gravity', 'Gravity World!', 'reldens-gravity.json', 'reldens-gravity.png', NULL, '{"allowGuest":true,"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":2,"movementSpeed":160,"usePathFinder":false}'),
    (8, 'reldens-bots', 'Bots Test', 'reldens-bots.json', 'reldens-forest.png', NULL, '{"allowGuest":true}'),
    (9, 'reldens-bots-forest', 'Bots Forest', 'reldens-bots-forest.json', 'reldens-bots-forest.png', NULL, '{"allowGuest":true,"joinInRandomPlace":true,"joinInRandomPlaceGuestAlways":true}'),
    (10, 'reldens-bots-forest-house-01-n0', 'Bots Forest - House 1-0', 'reldens-bots-forest-house-01-n0.json', 'reldens-bots-forest-house-01-n0.png', NULL, '{"allowGuest":true}'),
    (1001, 'test-room-list', 'Test Room List', 'test-room-list.json', 'test-room-list.png', NULL, '{"allowGuest":true}'),
    (1002, 'test-room-edit', 'Test Room Edit', 'test-room-edit.json', 'test-room-edit.png', NULL, '{"allowGuest":true}'),
    (1003, 'test-room-delete', 'Test Room Delete', 'test-room-delete.json', 'test-room-delete.png', NULL, '{"allowGuest":true}');

REPLACE INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
	(1, 2, 816, 4),
	(2, 2, 817, 4),
	(3, 3, 778, 4),
	(4, 3, 779, 4),
	(5, 4, 444, 2),
	(6, 4, 951, 3),
	(7, 4, 18, 5),
	(8, 4, 19, 5),
	(9, 5, 1315, 4),
	(10, 5, 1316, 4),
	(11, 2, 623, 6),
	(12, 2, 663, 6),
	(13, 6, 624, 2),
	(14, 6, 664, 2),
	(15, 7, 540, 3),
	(16, 3, 500, 7),
	(17, 3, 780, 4),
    (18, 9, 20349, 10),
    (19, 10, 381, 9),
    (20, 10, 382, 9);

REPLACE INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES
	(1, 2, 'up', 548, 615, 1, 4),
	(2, 3, 'up', 640, 600, 1, 4),
	(3, 4, 'down', 400, 345, 1, 2),
	(4, 4, 'down', 1266, 670, 0, 3),
	(5, 5, 'up', 640, 768, 0, 4),
	(6, 8, 'up', 640, 768, 0, 4),
	(7, 4, 'down', 615, 64, 0, 5),
	(9, 6, 'right', 820, 500, 0, 2),
	(11, 2, 'left', 720, 540, 0, 6),
	(12, 7, 'left', 340, 600, 0, NULL),
	(13, 3, 'down', 660, 520, 0, 7),
	(14, 9, 'down', 4500, 985, 1, NULL),
    (15, 9, 'down', 1600, 4544, 0, 10),
    (16, 10, 'up', 64, 544, 1, 9),
    (1001, 1001, 'down', 100, 100, 1, NULL),
    (1002, 1002, 'down', 200, 200, 1, NULL),
    (1003, 1003, 'down', 300, 300, 1, NULL);

-- ENTITIES WITH REQUIRED FK (Category 2): audio, objects, chat, respawn, rewards

REPLACE INTO `audio_categories` (`id`, `category_key`, `category_label`, `enabled`, `single_audio`) VALUES
	(1, 'music', 'Music', 1, 1),
	(3, 'sound', 'Sound', 1, 0);

REPLACE INTO `audio` (`id`, `audio_key`, `files_name`, `config`, `room_id`, `category_id`, `enabled`) VALUES
	(3, 'footstep', 'footstep.mp3', '{"onlyCurrentPlayer":true}', NULL, 3, 1),
	(4, 'reldens-town', 'reldens-town.mp3', '', 4, 1, 1),
	(1001, 'test-audio-list', 'test-audio-list.mp3', '{"test":true}', 4, 1, 1),
	(1002, 'test-audio-edit', 'test-audio-edit.mp3', '{"test":true}', 4, 1, 1),
	(1003, 'test-audio-delete', 'test-audio-delete.mp3', '{"test":true}', 4, 1, 1);

REPLACE INTO `audio_markers` (`id`, `audio_id`, `marker_key`, `start`, `duration`, `config`) VALUES
	(1, 4, 'ReldensTown', 0, 41, NULL),
	(2, 3, 'journeyman_right', 0, 1, NULL),
	(3, 3, 'journeyman_left', 0, 1, NULL),
	(4, 3, 'journeyman_up', 0, 1, NULL),
	(5, 3, 'journeyman_down', 0, 1, NULL),
	(6, 3, 'r_journeyman_right', 0, 1, NULL),
	(7, 3, 'r_journeyman_left', 0, 1, NULL),
	(8, 3, 'r_journeyman_up', 0, 1, NULL),
	(9, 3, 'r_journeyman_down', 0, 1, NULL),
	(10, 3, 'sorcerer_right', 0, 1, NULL),
	(11, 3, 'sorcerer_left', 0, 1, NULL),
	(12, 3, 'sorcerer_up', 0, 1, NULL),
	(13, 3, 'sorcerer_down', 0, 1, NULL),
	(14, 3, 'r_sorcerer_right', 0, 1, NULL),
	(15, 3, 'r_sorcerer_left', 0, 1, NULL),
	(16, 3, 'r_sorcerer_up', 0, 1, NULL),
	(17, 3, 'r_sorcerer_down', 0, 1, NULL),
	(18, 3, 'warlock_right', 0, 1, NULL),
	(19, 3, 'warlock_left', 0, 1, NULL),
	(20, 3, 'warlock_up', 0, 1, NULL),
	(21, 3, 'warlock_down', 0, 1, NULL),
	(22, 3, 'r_warlock_right', 0, 1, NULL),
	(23, 3, 'r_warlock_left', 0, 1, NULL),
	(24, 3, 'r_warlock_up', 0, 1, NULL),
	(25, 3, 'r_warlock_down', 0, 1, NULL),
	(26, 3, 'swordsman_right', 0, 1, NULL),
	(27, 3, 'swordsman_left', 0, 1, NULL),
	(28, 3, 'swordsman_up', 0, 1, NULL),
	(29, 3, 'swordsman_down', 0, 1, NULL),
	(30, 3, 'r_swordsman_right', 0, 1, NULL),
	(31, 3, 'r_swordsman_left', 0, 1, NULL),
	(32, 3, 'r_swordsman_up', 0, 1, NULL),
	(33, 3, 'r_swordsman_down', 0, 1, NULL),
	(34, 3, 'warrior_right', 0, 1, NULL),
	(35, 3, 'warrior_left', 0, 1, NULL),
	(36, 3, 'warrior_up', 0, 1, NULL),
	(37, 3, 'warrior_down', 0, 1, NULL),
	(38, 3, 'r_warrior_right', 0, 1, NULL),
	(39, 3, 'r_warrior_left', 0, 1, NULL),
	(40, 3, 'r_warrior_up', 0, 1, NULL),
	(41, 3, 'r_warrior_down', 0, 1, NULL);

REPLACE INTO `objects` (`id`, `room_id`, `layer_name`, `tile_index`, `class_type`, `object_class_key`, `client_key`, `title`, `private_params`, `client_params`, `enabled`) VALUES
	(1, 4, 'ground-collisions', 444, 2, 'door_1', 'door_house_1', '', '{"runOnHit":true,"roomVisible":true,"yFix":6}', '{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000}', 1),
	(2, 8, 'respawn-area-monsters-lvl-1-2', NULL, 7, 'enemy_bot_1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true}', '{"autoStart":true}', 0),
	(3, 8, 'respawn-area-monsters-lvl-1-2', NULL, 7, 'enemy_bot_2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4}', '{"autoStart":true}', 0),
	(4, 4, 'ground-collisions', 951, 2, 'door_2', 'door_house_2', '', '{"runOnHit":true,"roomVisible":true,"yFix":6}', '{"positionFix":{"y":-18},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000}', 1),
	(5, 4, 'house-collisions-over-player', 535, 3, 'npc_1', 'people_town_1', 'Alfred', '{"runOnAction":true,"playerVisible":true}', '{"content":"Hello! My name is Alfred. Go to the forest and kill some monsters! Now... leave me alone!"}', 1),
	(6, 5, 'respawn-area-monsters-lvl-1-2', NULL, 7, 'enemy_1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true}', '{"autoStart":true}', 1),
	(7, 5, 'respawn-area-monsters-lvl-1-2', NULL, 7, 'enemy_2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":70}', '{"autoStart":true}', 1),
	(8, 4, 'house-collisions-over-player', 538, 3, 'npc_2', 'healer_1', 'Mamon', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hello traveler! I can restore your health, would you like me to do it?","options":{"1":{"label":"Heal HP","value":1},"2":{"label":"Nothing...","value":2},"3":{"label":"Need some MP","value":3}},"ui":true}', 1),
	(10, 4, 'house-collisions-over-player', 560, 5, 'npc_3', 'merchant_1', 'Gimly', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hi there! What would you like to do?","options":{"buy":{"label":"Buy","value":"buy"},"sell":{"label":"Sell","value":"sell"}}}', 1),
	(12, 4, 'house-collisions-over-player', 562, 3, 'npc_4', 'weapons_master_1', 'Barrik', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hi, I am the weapons master, choose your weapon and go kill some monsters!","options":{"1":{"key":"axe","label":"Axe","value":1,"icon":"axe"},"2":{"key":"spear","label":"Spear","value":2,"icon":"spear"}},"ui":true}', 1),
	(13, 5, 'forest-collisions', 258, 3, 'npc_5', 'quest_npc_1', 'Miles', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true}', '{"content":"Hi there! Do you want a coin? I can give you one if you give me a tree branch.","options":{"1":{"label":"Sure!","value":1},"2":{"label":"No, thank you.","value":2}},"ui":true}', 1),
	(14, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":120}', '{"autoStart":true}', 1),
	(15, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":70}', '{"autoStart":true}', 1),
	(1001, 4, 'test-layer', 100, 3, 'test-object-list', 'test_object_list', 'Test Object List', '{"runOnAction":true}', '{"content":"Test object for list validation"}', 1),
	(1002, 4, 'test-layer', 101, 3, 'test-object-edit', 'test_object_edit', 'Test Object Edit', '{"runOnAction":true}', '{"content":"Test object for edit validation"}', 1),
	(1003, 4, 'test-layer', 102, 3, 'test-object-delete', 'test_object_delete', 'Test Object Delete', '{"runOnAction":true}', '{"content":"Test object for delete validation"}', 1);

REPLACE INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES
	(5, 6, 'respawn-area-monsters-lvl-1-2_6_right', '{"start":6,"end":8}'),
	(6, 6, 'respawn-area-monsters-lvl-1-2_6_down', '{"start":0,"end":2}'),
	(7, 6, 'respawn-area-monsters-lvl-1-2_6_left', '{"start":3,"end":5}'),
	(8, 6, 'respawn-area-monsters-lvl-1-2_6_up', '{"start":9,"end":11}');

REPLACE INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(1, 1, 'spritesheet', 'door_house_1', 'door-a-x2.png', '{"frameWidth":32,"frameHeight":58}'),
	(2, 4, 'spritesheet', 'door_house_2', 'door-a-x2.png', '{"frameWidth":32,"frameHeight":58}'),
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(4, 2, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50}'),
	(5, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50}'),
	(6, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50}'),
	(7, 5, 'spritesheet', 'healer_1', 'healer-1.png', '{"frameWidth":52,"frameHeight":71}'),
	(8, 3, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50}'),
	(9, 10, 'spritesheet', 'merchant_1', 'people-d-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(10, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(11, 13, 'spritesheet', 'quest_npc_1', 'people-quest-npc.png', '{"frameWidth":52,"frameHeight":71}'),
    (12, 14, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50}'),
    (13, 15, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50}'),
    (1001, 1001, 'spritesheet', 'test_object_list', 'test-object.png', '{"frameWidth":32,"frameHeight":32}'),
    (1002, 1002, 'spritesheet', 'test_object_edit', 'test-object.png', '{"frameWidth":32,"frameHeight":32}'),
    (1003, 1003, 'spritesheet', 'test_object_delete', 'test-object.png', '{"frameWidth":32,"frameHeight":32}');

REPLACE INTO `objects_items_inventory` (`id`, `owner_id`, `item_id`, `qty`, `remaining_uses`, `is_active`) VALUES
	(2, 10, 4, -1, -1, 0),
	(3, 10, 5, -1, -1, 0),
	(5, 10, 3, -1, 1, 0),
	(6, 10, 6, -1, 1, 0);

REPLACE INTO `objects_items_requirements` (`id`, `object_id`, `item_key`, `required_item_key`, `required_quantity`, `auto_remove_requirement`) VALUES
	(1, 10, 'axe', 'coins', 5, 1),
	(2, 10, 'spear', 'coins', 2, 1),
	(3, 10, 'heal_potion_20', 'coins', 2, 1),
	(5, 10, 'magic_potion_20', 'coins', 2, 1);

REPLACE INTO `objects_items_rewards` (`id`, `object_id`, `item_key`, `reward_item_key`, `reward_quantity`, `reward_item_is_required`) VALUES
	(1, 10, 'axe', 'coins', 2, 0),
	(2, 10, 'spear', 'coins', 1, 0),
	(3, 10, 'heal_potion_20', 'coins', 1, 0),
	(5, 10, 'magic_potion_20', 'coins', 1, 0);

REPLACE INTO `drops_animations` (`id`, `item_id`, `asset_type`, `asset_key`, `file`, `extra_params`) VALUES
    (1, 1, NULL, 'coins', 'coins.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
	(2, 2, NULL, 'branch', 'branch.png', '{"start":0,"end":2,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (3, 3, NULL, 'heal-potion-20', 'heal-potion-20.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
	(4, 4, NULL, 'axe', 'axe.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (5, 5, NULL, 'spear', 'spear.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (6, 6, NULL, 'magic-potion-20', 'magic-potion-20.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}');

REPLACE INTO `objects_skills` (`id`, `object_id`, `skill_id`, `target_id`) VALUES
	(1, 6, 1, 2);

REPLACE INTO `objects_stats` (`id`, `object_id`, `stat_id`, `base_value`, `value`) VALUES
	(1, 2, 1, 50, 50),
    (2, 2, 2, 50, 50),
    (3, 2, 3, 50, 50),
    (4, 2, 4, 50, 50),
    (5, 2, 5, 50, 50),
    (6, 2, 6, 50, 50),
    (7, 2, 7, 50, 50),
    (8, 2, 8, 50, 50),
    (9, 2, 9, 50, 50),
    (10, 2, 10, 50, 50),
    (11, 3, 1, 50, 50),
    (12, 3, 2, 50, 50),
    (13, 3, 3, 50, 50),
    (14, 3, 4, 50, 50),
    (15, 3, 5, 50, 50),
    (16, 3, 6, 50, 50),
    (17, 3, 7, 50, 50),
    (18, 3, 8, 50, 50),
    (19, 3, 9, 50, 50),
    (20, 3, 10, 50, 50),
    (21, 6, 1, 50, 50),
    (22, 6, 2, 50, 50),
    (23, 6, 3, 50, 50),
    (24, 6, 4, 50, 50),
    (25, 6, 5, 50, 50),
    (26, 6, 6, 50, 50),
    (27, 6, 7, 50, 50),
    (28, 6, 8, 50, 50),
    (29, 6, 9, 50, 50),
    (30, 6, 10, 50, 50),
    (31, 7, 1, 50, 50),
    (32, 7, 2, 50, 50),
    (33, 7, 3, 50, 50),
    (34, 7, 4, 50, 50),
    (35, 7, 5, 50, 50),
    (36, 7, 6, 50, 50),
    (37, 7, 7, 50, 50),
    (38, 7, 8, 50, 50),
    (39, 7, 9, 50, 50),
    (40, 7, 10, 50, 50),
    (41, 14, 1, 50, 50),
    (42, 14, 2, 50, 50),
    (43, 14, 3, 50, 50),
    (44, 14, 4, 50, 50),
    (45, 14, 5, 50, 50),
    (46, 14, 6, 50, 50),
    (47, 14, 7, 50, 50),
    (48, 14, 8, 50, 50),
    (49, 14, 9, 50, 50),
    (50, 14, 10, 50, 50),
    (51, 15, 1, 50, 50),
    (52, 15, 2, 50, 50),
    (53, 15, 3, 50, 50),
    (54, 15, 4, 50, 50),
    (55, 15, 5, 50, 50),
    (56, 15, 6, 50, 50),
    (57, 15, 7, 50, 50),
    (58, 15, 8, 50, 50),
    (59, 15, 9, 50, 50),
    (60, 15, 10, 50, 50);

-- Players data for FK relationships
REPLACE INTO `players` (`id`, `user_id`, `name`, `created_at`) VALUES
	(1, 1, 'ImRoot', '2022-03-17 19:57:50'),
	(1001, 1001, 'TestPlayerList', '2025-01-01 00:00:00'),
	(1002, 1002, 'TestPlayerEdit', '2025-01-01 01:00:00'),
	(1003, 1003, 'TestPlayerDelete', '2025-01-01 02:00:00'),
	(1004, 1001, 'TestPlayerStateMain', '2025-01-01 03:00:00'),
	(1005, 1001, 'TestPlayerStateDelete', '2025-01-01 04:00:00'),
	(1006, 1001, 'TestPlayerStateEditFail', '2025-01-01 05:00:00');

REPLACE INTO `players_state` (`id`, `player_id`, `room_id`, `x`, `y`, `dir`) VALUES
	(1, 1, 5, 332, 288, 'down'),
	(1001, 1001, 4, 100, 100, 'down'),
	(1002, 1002, 4, 200, 200, 'down'),
	(1003, 1003, 4, 300, 300, 'down');

REPLACE INTO `players_stats` (`id`, `player_id`, `stat_id`, `base_value`, `value`) VALUES
	(1, 1, 1, 280, 81),
	(2, 1, 2, 280, 85),
	(3, 1, 3, 280, 400),
	(4, 1, 4, 280, 280),
	(5, 1, 5, 100, 100),
	(6, 1, 6, 100, 100),
	(7, 1, 7, 100, 100),
	(8, 1, 8, 100, 100),
	(9, 1, 9, 100, 100),
	(10, 1, 10, 100, 100);

-- Chat test data (requires player_id and room_id FK)
REPLACE INTO `chat` (`id`, `player_id`, `room_id`, `message`, `private_player_id`, `message_type`, `message_time`) VALUES
	(1001, 1001, 4, 'Test message for list validation', NULL, 1, '2025-01-01 10:00:00'),
	(1002, 1002, 4, 'Test message for edit validation', NULL, 1, '2025-01-01 11:00:00'),
	(1003, 1003, 4, 'Test message for delete validation', NULL, 1, '2025-01-01 12:00:00');

-- Respawn test data (requires object_id FK)
REPLACE INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
    (1, 2, 20000, 10, 'respawn-area-monsters-lvl-1-2'),
    (2, 3, 10000, 20, 'respawn-area-monsters-lvl-1-2'),
	(3, 6, 20000, 2, 'respawn-area-monsters-lvl-1-2'),
	(4, 7, 10000, 3, 'respawn-area-monsters-lvl-1-2'),
    (5, 14, 20000, 100, 'ground-respawn-area'),
    (6, 15, 10000, 200, 'ground-respawn-area'),
    (1001, 1001, 5000, 5, 'test-layer'),
    (1002, 1002, 6000, 6, 'test-layer'),
    (1003, 1003, 7000, 7, 'test-layer');

-- Rewards test data (requires object_id and item_id FK)
REPLACE INTO `rewards` (`id`, `object_id`, `item_id`, `modifier_id`, `experience`, `drop_rate`, `drop_quantity`, `is_unique`, `was_given`, `has_drop_body`) VALUES
	(1, 2, 2, NULL, 10, 100, 3, 0, 0, 1),
	(2, 3, 2, NULL, 10, 100, 1, 0, 0, 1),
	(3, 6, 2, NULL, 10, 100, 3, 0, 0, 1),
	(4, 7, 2, NULL, 10, 100, 1, 0, 0, 1),
	(5, 14, 2, NULL, 10, 100, 3, 0, 0, 1),
	(6, 15, 2, NULL, 10, 100, 1, 0, 0, 1),
	(1001, 1001, 1, NULL, 50, 100, 1, 0, 0, 1),
	(1002, 1002, 1, NULL, 60, 100, 2, 0, 0, 1),
	(1003, 1003, 1, NULL, 70, 100, 3, 0, 0, 1);

REPLACE INTO `rewards_events` (`id`, `label`, `description`, `handler_key`, `event_key`, `event_data`, `position`, `enabled`, `active_from`, `active_to`) VALUES
    (1, 'rewards.dailyLogin', 'rewards.dailyDescription', 'login', 'reldens.joinRoomEnd', '{"action":"dailyLogin","items":{"coins":1}}', 0, 1, NULL, NULL),
    (2, 'rewards.straightDaysLogin', 'rewards.straightDaysDescription', 'login', 'reldens.joinRoomEnd', '{"action":"straightDaysLogin","days":2,"items":{"coins":10}}', 0, 1, NULL, NULL);

-- Skills, levels, and stats data required for FK relationships
REPLACE INTO `skills_class_level_up_animations` (`id`, `class_path_id`, `level_id`, `animationData`) VALUES
	(1, NULL, NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}');

REPLACE INTO `skills_class_path` (`id`, `key`, `label`, `levels_set_id`, `enabled`) VALUES
	(1, 'journeyman', 'Journeyman', 1, 1),
	(2, 'sorcerer', 'Sorcerer', 2, 1),
	(3, 'warlock', 'Warlock', 3, 1),
	(4, 'swordsman', 'Swordsman', 4, 1),
	(5, 'warrior', 'Warrior', 5, 1);

REPLACE INTO `skills_class_path_level_labels` (`id`, `class_path_id`, `level_id`, `label`) VALUES
	(1, 1, 3, 'Old Traveler'),
	(2, 2, 7, 'Fire Master'),
	(3, 3, 11, 'Magus'),
	(4, 4, 15, 'Blade Master'),
	(5, 5, 19, 'Palading');

REPLACE INTO `skills_class_path_level_skills` (`id`, `class_path_id`, `level_id`, `skill_id`) VALUES
	(1, 1, 1, 2),
	(2, 1, 3, 1),
	(3, 1, 4, 3),
	(4, 1, 4, 4),
	(5, 2, 5, 1),
	(6, 2, 7, 3),
	(7, 2, 8, 4),
	(8, 3, 9, 1),
	(9, 3, 11, 3),
	(10, 3, 12, 2),
	(11, 4, 13, 2),
	(12, 4, 15, 4),
	(13, 5, 17, 2),
	(14, 5, 19, 1),
	(15, 5, 20, 4);

REPLACE INTO `skills_levels` (`id`, `key`, `label`, `required_experience`, `level_set_id`) VALUES
	(1, 1, '1', 0, 1),
	(2, 2, '2', 100, 1),
	(3, 5, '5', 338, 1),
	(4, 10, '10', 2570, 1),
	(5, 1, '1', 0, 2),
	(6, 2, '2', 100, 2),
	(7, 5, '5', 338, 2),
	(8, 10, '10', 2570, 2),
	(9, 1, '1', 0, 3),
	(10, 2, '2', 100, 3),
	(11, 5, '5', 338, 3),
	(12, 10, '10', 2570, 3),
	(13, 1, '1', 0, 4),
	(14, 2, '2', 100, 4),
	(15, 5, '5', 338, 4),
	(16, 10, '10', 2570, 4),
	(17, 1, '1', 0, 5),
	(18, 2, '2', 100, 5),
	(19, 5, '5', 338, 5),
	(20, 10, '10', 2570, 5);

REPLACE INTO `skills_levels_modifiers` (`id`, `level_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 2, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(2, 2, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(3, 2, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(4, 2, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(5, 2, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(6, 2, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(7, 2, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(8, 2, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(9, 3, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(10, 3, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(11, 3, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(12, 3, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(13, 3, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(14, 3, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(15, 3, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(16, 3, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(17, 4, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(18, 4, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(19, 4, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(20, 4, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(21, 4, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(22, 4, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(23, 4, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(24, 4, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(25, 6, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(26, 6, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(27, 6, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(28, 6, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(29, 6, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(30, 6, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(31, 6, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(32, 6, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(33, 7, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(34, 7, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(35, 7, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(36, 7, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(37, 7, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(38, 7, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(39, 7, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(40, 7, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(41, 8, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(42, 8, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(43, 8, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(44, 8, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(45, 8, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(46, 8, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(47, 8, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(48, 8, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(49, 10, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(50, 10, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(51, 10, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(52, 10, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(53, 10, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(54, 10, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(55, 10, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(56, 10, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(57, 11, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(58, 11, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(59, 11, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(60, 11, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(61, 11, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(62, 11, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(63, 11, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(64, 11, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(65, 12, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(66, 12, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(67, 12, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(68, 12, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(69, 12, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(70, 12, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(71, 12, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(72, 12, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(73, 14, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(74, 14, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(75, 14, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(76, 14, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(77, 14, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(78, 14, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(79, 14, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(80, 14, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(81, 15, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(82, 15, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(83, 15, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(84, 15, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(85, 15, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(86, 15, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(87, 15, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(88, 15, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(89, 16, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(90, 16, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(91, 16, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(92, 16, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(93, 16, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(94, 16, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(95, 16, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(96, 16, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL),
	(97, 18, 'inc_atk', 'stats/atk', 1, '10', NULL, NULL, NULL, NULL),
	(98, 18, 'inc_def', 'stats/def', 1, '10', NULL, NULL, NULL, NULL),
	(99, 18, 'inc_hp', 'stats/hp', 1, '10', NULL, NULL, NULL, NULL),
	(100, 18, 'inc_mp', 'stats/mp', 1, '10', NULL, NULL, NULL, NULL),
	(101, 18, 'inc_atk', 'statsBase/atk', 1, '10', NULL, NULL, NULL, NULL),
	(102, 18, 'inc_def', 'statsBase/def', 1, '10', NULL, NULL, NULL, NULL),
	(103, 18, 'inc_hp', 'statsBase/hp', 1, '10', NULL, NULL, NULL, NULL),
	(104, 18, 'inc_mp', 'statsBase/mp', 1, '10', NULL, NULL, NULL, NULL),
	(105, 19, 'inc_atk', 'stats/atk', 1, '20', NULL, NULL, NULL, NULL),
	(106, 19, 'inc_def', 'stats/def', 1, '20', NULL, NULL, NULL, NULL),
	(107, 19, 'inc_hp', 'stats/hp', 1, '20', NULL, NULL, NULL, NULL),
	(108, 19, 'inc_mp', 'stats/mp', 1, '20', NULL, NULL, NULL, NULL),
	(109, 19, 'inc_atk', 'statsBase/atk', 1, '20', NULL, NULL, NULL, NULL),
	(110, 19, 'inc_def', 'statsBase/def', 1, '20', NULL, NULL, NULL, NULL),
	(111, 19, 'inc_hp', 'statsBase/hp', 1, '20', NULL, NULL, NULL, NULL),
	(112, 19, 'inc_mp', 'statsBase/mp', 1, '20', NULL, NULL, NULL, NULL),
	(113, 20, 'inc_atk', 'stats/atk', 1, '50', NULL, NULL, NULL, NULL),
	(114, 20, 'inc_def', 'stats/def', 1, '50', NULL, NULL, NULL, NULL),
	(115, 20, 'inc_hp', 'stats/hp', 1, '50', NULL, NULL, NULL, NULL),
	(116, 20, 'inc_mp', 'stats/mp', 1, '50', NULL, NULL, NULL, NULL),
	(117, 20, 'inc_atk', 'statsBase/atk', 1, '50', NULL, NULL, NULL, NULL),
	(118, 20, 'inc_def', 'statsBase/def', 1, '50', NULL, NULL, NULL, NULL),
	(119, 20, 'inc_hp', 'statsBase/hp', 1, '50', NULL, NULL, NULL, NULL),
	(120, 20, 'inc_mp', 'statsBase/mp', 1, '50', NULL, NULL, NULL, NULL);

REPLACE INTO `skills_levels_set` (`id`, `autoFillRanges`, `autoFillExperienceMultiplier`) VALUES
	(1, 1, NULL),
	(2, 1, NULL),
	(3, 1, NULL),
	(4, 1, NULL),
	(5, 1, NULL);

REPLACE INTO `skills_owners_class_path` (`id`, `class_path_id`, `owner_id`, `currentLevel`, `currentExp`) VALUES
	(1, 1, 1, 10, 9080);

REPLACE INTO `skills_skill` (`id`, `key`, `type`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`, `customData`) VALUES
	(1, 'attackBullet', '4', 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(2, 'attackShort', '2', 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(3, 'fireball', '4', 0, 5000, 2000, 0, 280, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(4, 'heal', '3', 0, 5000, 2000, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 1, 0, 1, 0, NULL),
	(1001, 'testSkillAttackMain', '1', 0, 1000, 0, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(1002, 'testSkillAttackDelete', '1', 0, 1000, 0, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(1003, 'testSkillAttackEditFail', '1', 0, 1000, 0, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL);

REPLACE INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES
	(1, 3, 'bullet', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":-1,"frameRate":1,"dir":3}'),
	(2, 3, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}'),
	(3, 4, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000}'),
	(4, 4, 'hit', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_hit","frameWidth":64,"frameHeight":70,"start":0,"end":4,"repeat":0,"depthByPlayer":"above"}');

REPLACE INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(3, 3, 'stats/hp', 0, 7, 0, 'stats/mgk-atk,stats/speed', 'stats/mgk-def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0);

REPLACE INTO `skills_skill_owner_conditions` (`id`, `skill_id`, `key`, `property_key`, `conditional`, `value`) VALUES
	(1, 3, 'available_mp', 'stats/mp', 'ge', '5');

REPLACE INTO `skills_skill_owner_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(2, 3, 'dec_mp', 'stats/mp', 2, '5', '0', ' ', NULL, NULL),
	(3, 4, 'dec_mp', 'stats/mp', 2, '2', '0', '', NULL, NULL);

REPLACE INTO `skills_skill_physical_data` (`id`, `skill_id`, `magnitude`, `objectWidth`, `objectHeight`, `validateTargetOnHit`) VALUES
	(1, 1, 350, 5, 5, 0),
	(2, 3, 550, 5, 5, 0);

REPLACE INTO `skills_skill_target_effects` (`id`, `skill_id`, `key`, `property_key`, `operation`, `value`, `minValue`, `maxValue`, `minProperty`, `maxProperty`) VALUES
	(1, 4, 'heal', 'stats/hp', 1, '10', '0', '0', NULL, 'statsBase/hp');

REPLACE INTO `stats` (`id`, `key`, `label`, `description`, `base_value`, `customData`) VALUES
	(1, 'hp', 'HP', 'Player life points', 100, '{"showBase":true}'),
	(2, 'mp', 'MP', 'Player magic points', 100, '{"showBase":true}'),
	(3, 'atk', 'Atk', 'Player attack points', 100, NULL),
	(4, 'def', 'Def', 'Player defense points', 100, NULL),
	(5, 'dodge', 'Dodge', 'Player dodge points', 100, NULL),
	(6, 'speed', 'Speed', 'Player speed point', 100, NULL),
	(7, 'aim', 'Aim', 'Player aim points', 100, NULL),
	(8, 'stamina', 'Stamina', 'Player stamina points', 100, '{"showBase":true}'),
	(9, 'mAtk', 'Magic Atk', 'Player magic attack', 100, NULL),
	(10, 'mDef', 'Magic Def', 'Player magic defense', 100, NULL);

REPLACE INTO `skills_groups` (`id`, `key`, `label`, `description`, `sort`) VALUES
	(1, 'combat', 'Combat Skills', 'Combat related skills', 1);

REPLACE INTO `clan_levels` (`id`, `key`, `label`, `required_experience`) VALUES
	(1, 1, 'Novice', 0),
	(2, 2, 'Veteran', 1000);



-- Locale data (category 1 - no required FK)
REPLACE INTO `locale` (`id`, `locale`, `language_code`, `country_code`) VALUES
	(1, 'en_US', 'en', 'US'),
	(1001, 'te_TS', 'te', 'TS'),
	(1002, 'te_ED', 'te', 'TS'),
	(1003, 'te_DL', 'te', 'TS');

--

SET FOREIGN_KEY_CHECKS = 1;

--

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
	(1, 5, 'reldens.activatedRoom_reldens-new-age-town', '{"rewardItemKey":"coins","rewardItemQty":1}'),
	(2, 6, 'reldens.activatedRoom_reldens-forest-level-1', '{"rewardItemKey":"coins","rewardItemQty":1}');

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
	(7, 'ore', 3, NULL, 'Ore', 'A chunk of raw ore.', 0, 0, NULL, NULL, '{}'),
	(8, 'fish', 2, NULL, 'Fish', 'A fish.', 0, 0, NULL, NULL, '{"removeAfterUse":true}'),
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
	(4, 6, 'magic_potion_20', 'stats/mp', 1, '20', 'statsBase/mp'),
	(5, 8, 'fish', 'stats/hp', 1, '10', 'statsBase/hp');

-- ENTITIES WITH UPLOADS AND FK (Category 4): rooms

REPLACE INTO `rooms` (`id`, `name`, `title`, `map_filename`, `scene_images`, `room_class_key`, `customData`) VALUES
	(2, 'reldens-house-1', 'House - 1', 'reldens-house-1.json', 'reldens-house-1.png', NULL, '{"allowGuest":true}'),
	(3, 'reldens-house-2', 'House - 2', 'reldens-house-2.json', 'reldens-house-2.png', NULL, '{"allowGuest":true}'),
	(6, 'reldens-house-1-2d-floor', 'House - 1 - Floor 2', 'reldens-house-1-2d-floor.json', 'reldens-house-1-2d-floor.png', NULL, NULL),
	(7, 'reldens-gravity', 'Gravity World!', 'reldens-gravity.json', 'reldens-gravity.png', NULL, '{"allowGuest":true,"gravity":[0,625],"applyGravity":true,"allowPassWallsFromBelow":true,"timeStep":0.012,"type":"TOP_DOWN_WITH_GRAVITY","useFixedWorldStep":false,"maxSubSteps":2,"movementSpeed":160,"usePathFinder":false}'),
    (9, 'reldens-bots-forest', 'Bots Forest', 'reldens-bots-forest.json', 'reldens-bots-forest.png', NULL, '{"allowGuest":true,"joinInRandomPlace":true,"joinInRandomPlaceGuestAlways":true}'),
    (10, 'reldens-bots-forest-house-01-n0', 'Bots Forest - House 1-0', 'reldens-bots-forest-house-01-n0.json', 'reldens-bots-forest-house-01-n0.png', NULL, '{"allowGuest":true}'),
	(41, 'reldens-new-age-town', 'New Age Town', 'reldens-new-age-town.json', 'reldens-new-age-town.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.25,"quantity":6}}}'),
	(109, 'reldens-new-age-town-house-01', 'New Age Town - House 1', 'reldens-new-age-town-house-01.json', 'reldens-new-age-town-house-01.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(110, 'reldens-new-age-town-house-02', 'New Age Town - House 2', 'reldens-new-age-town-house-02.json', 'reldens-new-age-town-house-02.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(111, 'reldens-new-age-town-house-03', 'New Age Town - House 3', 'reldens-new-age-town-house-03.json', 'reldens-new-age-town-house-03.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(112, 'reldens-new-age-town-house-04', 'New Age Town - House 4', 'reldens-new-age-town-house-04.json', 'reldens-new-age-town-house-04.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(113, 'reldens-new-age-town-house-05', 'New Age Town - House 5', 'reldens-new-age-town-house-05.json', 'reldens-new-age-town-house-05.png', NULL, '{"enabled":true,"allowGuest":true}'),
	(114, 'reldens-forest-level-1', 'Forest - Level 1', 'reldens-forest-level-1.json', 'reldens-forest-level-1.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.29,"quantity":7}}}'),
	(115, 'reldens-forest-level-2', 'Forest - Level 2', 'reldens-forest-level-2.json', 'reldens-forest-level-2.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.33,"quantity":8}}}'),
	(116, 'reldens-forest-level-3', 'Forest - Level 3', 'reldens-forest-level-3.json', 'reldens-forest-level-3.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.37,"quantity":9},"rain":true}}'),
	(117, 'reldens-forest-level-4', 'Forest - Level 4', 'reldens-forest-level-4.json', 'reldens-forest-level-4.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.42,"quantity":10},"rain":true}}'),
	(118, 'reldens-forest-level-5', 'Forest - Level 5', 'reldens-forest-level-5.json', 'reldens-forest-level-5.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.46,"quantity":11}}}'),
	(119, 'reldens-forest-level-6', 'Forest - Level 6', 'reldens-forest-level-6.json', 'reldens-forest-level-6.png', NULL, '{"enabled":true,"allowGuest":true,"weather":{"clouds":{"alpha":0.5,"quantity":12}}}'),
    (1001, 'test-room-list', 'Test Room List', 'test-room-list.json', 'test-room-list.png', NULL, '{"allowGuest":true}'),
    (1002, 'test-room-edit', 'Test Room Edit', 'test-room-edit.json', 'test-room-edit.png', NULL, '{"allowGuest":true}'),
    (1003, 'test-room-delete', 'Test Room Delete', 'test-room-delete.json', 'test-room-delete.png', NULL, '{"allowGuest":true}');

REPLACE INTO `rooms_change_points` (`id`, `room_id`, `tile_index`, `next_room_id`) VALUES
	(1, 2, 816, 41),
	(2, 2, 817, 41),
	(3, 3, 778, 41),
	(4, 3, 779, 41),
	(11, 2, 623, 6),
	(12, 2, 663, 6),
	(13, 6, 624, 2),
	(14, 6, 664, 2),
	(15, 7, 540, 3),
	(16, 3, 500, 7),
	(17, 3, 780, 41),
	(19, 10, 381, 9),
	(20, 10, 382, 9),
	(21, 41, 2078, 2),
	(22, 41, 3387, 3),
	(23, 41, 3242, 109),
	(24, 41, 3255, 110),
	(190, 109, 494, 41),
	(191, 109, 495, 41),
	(192, 110, 476, 41),
	(193, 110, 477, 41),
	(194, 111, 494, 41),
	(195, 111, 495, 41),
	(196, 112, 494, 41),
	(197, 112, 495, 41),
	(198, 113, 476, 41),
	(199, 113, 477, 41),
	(200, 41, 4700, 111),
	(201, 41, 4390, 112),
	(202, 41, 4397, 113),
	(203, 41, 18, 114),
	(204, 41, 19, 114),
	(205, 114, 7114, 41),
	(206, 114, 7115, 41),
	(207, 114, 93, 115),
	(208, 114, 94, 115),
	(209, 115, 7079, 114),
	(210, 115, 7080, 114),
	(211, 115, 3241, 116),
	(212, 115, 3313, 116),
	(213, 116, 2086, 115),
	(214, 116, 2158, 115),
	(215, 116, 7079, 117),
	(216, 116, 7080, 117),
	(217, 117, 102, 116),
	(218, 117, 103, 116),
	(219, 117, 4390, 118),
	(220, 117, 4462, 118),
	(221, 118, 5185, 117),
	(222, 118, 5257, 117),
	(223, 118, 124, 119),
	(224, 118, 125, 119),
	(225, 119, 7082, 118),
	(226, 119, 7083, 118),
	(227, 9, 21097, 10),
	(228, 114, 7113, 41),
	(229, 114, 7116, 41),
	(230, 114, 95, 115),
	(231, 114, 96, 115),
	(232, 115, 7078, 114),
	(233, 115, 7081, 114),
	(234, 115, 3385, 116),
	(235, 115, 3457, 116),
	(236, 115, 3529, 116),
	(237, 116, 2014, 115),
	(238, 116, 2230, 115),
	(239, 116, 7081, 117),
	(240, 116, 7082, 117),
	(241, 117, 104, 116),
	(242, 117, 105, 116),
	(243, 117, 4534, 118),
	(244, 117, 4606, 118),
	(245, 118, 5113, 117),
	(246, 118, 5329, 117),
	(247, 118, 126, 119),
	(248, 118, 127, 119),
	(249, 119, 7081, 118),
	(250, 119, 7084, 118),
	(251, 41, 20, 114),
	(252, 41, 21, 114);

REPLACE INTO `rooms_return_points` (`id`, `room_id`, `direction`, `x`, `y`, `is_default`, `from_room_id`) VALUES
	(9, 6, 'right', 820, 500, 0, 2),
	(11, 2, 'left', 720, 540, 0, 6),
	(12, 7, 'left', 340, 600, 0, NULL),
	(13, 3, 'down', 660, 520, 0, 7),
	(14, 9, 'down', 3120, 3472, 1, NULL),
	(15, 9, 'down', 3120, 3472, 0, 10),
	(16, 10, 'up', 64, 544, 1, 9),
	(38, 2, 'down', 528, 624, 1, 41),
	(39, 3, 'down', 624, 592, 1, 41),
	(91, 109, 'up', 272, 800, 1, 41),
	(92, 110, 'up', 272, 768, 1, 41),
	(93, 111, 'up', 272, 800, 1, 41),
	(94, 112, 'up', 272, 800, 1, 41),
	(95, 113, 'up', 272, 768, 1, 41),
	(96, 41, 'down', 912, 880, 0, 2),
	(97, 41, 'down', 816, 1392, 0, 3),
	(98, 41, 'down', 1424, 1360, 0, 109),
	(99, 41, 'down', 1840, 1360, 0, 110),
	(100, 41, 'down', 848, 1904, 0, 111),
	(101, 41, 'down', 1424, 1840, 0, 112),
	(102, 41, 'down', 1648, 1808, 0, 113),
	(110, 41, 'down', 640, 80, 0, 114),
	(111, 114, 'up', 1888, 3088, 1, 41),
	(112, 114, 'down', 736, 112, 0, 115),
	(113, 115, 'up', 704, 3056, 1, 114),
	(114, 115, 'right', 128, 1504, 0, 116),
	(115, 116, 'left', 2192, 928, 1, 115),
	(116, 116, 'up', 800, 3072, 0, 117),
	(117, 117, 'down', 1024, 112, 1, 116),
	(118, 117, 'left', 2176, 1984, 0, 118),
	(119, 118, 'right', 112, 2336, 1, 117),
	(120, 118, 'down', 1728, 128, 0, 119),
	(121, 119, 'up', 864, 3088, 1, 118),
	(122, 41, 'down', 1520, 1424, 1, NULL),
    (1001, 1001, 'down', 100, 100, 1, NULL),
    (1002, 1002, 'down', 200, 200, 1, NULL),
    (1003, 1003, 'down', 300, 300, 1, NULL);

-- ENTITIES WITH REQUIRED FK (Category 2): audio, objects, chat, respawn, rewards

REPLACE INTO `audio_categories` (`id`, `category_key`, `category_label`, `enabled`, `single_audio`) VALUES
	(1, 'music', 'Music', 1, 1),
	(3, 'sound', 'Sound', 1, 0);

REPLACE INTO `audio` (`id`, `audio_key`, `files_name`, `config`, `room_id`, `category_id`, `enabled`) VALUES
	(3, 'footstep', 'footstep.mp3', '{"onlyCurrentPlayer":true}', NULL, 3, 1),
	(4, 'reldens-new-age-town', 'reldens-town.mp3', '', 41, 1, 1),
	(1001, 'test-audio-list', 'test-audio-list.mp3', '{"test":true}', 41, 1, 1),
	(1002, 'test-audio-edit', 'test-audio-edit.mp3', '{"test":true}', 41, 1, 1),
	(1003, 'test-audio-delete', 'test-audio-delete.mp3', '{"test":true}', 41, 1, 1);

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
	(5, 41, 'ground', 3482, 3, 'npc_1', 'people_town_1', 'Alfred', '{"runOnAction":true,"playerVisible":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hello! My name is Alfred. Go to the forest and kill some monsters! Now... leave me alone!","autoStart":true,"animations":{"people_town_1_down":{"start":0,"end":2},"people_town_1_left":{"start":3,"end":5},"people_town_1_right":{"start":6,"end":8},"people_town_1_up":{"start":9,"end":11}}}', 1),
	(6, 114, 'merge-respawn-area-monsters', NULL, 7, 'enemy_1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(7, 114, 'merge-respawn-area-monsters', NULL, 7, 'enemy_2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(8, 41, 'ground', 3567, 3, 'npc_2', 'healer_1', 'Mamon', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true}', '{"content":"Hello traveler! I can restore your health, would you like me to do it?","options":{"1":{"label":"Heal HP","value":1},"2":{"label":"Nothing...","value":2},"3":{"label":"Need some MP","value":3}},"ui":true,"autoStart":true,"animations":{"healer_1_down":{"start":0,"end":2},"healer_1_left":{"start":0,"end":2},"healer_1_right":{"start":0,"end":2},"healer_1_up":{"start":0,"end":2}}}', 1),
	(10, 41, 'ground', 3578, 5, 'npc_3', 'merchant_1', 'Gimly', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hi there! What would you like to do?","options":{"buy":{"label":"Buy","value":"buy"},"sell":{"label":"Sell","value":"sell"}},"autoStart":true,"animations":{"merchant_1_down":{"start":0,"end":2},"merchant_1_left":{"start":3,"end":5},"merchant_1_right":{"start":6,"end":8},"merchant_1_up":{"start":9,"end":11}}}', 1),
	(12, 41, 'ground', 3499, 3, 'npc_4', 'weapons_master_1', 'Barrik', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hi, I am the weapons master, choose your weapon and go kill some monsters!","options":{"1":{"key":"axe","label":"Axe","value":1,"icon":"axe"},"2":{"key":"spear","label":"Spear","value":2,"icon":"spear"}},"ui":true,"autoStart":true,"animations":{"weapons_master_1_down":{"start":0,"end":2},"weapons_master_1_left":{"start":3,"end":5},"weapons_master_1_right":{"start":6,"end":8},"weapons_master_1_up":{"start":9,"end":11}}}', 1),
	(13, 114, 'ground', 6833, 3, 'npc_5', 'quest_npc_1', 'Miles', '{"runOnAction":true,"playerVisible":true,"sendInvalidOptionMessage":true,"collisionType":4,"hasState":true,"randomMovement":{"maxTiles":5}}', '{"content":"Hi there! Do you want a coin? I can give you one if you give me a tree branch.","options":{"1":{"label":"Sure!","value":1},"2":{"label":"No, thank you.","value":2}},"ui":true,"autoStart":true,"animations":{"quest_npc_1_down":{"start":0,"end":2},"quest_npc_1_left":{"start":3,"end":5},"quest_npc_1_right":{"start":6,"end":8},"quest_npc_1_up":{"start":9,"end":11}}}', 1),
	(14, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b1', 'enemy_forest_1', 'Tree', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(15, 9, 'ground-respawn-area', NULL, 7, 'enemy_bot_b2', 'enemy_forest_2', 'Tree Punch', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(16, 114, 'merge-respawn-area-mining-rocks', NULL, 7, 'rock_forest_1_area', 'rock_forest_1', NULL, '{"shouldRespawn":true,"childObjectClassKey":"rock_forest_1","itemKey":"ore","cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"runOnAction":true,"collisionType":2,"hasState":true,"interactionArea":48}', '{"timingDuration":5000,"isInteractive":true,"frameStart":0,"frameEnd":0,"classKey":"rock_forest_1","ui":false}', 1),
	(17, 114, 'merge-spot_003_river_grass-collisions', 822, 8, 'fish_spawn_forest_1', 'fish_spawn_forest_1', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(18, 114, 'ground', 6613, 3, 'chest_forest_1', 'chest_forest_1', 'Treasure Chest', '{"runOnAction":true,"playerVisible":true,"collisionType":2}', '{"content":"A dusty old chest...","ui":true,"frameStart":0,"frameEnd":0,"animations":{"chest_forest_1_open":{"asset_key":"chest_forest_1","start":0,"end":1,"frameRate":8,"repeat":0}}}', 1),
	(19, 41, 'merge-collisions', 2078, 2, 'door_3', 'door_house_3', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(22, 41, 'merge-collisions', 3387, 2, 'door_4', 'door_house_4', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-26},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(23, 41, 'merge-collisions', 3242, 2, 'door_5', 'door_house_5', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(24, 41, 'merge-collisions', 3255, 2, 'door_6', 'door_house_6', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(25, 41, 'merge-collisions', 4700, 2, 'door_7', 'door_house_7', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(26, 41, 'merge-collisions', 4390, 2, 'door_8', 'door_house_8', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(27, 41, 'merge-collisions', 4397, 2, 'door_9', 'door_house_9', NULL, '{"runOnHit":true,"roomVisible":true,"yFix":6,"collisionResponse":false}', '{"positionFix":{"y":-22},"frameStart":0,"frameEnd":3,"repeat":0,"hideOnComplete":false,"autoStart":false,"restartTime":2000,"asset_key":"door_house_3"}', 1),
	(28, 115, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-2_enemy_forest_1', 'forest_purple_mushroom', 'Purple Mushroom', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(29, 115, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-2_enemy_forest_2', 'forest_red_mushroom', 'Red Mushroom', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(30, 116, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-3_enemy_forest_1', 'forest_carnivorous_plant', 'Carnivorous Plant', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(31, 116, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-3_enemy_forest_2', 'forest_seed_golem', 'Seed Golem', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(32, 117, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-4_enemy_forest_1', 'forest_snake', 'Forest Snake', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(33, 117, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-4_enemy_forest_2', 'forest_giant_spider', 'Giant Spider', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(34, 118, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-5_enemy_forest_1', 'forest_scorpion', 'Scorpion', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(35, 118, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-5_enemy_forest_2', 'forest_spiked_armadillo', 'Spiked Armadillo', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(36, 119, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-6_enemy_forest_1', 'forest_gargoyle', 'Gargoyle', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":true,"interactionRadio":170,"randomMovement":{"maxTiles":3}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(37, 119, 'merge-respawn-area-monsters', NULL, 7, 'reldens-forest-level-6_enemy_forest_2', 'forest_red_demon', 'Red Demon', '{"shouldRespawn":true,"childObjectType":4,"isAggressive":false,"interactionRadio":70,"randomMovement":{"maxTiles":8}}', '{"autoStart":true,"frameStart":12,"frameEnd":26,"repeat":-1}', 1),
	(38, 114, 'merge-spot_003_river_grass-collisions', 1614, 8, 'fish_spawn_forest_2', 'fish_spawn_forest_2', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(39, 114, 'merge-spot_003_river_grass-collisions', 1965, 8, 'fish_spawn_forest_3', 'fish_spawn_forest_3', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(40, 114, 'merge-spot_003_river_grass-collisions', 1740, 8, 'fish_spawn_forest_4', 'fish_spawn_forest_4', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(41, 114, 'merge-spot_003_river_grass-collisions', 946, 8, 'fish_spawn_forest_5', 'fish_spawn_forest_5', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(42, 114, 'merge-spot_003_river_grass-collisions', 812, 8, 'fish_spawn_forest_6', 'fish_spawn_forest_6', NULL, '{"cancelOnMove":true,"cancelOnHit":true,"cancelOnOutOfRange":false,"rewards":[{"key":"fish","rate":100}],"runOnAction":true,"fishCooldown":3000,"collisionType":2}', '{"timingDuration":10000,"isInteractive":true,"frameStart":0,"frameEnd":2,"autoStart":true,"repeat":-1,"classKey":"fish_spawn_forest_1","ui":false}', 1),
	(1001, 41, 'test-layer', 100, 3, 'test-object-list', 'test_object_list', 'Test Object List', '{"runOnAction":true}', '{"content":"Test object for list validation"}', 1),
	(1002, 41, 'test-layer', 101, 3, 'test-object-edit', 'test_object_edit', 'Test Object Edit', '{"runOnAction":true}', '{"content":"Test object for edit validation"}', 1),
	(1003, 41, 'test-layer', 102, 3, 'test-object-delete', 'test_object_delete', 'Test Object Delete', '{"runOnAction":true}', '{"content":"Test object for delete validation"}', 1);

REPLACE INTO `objects_animations` (`id`, `object_id`, `animationKey`, `animationData`) VALUES
	(5, 6, 'merge-respawn-area-monsters_6_right', '{"start":6,"end":8}'),
	(6, 6, 'merge-respawn-area-monsters_6_down', '{"start":0,"end":2}'),
	(7, 6, 'merge-respawn-area-monsters_6_left', '{"start":3,"end":5}'),
	(8, 6, 'merge-respawn-area-monsters_6_up', '{"start":9,"end":11}'),
	(9, 28, 'merge-respawn-area-monsters_28_right', '{"start":6,"end":8}'),
	(10, 28, 'merge-respawn-area-monsters_28_down', '{"start":0,"end":2}'),
	(11, 28, 'merge-respawn-area-monsters_28_left', '{"start":3,"end":5}'),
	(12, 28, 'merge-respawn-area-monsters_28_up', '{"start":9,"end":11}'),
	(13, 30, 'merge-respawn-area-monsters_30_right', '{"start":6,"end":8}'),
	(14, 30, 'merge-respawn-area-monsters_30_down', '{"start":0,"end":2}'),
	(15, 30, 'merge-respawn-area-monsters_30_left', '{"start":3,"end":5}'),
	(16, 30, 'merge-respawn-area-monsters_30_up', '{"start":9,"end":11}'),
	(17, 32, 'merge-respawn-area-monsters_32_right', '{"start":6,"end":8}'),
	(18, 32, 'merge-respawn-area-monsters_32_down', '{"start":0,"end":2}'),
	(19, 32, 'merge-respawn-area-monsters_32_left', '{"start":3,"end":5}'),
	(20, 32, 'merge-respawn-area-monsters_32_up', '{"start":9,"end":11}'),
	(21, 34, 'merge-respawn-area-monsters_34_right', '{"start":6,"end":8}'),
	(22, 34, 'merge-respawn-area-monsters_34_down', '{"start":0,"end":2}'),
	(23, 34, 'merge-respawn-area-monsters_34_left', '{"start":3,"end":5}'),
	(24, 34, 'merge-respawn-area-monsters_34_up', '{"start":9,"end":11}'),
	(25, 36, 'merge-respawn-area-monsters_36_right', '{"start":6,"end":8}'),
	(26, 36, 'merge-respawn-area-monsters_36_down', '{"start":0,"end":2}'),
	(27, 36, 'merge-respawn-area-monsters_36_left', '{"start":3,"end":5}'),
	(28, 36, 'merge-respawn-area-monsters_36_up', '{"start":9,"end":11}'),
	(29, 29, 'merge-respawn-area-monsters_29_right', '{"start":6,"end":8}'),
	(30, 29, 'merge-respawn-area-monsters_29_down', '{"start":0,"end":2}'),
	(31, 29, 'merge-respawn-area-monsters_29_left', '{"start":3,"end":5}'),
	(32, 29, 'merge-respawn-area-monsters_29_up', '{"start":9,"end":11}'),
	(33, 31, 'merge-respawn-area-monsters_31_right', '{"start":6,"end":8}'),
	(34, 31, 'merge-respawn-area-monsters_31_down', '{"start":0,"end":2}'),
	(35, 31, 'merge-respawn-area-monsters_31_left', '{"start":3,"end":5}'),
	(36, 31, 'merge-respawn-area-monsters_31_up', '{"start":9,"end":11}'),
	(37, 33, 'merge-respawn-area-monsters_33_right', '{"start":6,"end":8}'),
	(38, 33, 'merge-respawn-area-monsters_33_down', '{"start":0,"end":2}'),
	(39, 33, 'merge-respawn-area-monsters_33_left', '{"start":3,"end":5}'),
	(40, 33, 'merge-respawn-area-monsters_33_up', '{"start":9,"end":11}'),
	(41, 35, 'merge-respawn-area-monsters_35_right', '{"start":6,"end":8}'),
	(42, 35, 'merge-respawn-area-monsters_35_down', '{"start":0,"end":2}'),
	(43, 35, 'merge-respawn-area-monsters_35_left', '{"start":3,"end":5}'),
	(44, 35, 'merge-respawn-area-monsters_35_up', '{"start":9,"end":11}'),
	(45, 37, 'merge-respawn-area-monsters_37_right', '{"start":6,"end":8}'),
	(46, 37, 'merge-respawn-area-monsters_37_down', '{"start":0,"end":2}'),
	(47, 37, 'merge-respawn-area-monsters_37_left', '{"start":3,"end":5}'),
	(48, 37, 'merge-respawn-area-monsters_37_up', '{"start":9,"end":11}'),
	(49, 7, 'merge-respawn-area-monsters_7_right', '{"start":6,"end":8}'),
	(50, 7, 'merge-respawn-area-monsters_7_down', '{"start":0,"end":2}'),
	(51, 7, 'merge-respawn-area-monsters_7_left', '{"start":3,"end":5}'),
	(52, 7, 'merge-respawn-area-monsters_7_up', '{"start":9,"end":11}'),
	(53, 14, 'ground-respawn-area_14_right', '{"start":6,"end":8}'),
	(54, 14, 'ground-respawn-area_14_down', '{"start":0,"end":2}'),
	(55, 14, 'ground-respawn-area_14_left', '{"start":3,"end":5}'),
	(56, 14, 'ground-respawn-area_14_up', '{"start":9,"end":11}'),
	(57, 15, 'ground-respawn-area_15_right', '{"start":6,"end":8}'),
	(58, 15, 'ground-respawn-area_15_down', '{"start":0,"end":2}'),
	(59, 15, 'ground-respawn-area_15_left', '{"start":3,"end":5}'),
	(60, 15, 'ground-respawn-area_15_up', '{"start":9,"end":11}');

REPLACE INTO `objects_assets` (`object_asset_id`, `object_id`, `asset_type`, `asset_key`, `asset_file`, `extra_params`) VALUES
	(3, 5, 'spritesheet', 'people_town_1', 'people-b-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(5, 6, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(6, 7, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(7, 5, 'spritesheet', 'healer_1', 'healer-1.png', '{"frameWidth":52,"frameHeight":71}'),
	(9, 10, 'spritesheet', 'merchant_1', 'people-d-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(10, 12, 'spritesheet', 'weapons_master_1', 'people-c-x2.png', '{"frameWidth":52,"frameHeight":71}'),
	(11, 13, 'spritesheet', 'quest_npc_1', 'people-quest-npc.png', '{"frameWidth":52,"frameHeight":71}'),
	(12, 14, 'spritesheet', 'enemy_forest_1', 'monster-treant.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(13, 15, 'spritesheet', 'enemy_forest_2', 'monster-golem2.png', '{"frameWidth":47,"frameHeight":50,"spacing":2}'),
	(14, 16, 'spritesheet', 'rock_forest_1', 'rock.png', '{"frameWidth":32,"frameHeight":32}'),
	(15, 17, 'spritesheet', 'fish_spawn_forest_1', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(16, 18, 'spritesheet', 'chest_forest_1', 'chest.png', '{"frameWidth":32,"frameHeight":32}'),
	(17, 19, 'spritesheet', 'door_house_3', 'door-a-x3.png', '{"frameWidth":32,"frameHeight":64}'),
	(18, 28, 'spritesheet', 'forest_purple_mushroom', 'monster-purple-mushroom.png', '{"frameWidth":32,"frameHeight":46,"spacing":2}'),
	(19, 29, 'spritesheet', 'forest_red_mushroom', 'monster-red-mushroom.png', '{"frameWidth":44,"frameHeight":62,"spacing":2}'),
	(20, 30, 'spritesheet', 'forest_carnivorous_plant', 'monster-carnivorous-plant.png', '{"frameWidth":52,"frameHeight":70,"spacing":2}'),
	(21, 31, 'spritesheet', 'forest_seed_golem', 'monster-seed-golem.png', '{"frameWidth":56,"frameHeight":60,"spacing":2}'),
	(22, 32, 'spritesheet', 'forest_snake', 'monster-forest-snake.png', '{"frameWidth":48,"frameHeight":48,"spacing":2}'),
	(23, 33, 'spritesheet', 'forest_giant_spider', 'monster-giant-spider.png', '{"frameWidth":54,"frameHeight":40,"spacing":2}'),
	(24, 34, 'spritesheet', 'forest_scorpion', 'monster-scorpion.png', '{"frameWidth":54,"frameHeight":52,"spacing":2}'),
	(25, 35, 'spritesheet', 'forest_spiked_armadillo', 'monster-spiked-armadillo.png', '{"frameWidth":64,"frameHeight":70,"spacing":2}'),
	(26, 36, 'spritesheet', 'forest_gargoyle', 'monster-gargoyle.png', '{"frameWidth":78,"frameHeight":68,"spacing":2}'),
	(27, 37, 'spritesheet', 'forest_red_demon', 'monster-red-demon.png', '{"frameWidth":80,"frameHeight":90,"spacing":2}'),
	(28, 38, 'spritesheet', 'fish_spawn_forest_2', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(29, 39, 'spritesheet', 'fish_spawn_forest_3', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(30, 40, 'spritesheet', 'fish_spawn_forest_4', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(31, 41, 'spritesheet', 'fish_spawn_forest_5', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
	(32, 42, 'spritesheet', 'fish_spawn_forest_6', 'fish-spawn.png', '{"frameWidth":32,"frameHeight":32}'),
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
	(5, 10, 'magic_potion_20', 'coins', 1, 0),
	(6, 10, 'ore', 'coins', 1, 0);

REPLACE INTO `drops_animations` (`id`, `item_id`, `asset_type`, `asset_key`, `file`, `extra_params`) VALUES
    (1, 1, NULL, 'coins', 'coins.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
	(2, 2, NULL, 'branch', 'branch.png', '{"start":0,"end":2,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (3, 3, NULL, 'heal-potion-20', 'heal-potion-20.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
	(4, 4, NULL, 'axe', 'axe.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (5, 5, NULL, 'spear', 'spear.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}'),
    (6, 6, NULL, 'magic-potion-20', 'magic-potion-20.png', '{"start":0,"end":0,"repeat":-1,"frameWidth":32, "frameHeight":32,"depthByPlayer":"above"}');

REPLACE INTO `objects_skills` (`id`, `object_id`, `skill_id`, `target_id`) VALUES
	(1, 6, 1, 2),
	(2, 28, 1, 2),
	(3, 30, 1, 2),
	(4, 32, 1, 2),
	(5, 34, 1, 2),
	(6, 36, 1, 2),
	(7, 30, 5, 2),
	(8, 31, 5, 2),
	(9, 32, 6, 2),
	(10, 33, 6, 2),
	(11, 34, 7, 2),
	(12, 35, 7, 2),
	(13, 36, 8, 2),
	(14, 37, 8, 2);

REPLACE INTO `objects_stats` (`id`, `object_id`, `stat_id`, `base_value`, `value`) VALUES
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
    (60, 15, 10, 50, 50),
	(61, 28, 1, 60, 60),
	(62, 28, 2, 60, 60),
	(63, 28, 3, 60, 60),
	(64, 28, 4, 60, 60),
	(65, 28, 5, 50, 50),
	(66, 28, 6, 50, 50),
	(67, 28, 7, 50, 50),
	(68, 28, 8, 50, 50),
	(69, 28, 9, 50, 50),
	(70, 28, 10, 50, 50),
	(71, 29, 1, 60, 60),
	(72, 29, 2, 60, 60),
	(73, 29, 3, 60, 60),
	(74, 29, 4, 60, 60),
	(75, 29, 5, 50, 50),
	(76, 29, 6, 50, 50),
	(77, 29, 7, 50, 50),
	(78, 29, 8, 50, 50),
	(79, 29, 9, 50, 50),
	(80, 29, 10, 50, 50),
	(81, 30, 1, 150, 150),
	(82, 30, 2, 100, 100),
	(83, 30, 3, 100, 100),
	(84, 30, 4, 90, 90),
	(85, 30, 5, 50, 50),
	(86, 30, 6, 50, 50),
	(87, 30, 7, 50, 50),
	(88, 30, 8, 50, 50),
	(89, 30, 9, 50, 50),
	(90, 30, 10, 50, 50),
	(91, 31, 1, 150, 150),
	(92, 31, 2, 100, 100),
	(93, 31, 3, 100, 100),
	(94, 31, 4, 90, 90),
	(95, 31, 5, 50, 50),
	(96, 31, 6, 50, 50),
	(97, 31, 7, 50, 50),
	(98, 31, 8, 50, 50),
	(99, 31, 9, 50, 50),
	(100, 31, 10, 50, 50),
	(101, 32, 1, 260, 260),
	(102, 32, 2, 140, 140),
	(103, 32, 3, 150, 150),
	(104, 32, 4, 130, 130),
	(105, 32, 5, 50, 50),
	(106, 32, 6, 50, 50),
	(107, 32, 7, 50, 50),
	(108, 32, 8, 50, 50),
	(109, 32, 9, 50, 50),
	(110, 32, 10, 50, 50),
	(111, 33, 1, 260, 260),
	(112, 33, 2, 140, 140),
	(113, 33, 3, 150, 150),
	(114, 33, 4, 130, 130),
	(115, 33, 5, 50, 50),
	(116, 33, 6, 50, 50),
	(117, 33, 7, 50, 50),
	(118, 33, 8, 50, 50),
	(119, 33, 9, 50, 50),
	(120, 33, 10, 50, 50),
	(121, 34, 1, 420, 420),
	(122, 34, 2, 180, 180),
	(123, 34, 3, 210, 210),
	(124, 34, 4, 180, 180),
	(125, 34, 5, 50, 50),
	(126, 34, 6, 50, 50),
	(127, 34, 7, 50, 50),
	(128, 34, 8, 50, 50),
	(129, 34, 9, 50, 50),
	(130, 34, 10, 50, 50),
	(131, 35, 1, 420, 420),
	(132, 35, 2, 180, 180),
	(133, 35, 3, 210, 210),
	(134, 35, 4, 180, 180),
	(135, 35, 5, 50, 50),
	(136, 35, 6, 50, 50),
	(137, 35, 7, 50, 50),
	(138, 35, 8, 50, 50),
	(139, 35, 9, 50, 50),
	(140, 35, 10, 50, 50),
	(141, 36, 1, 800, 800),
	(142, 36, 2, 250, 250),
	(143, 36, 3, 300, 300),
	(144, 36, 4, 260, 260),
	(145, 36, 5, 70, 70),
	(146, 36, 6, 50, 50),
	(147, 36, 7, 80, 80),
	(148, 36, 8, 50, 50),
	(149, 36, 9, 50, 50),
	(150, 36, 10, 50, 50),
	(151, 37, 1, 800, 800),
	(152, 37, 2, 250, 250),
	(153, 37, 3, 300, 300),
	(154, 37, 4, 260, 260),
	(155, 37, 5, 70, 70),
	(156, 37, 6, 50, 50),
	(157, 37, 7, 80, 80),
	(158, 37, 8, 50, 50),
	(159, 37, 9, 50, 50),
	(160, 37, 10, 50, 50);

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
	(1, 1, 41, 1520, 1424, 'down'),
	(1001, 1001, 41, 100, 100, 'down'),
	(1002, 1002, 41, 200, 200, 'down'),
	(1003, 1003, 41, 300, 300, 'down');

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
	(1001, 1001, 41, 'Test message for list validation', NULL, 1, '2025-01-01 10:00:00'),
	(1002, 1002, 41, 'Test message for edit validation', NULL, 1, '2025-01-01 11:00:00'),
	(1003, 1003, 41, 'Test message for delete validation', NULL, 1, '2025-01-01 12:00:00');

-- Respawn test data (requires object_id FK)
REPLACE INTO `respawn` (`id`, `object_id`, `respawn_time`, `instances_limit`, `layer`) VALUES
	(3, 6, 20000, 12, 'merge-respawn-area-monsters'),
	(4, 7, 10000, 18, 'merge-respawn-area-monsters'),
	(5, 14, 20000, 100, 'ground-respawn-area'),
	(6, 15, 10000, 200, 'ground-respawn-area'),
	(7, 16, 30000, 10, 'merge-respawn-area-mining-rocks'),
	(8, 28, 20000, 12, 'merge-respawn-area-monsters'),
	(9, 29, 10000, 18, 'merge-respawn-area-monsters'),
	(10, 30, 20000, 12, 'merge-respawn-area-monsters'),
	(11, 31, 10000, 18, 'merge-respawn-area-monsters'),
	(12, 32, 20000, 12, 'merge-respawn-area-monsters'),
	(13, 33, 10000, 18, 'merge-respawn-area-monsters'),
	(14, 34, 20000, 12, 'merge-respawn-area-monsters'),
	(15, 35, 10000, 18, 'merge-respawn-area-monsters'),
	(16, 36, 20000, 12, 'merge-respawn-area-monsters'),
	(17, 37, 10000, 18, 'merge-respawn-area-monsters'),
    (1001, 1001, 5000, 5, 'test-layer'),
    (1002, 1002, 6000, 6, 'test-layer'),
    (1003, 1003, 7000, 7, 'test-layer');

-- Rewards test data (requires object_id and item_id FK)
REPLACE INTO `rewards` (`id`, `object_id`, `item_id`, `modifier_id`, `experience`, `drop_rate`, `drop_quantity`, `is_unique`, `was_given`, `has_drop_body`) VALUES
	(3, 6, 2, NULL, 10, 100, 3, 0, 0, 1),
	(4, 7, 2, NULL, 10, 100, 1, 0, 0, 1),
	(5, 14, 2, NULL, 10, 100, 3, 0, 0, 1),
	(6, 15, 2, NULL, 10, 100, 1, 0, 0, 1),
	(7, 28, 2, NULL, 15, 100, 3, 0, 0, 1),
	(8, 29, 2, NULL, 15, 100, 1, 0, 0, 1),
	(9, 30, 2, NULL, 20, 100, 3, 0, 0, 1),
	(10, 31, 2, NULL, 20, 100, 1, 0, 0, 1),
	(11, 32, 2, NULL, 35, 100, 3, 0, 0, 1),
	(12, 33, 2, NULL, 35, 100, 1, 0, 0, 1),
	(13, 34, 2, NULL, 60, 100, 3, 0, 0, 1),
	(14, 35, 2, NULL, 60, 100, 1, 0, 0, 1),
	(15, 36, 2, NULL, 90, 100, 3, 0, 0, 1),
	(16, 37, 2, NULL, 90, 100, 1, 0, 0, 1),
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

REPLACE INTO `skills_skill` (`id`, `key`, `type`, `label`, `autoValidation`, `skillDelay`, `castTime`, `usesLimit`, `range`, `rangeAutomaticValidation`, `rangePropertyX`, `rangePropertyY`, `rangeTargetPropertyX`, `rangeTargetPropertyY`, `allowSelfTarget`, `criticalChance`, `criticalMultiplier`, `criticalFixedValue`, `customData`) VALUES
	(1, 'attackBullet', '4', NULL, 0, 1000, 0, 0, 250, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(2, 'attackShort', '2', NULL, 0, 600, 0, 0, 50, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(3, 'fireball', '4', NULL, 0, 5000, 2000, 0, 280, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(4, 'heal', '3', NULL, 0, 5000, 2000, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 1, 0, 1, 0, NULL),
	(5, 'forestStrikeLevel3', '2', 'Forest Strike - Level 3', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(6, 'forestStrikeLevel4', '2', 'Forest Strike - Level 4', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(7, 'forestStrikeLevel5', '2', 'Forest Strike - Level 5', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 12, 2, 0, NULL),
	(8, 'forestStrikeLevel6', '2', 'Forest Strike - Level 6', 0, 900, 0, 0, 60, 1, 'state/x', 'state/y', NULL, NULL, 0, 15, 2, 0, NULL),
	(1001, 'testSkillAttackMain', '2', NULL, 0, 1000, 0, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(1002, 'testSkillAttackDelete', '2', NULL, 0, 1000, 0, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL),
	(1003, 'testSkillAttackEditFail', '2', NULL, 0, 1000, 0, 0, 100, 1, 'state/x', 'state/y', NULL, NULL, 0, 10, 2, 0, NULL);

REPLACE INTO `skills_skill_animations` (`id`, `skill_id`, `key`, `classKey`, `animationData`) VALUES
	(1, 3, 'bullet', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_bullet","frameWidth":64,"frameHeight":64,"start":0,"end":3,"repeat":-1,"frameRate":1,"dir":3}'),
	(2, 3, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"fireball_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000,"depthByPlayer":"above"}'),
	(3, 4, 'cast', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_cast","frameWidth":64,"frameHeight":70,"start":0,"end":3,"repeat":-1,"destroyTime":2000}'),
	(4, 4, 'hit', NULL, '{"enabled":true,"type":"spritesheet","img":"heal_hit","frameWidth":64,"frameHeight":70,"start":0,"end":4,"repeat":0,"depthByPlayer":"above"}');

REPLACE INTO `skills_skill_attack` (`id`, `skill_id`, `affectedProperty`, `allowEffectBelowZero`, `hitDamage`, `applyDirectDamage`, `attackProperties`, `defenseProperties`, `aimProperties`, `dodgeProperties`, `dodgeFullEnabled`, `dodgeOverAimSuccess`, `damageAffected`, `criticalAffected`) VALUES
	(1, 1, 'stats/hp', 0, 3, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(2, 2, 'stats/hp', 0, 5, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(3, 3, 'stats/hp', 0, 7, 0, 'stats/mgk-atk,stats/speed', 'stats/mgk-def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(4, 5, 'stats/hp', 0, 9, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(5, 6, 'stats/hp', 0, 14, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(6, 7, 'stats/hp', 0, 20, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0),
	(7, 8, 'stats/hp', 0, 30, 0, 'stats/atk,stats/speed', 'stats/def,stats/speed', 'stats/aim', 'stats/dodge', 0, 1, 0, 0);

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

-- Dumping structure for table scenes
CREATE TABLE IF NOT EXISTS `scenes` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `name` varchar(255) NOT NULL,
    `scene_map` varchar(255) NOT NULL COMMENT 'The map JSON file name.',
    `image` varchar(255) NOT NULL,
    `collisions` json DEFAULT NULL COMMENT 'Collisions in JSON format.',
    `layers` json DEFAULT NULL COMMENT 'Layers data in JSON format.',
    `return_positions` json DEFAULT NULL COMMENT 'Return positions in JSON format.',
    PRIMARY KEY (`id`),
    UNIQUE KEY `key` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=latin1;

-- Dumping data for table scenes: ~3 rows (approximately)
INSERT INTO `scenes` (`id`, `name`, `scene_map`, `image`, `collisions`, `layers`, `return_positions`) VALUES
(1, 'Town', 'town', 'town', '[{"A": 0, "B": 1021, "C": "btw", "L": 6}, {"A": 105, "B": 110, "C": "btw", "L": 7}, {"A": 125, "B": 130, "C": "btw", "L": 7}, {"A": 145, "B": 150, "C": "btw", "L": 7}, {"A": 165, "B": 170, "C": "btw", "L": 7}, {"A": 207, "B": 207, "C": "btw", "L": 7}, {"A": 226, "B": 228, "C": "btw", "L": 7}, {"A": 245, "B": 249, "C": "btw", "L": 7}, {"A": 264, "B": 270, "C": "btw", "L": 7}, {"A": 284, "B": 290, "C": "btw", "L": 7}, {"A": 304, "B": 310, "C": "btw", "L": 7}, {"A": 324, "B": 330, "C": "btw", "L": 7}, {"A": 344, "B": 350, "C": "btw", "L": 7}, {"A": 1661, "B": 1663, "C": "btw", "L": 7}, {"A": 5, "B": 25, "C": "btw", "L": 8}, {"A": 213, "B": 215, "C": "btw", "L": 9}, {"A": 233, "B": 256, "C": "btw", "L": 9}, {"A": 273, "B": 296, "C": "btw", "L": 9}]', '{"main": 7, "collider": [6, 8, 9], "change_points": [{"i": 167, "n": "House_1"}, {"i": 168, "n": "House_1"}, {"i": 367, "n": "House_2"}]}', '[{"D": "down", "P": "House_1", "X": 224, "Y": 280, "De": 1}, {"D": "down", "P": "House_2", "X": 657, "Y": 494}]'),
(2, 'House_1', 'house-1', 'house', '[{"A": 0, "B": 100, "C": "btw", "L": 1}, {"A": [-1, 67, 68, 69], "C": "exc", "L": 2}]', '{"main": 1, "collider": [2, 3], "animations": [2], "change_points": [{"i": 2684354609, "n": "Town"}]}', '[{"D": "up", "X": 256, "Y": 352, "De": 1}]'),
(3, 'House_2', 'house-2', 'house', '[{"A": [-1], "C": "exc", "L": 1}, {"A": [-1, 117, 118, 146, 147], "C": "exc", "L": 2}]', '{"main": 1, "collider": [2], "animations": [2], "change_points": [{"i": 2684354609, "n": "Town"}]}', '[{"D": "up", "X": 256, "Y": 384, "De": 1}]');

-- Dumping structure for table users
CREATE TABLE IF NOT EXISTS `users` (
    `id` int(10) unsigned NOT NULL AUTO_INCREMENT,
    `email` varchar(255) NOT NULL,
    `username` varchar(255) NOT NULL,
    `password` varchar(255) NOT NULL,
    `role_id` int(10) unsigned NOT NULL,
    `status` int(10) unsigned NOT NULL,
    `state` text,
    PRIMARY KEY (`id`),
    UNIQUE KEY `email` (`email`),
    UNIQUE KEY `username` (`username`)
) ENGINE=InnoDB AUTO_INCREMENT=32 DEFAULT CHARSET=latin1;

-- Dumping data for table users: ~3 rows (approximately)
INSERT INTO `users` (`id`, `email`, `username`, `password`, `role_id`, `status`, `state`) VALUES
(29, 'dap@dap.com', 'dap', '$2b$10$PQIYGBFyA/69DaowJVTA5ufVWmIUeIOwIK4e6JCAP5Uen0sp0TAHu', 1, 1, '{"scene":"Town","x":"224.00","y":"280.00","dir":"down"}'),
(30, 'dap2@dap.com', 'dap2', '$2b$10$Kvjh1XdsMai8Xt2wdivG2.prYvTiW6vJrdnrNPYZenf8qCRLhuZ/a', 1, 1, '{"scene":"Town","x":"525.79","y":"436.47","dir":"down"}'),
(31, 'dap3@dap.com', 'dap3', '$2b$10$CmtWkhIexIVtcBjwsmEkeOlIhqizViykDFYAKtVrl4sF8KWLuBsxO', 1, 1, '{"scene":"Town","x":"224.00","y":"280.00","dir":"down"}');

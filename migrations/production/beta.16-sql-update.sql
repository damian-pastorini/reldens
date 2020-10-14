
# Fix config:

UPDATE `config` SET `path`='rooms/world/onlyWalkable' WHERE `path`='rooms/world/onlyWalkeable';

# Feature pack:

INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('actions', 'Actions', '1');

# stats:
ALTER TABLE `players_stats` ADD COLUMN `aim` INT(10) UNSIGNED NOT NULL AFTER `dodge`;
UPDATE players_stats SET aim = 100;
INSERT INTO `reldens`.`config` (`scope`, `path`, `value`, `type`) VALUES ('server', 'players/initialStats/aim', '100', 'i');

# class path:
INSERT INTO skills_owners_class_path (class_path_id, owner_id, currentLevel, currentExp)
    SELECT 1 AS class_path_id, id AS owner_id, 1 AS currentLevel, 0 AS currentExp
    FROM players;
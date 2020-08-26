
# Fix config:

UPDATE `config` SET `path`='rooms/world/onlyWalkable' WHERE `path`='rooms/world/onlyWalkeable';

# Feature pack:

INSERT INTO `features` (`code`, `title`, `is_enabled`) VALUES ('actions', 'Actions', '1');

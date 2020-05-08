
# config values:

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'inventory/position/x', '400', 'i');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'inventory/position/y', '450', 'i');

UPDATE `config` SET `value`='80' WHERE  `path`='objects/actions/interactionsDistance';

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################
# Config:

INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/tabTarget', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/disableContextMenu', '1', 'b');
INSERT INTO `config` (`scope`, `path`, `value`, `type`) VALUES ('client', 'ui/controls/primaryMove', '1', 'b');

#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 1;

#######################################################################################################################

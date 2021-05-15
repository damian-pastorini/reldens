#######################################################################################################################

SET FOREIGN_KEY_CHECKS = 0;

#######################################################################################################################

# Config:

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/left/start', 3, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/left/end', 5, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/right/start', 6, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/right/end', 8, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/up/start', 9, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/up/end', 11, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/down/start', 0, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'players/animations/defaultFrames/down/end', 2, 'i');

## -------------------------------------------------------------------------------------------------------------------

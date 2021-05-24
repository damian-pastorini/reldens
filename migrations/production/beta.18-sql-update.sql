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

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/enabled', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/mapWidthDivisor', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/mapHeightDivisor', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/fixedWidth', 450, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/fixedHeight', 450, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/roundMap', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camX', 140, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camY', 10, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camBackgroundColor', 'rgba(0,0,0,0.6)', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/camZoom', '0.35', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/roundMap', 1, 'b');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/addCircle', 1, 'b');

INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleX', 220, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleY', 88, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleRadio', 80.35, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleColor', 'rgb(0,0,0)', 't');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleAlpha', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleStrokeLineWidth', 6, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleStrokeColor', 0, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleStrokeAlpha', '0.6', 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleFillColor', 1, 'i');
INSERT INTO `config` (`id`, `scope`, `path`, `value`, `type`) VALUES (NULL, 'client', 'ui/minimap/circleFillAlpha', 0, 'i');

## -------------------------------------------------------------------------------------------------------------------

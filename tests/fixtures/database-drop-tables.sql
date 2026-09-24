--
-- Reldens - Tests database drop tables
--
-- Drops every table of the tests database so the install, basic config and sample data scripts rebuild the same
-- schema and data before every tests run.
--

SET FOREIGN_KEY_CHECKS = 0;
SET SESSION group_concat_max_len = 1048576;

SET @dropTableNames = (
    SELECT GROUP_CONCAT(CONCAT('`', `TABLE_NAME`, '`'))
    FROM `information_schema`.`TABLES`
    WHERE `TABLE_SCHEMA` = DATABASE()
);
SET @dropTablesStatement = IF(@dropTableNames IS NULL, 'SELECT 1', CONCAT('DROP TABLE IF EXISTS ', @dropTableNames));
PREPARE dropTables FROM @dropTablesStatement;
EXECUTE dropTables;
DEALLOCATE PREPARE dropTables;

SET FOREIGN_KEY_CHECKS = 1;

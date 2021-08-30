/**
 *
 * Reldens - Data Types
 *
 */

const NUMBER = [
    // PrimaryGeneratedColumnType:
    'int',
    'int2',
    'int4',
    'int8',
    'integer',
    'tinyint',
    'smallint',
    'mediumint',
    'bigint',
    'dec',
    'decimal',
    'fixed',
    'numeric',
    'number',
    // WithWidthColumnType:
    'tinyint',
    'smallint',
    'mediumint',
    'int',
    'bigint',
    // SimpleColumnType:
    'int2',
    'integer',
    'int4',
    'int8',
    'int64',
    'unsigned big int',
    'float4',
    'float8',
];

const STRING = [
    // SpatialColumnType:
    'geometry',
    'geography',
    // WithPrecisionColumnType:
    'float',
    'double',
    'dec',
    'decimal',
    'fixed',
    'numeric',
    'real',
    'double precision',
    'number',
    // WithLengthColumnType:
    'character varying',
    'varying character',
    'char varying',
    'nvarchar',
    'national varchar',
    'character',
    'native character',
    'varchar',
    'char',
    'nchar',
    'national char',
    'varchar2',
    'nvarchar2',
    'raw',
    'binary',
    'varbinary',
    'string',
    // SimpleColumnType:
    'simple-enum',
    'smallmoney',
    'money',
    'tinyblob',
    'tinytext',
    'mediumblob',
    'mediumtext',
    'blob',
    'text',
    'ntext',
    'citext',
    'hstore',
    'longblob',
    'longtext',
    'bytes',
    'bytea',
    'long',
    'raw',
    'long raw',
    'bfile',
    'clob',
    'nclob',
    'image',
    'timetz',
    'timestamptz',
    'interval year to month',
    'interval day to second',
    'interval',
    'year',
    'point',
    'line',
    'lseg',
    'box',
    'circle',
    'path',
    'polygon',
    'geography',
    'geometry',
    'linestring',
    'multipoint',
    'multilinestring',
    'multipolygon',
    'geometrycollection',
    'int4range',
    'int8range',
    'numrange',
    'tsrange',
    'tstzrange',
    'daterange',
    'enum',
    'set',
    'cidr',
    'inet',
    'macaddr',
    'tsvector',
    'tsquery',
    'uuid',
    'xml',
    'varbinary',
    'hierarchyid',
    'sql_variant',
    'rowid',
    'urowid',
    'uniqueidentifier',
    'rowversion',
    'cube',
];

const DATE = [
    // WithPrecisionColumnType:
    'datetime',
    'datetime2',
    'datetimeoffset',
    'time',
    'time with time zone',
    'time without time zone',
    'timestamp',
    'timestamp without time zone',
    'timestamp with time zone',
    'timestamp with local time zone',
    'timestamptz',
    // SimpleColumnType:
    'timestamp with local time zone',
    'smalldatetime',
    'date',
];

const BOOLEAN = [
    // SimpleColumnType:
    'bit',
    'bool',
    'boolean',
    'bit varying',
    'varbit',
];

const OBJECT = [
    // SimpleColumnType:
    'simple-json',
    'json',
    'jsonb',
];

const DATA_TYPES = {};

function extend(types, dataType)
{
    for(const t of types){
        DATA_TYPES[t] = dataType;
    }
}

extend(NUMBER, 'number');
extend(STRING, 'string');
extend(DATE, 'datetime');
extend(BOOLEAN, 'boolean');
extend(OBJECT, 'mixed');

module.exports.DATA_TYPES = DATA_TYPES;

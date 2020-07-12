module.exports = {
    development: {
        client: 'mysql',
        connection: {
            host: 'localhost',
            database: 'reldens_test',
            user: 'reldens',
            password: 'reldens',
            multipleStatements: true
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './node_modules/reldens/migrations/development',
            tableName: 'knex_migrations'
        }
    },
    production: {
        client: 'mysql',
        connection: {
            host: 'localhost',
            database: 'reldens',
            user: 'reldens',
            password: 'reldens',
            multipleStatements: true
        },
        pool: {
            min: 2,
            max: 10
        },
        migrations: {
            directory: './node_modules/reldens/migrations/production',
            tableName: 'knex_migrations'
        }
    }
};

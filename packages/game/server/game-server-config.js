
module.exports.GameServerConfig = {
    port: Number(process.env.PORT) || Number(process.env.RELDENS_APP_PORT) || 8080,
    host: process.env.RELDENS_APP_HOST || 'http://localhost',
    monitor: {
        enabled: process.env.RELDENS_MONITOR || false,
        auth: process.env.RELDENS_MONITOR_AUTH || false,
        user: process.env.RELDENS_MONITOR_USER,
        pass: process.env.RELDENS_MONITOR_PASS,
    }
};

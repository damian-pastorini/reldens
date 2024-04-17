/**
 *
 * Reldens - AppServerFactory
 *
 */

const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const express = require('express');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const TemplateEngine = require('mustache');
const { Logger, sc } = require('@reldens/utils');
const { GameConst } = require('../constants');

class AppServerFactory
{

    constructor()
    {
        this.encoding = process.env.RELDENS_DEFAULT_ENCODING || 'utf8';
    }


    createAppServer()
    {
        // @TODO - BETA - Generally improve server factory.
        let appServer = false;
        let app = express();
        app.use(cors());
        app.use(express.json());
        // if https is not running then by default we will run on http:
        appServer = 1 === Number(process.env.RELDENS_EXPRESS_USE_HTTPS || 0)
            ? this.createHttpsServer(appServer, app)
            : http.createServer(app);
        return {app, appServer, express};
    }

    createHttpsServer(appServer, app)
    {
        let credentials = {
            key: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY, this.encoding),
            cert: fs.readFileSync(process.env.RELDENS_EXPRESS_HTTPS_CERT, this.encoding)
        };
        let httpsChain = (process.env.RELDENS_EXPRESS_HTTPS_CHAIN || '').toString();
        if('' !== httpsChain){
            credentials['ca'] = fs.readFileSync(httpsChain, this.encoding);
        }
        credentials['passphrase'] = (process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE || '').toString();
        return https.createServer(credentials, app);
    }

    enableServeHome(app, distPath)
    {
        let limiter = rateLimit({
            // default 60000 = 1 minute:
            windowMs: Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MS || 60000),
            // limit each IP to 30 requests per windowMs:
            max: Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS || 30),
        });
        app.post('/', limiter);
        app.get('/', limiter);
        app.get('/', (req, res, next) => {
            if('/' === req._parsedUrl.pathname){
                let languageParam = (req.query.lang || '').toString();
                if('' !== languageParam){
                    if(!sc.isValidIsoCode(languageParam)){
                        Logger.error('Invalid selected language ISO code.');
                        languageParam = '';
                    }
                    Logger.info('Selected language: '+languageParam);
                }
                let indexPath = path.join(distPath, languageParam+'-'+GameConst.STRUCTURE.INDEX);
                let defaultIndexPath = path.join(distPath, GameConst.STRUCTURE.INDEX);
                let filePath = '' !== languageParam && fs.existsSync(indexPath) ? indexPath : defaultIndexPath;
                Logger.info('Loading index: '+filePath);
                // @TODO - BETA - Move the rendering process outside this AppServerFactory.
                let html = fs.readFileSync(filePath, this.encoding);
                // @TODO - BETA - Make the index render with variables coming from the server manager and configuration.
                return res.send(TemplateEngine.render(html, {}));
            }
            next();
        });
    }

    enableServeStatics(app, distPath)
    {
        app.use(express.static(distPath));
    }

}

module.exports.AppServerFactory = new AppServerFactory();

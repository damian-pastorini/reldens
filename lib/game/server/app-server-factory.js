/**
 *
 * Reldens - AppServerFactory
 *
 */

const { FileHandler } = require('./file-handler');
const { HomepageLoader } = require('./homepage-loader');
const http = require('http');
const https = require('https');
const express = require('express');
const bodyParser = require('body-parser');
const session = require('express-session');
const rateLimit = require('express-rate-limit');
const cors = require('cors');
const multer = require('multer');
const { Logger } = require('@reldens/utils');

class AppServerFactory
{

    constructor()
    {
        this.applicationFramework = express;
        this.bodyParser = bodyParser;
        this.session = session;
        this.fileStorageManager = multer;
        this.appServer = false;
        this.app = express();
        this.encoding = (process.env.RELDENS_DEFAULT_ENCODING || 'utf-8').toString();
        this.useHttps = 1 === Number(process.env.RELDENS_EXPRESS_USE_HTTPS || 0);
        this.passphrase = (process.env.RELDENS_EXPRESS_HTTPS_PASSPHRASE || '').toString();
        this.httpsChain = (process.env.RELDENS_EXPRESS_HTTPS_CHAIN || '').toString();
        this.keyPath = (process.env.RELDENS_EXPRESS_HTTPS_PRIVATE_KEY || '').toString();
        this.certPath = (process.env.RELDENS_EXPRESS_HTTPS_CERT || '').toString();
        this.windowMs = Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MS || 60000);
        this.maxRequests = Number(process.env.RELDENS_EXPRESS_RATE_LIMIT_MAX_REQUESTS || 30);
    }

    createAppServer()
    {
        this.app.use(cors());
        this.app.use(express.json());
        this.app.use(bodyParser.urlencoded({extended: true}));
        this.appServer = this.createServer();
        // @TODO - BETA - Rename the class and use it as wrapper for the server and the associated services.
        return {app: this.app, appServer: this.appServer, express};
    }

    createServer()
    {
        if(!this.useHttps){
            return http.createServer(this.app);
        }
        let key = FileHandler.readFile(this.keyPath);
        if(!key){
            Logger.error('Key file not found: ' + this.keyPath);
            return false;
        }
        let cert = FileHandler.readFile(this.certPath);
        if(!cert){
            Logger.error('Cert file not found: ' + this.certPath);
            return false;
        }
        let credentials = {
            key: key.toString(),
            cert: cert.toString(),
            passphrase: this.passphrase
        };
        if('' !== this.httpsChain){
            let ca = FileHandler.readFile(this.httpsChain);
            if(ca){
                credentials.ca = ca;
            }
        }
        return https.createServer(credentials, this.app);
    }

    enableServeHome(app, distPath, initialConfiguration)
    {
        let limiter = rateLimit({
            // default 60000 = 1 minute:
            windowMs: this.windowMs,
            // limit each IP to 30 requests per windowMs:
            max: this.maxRequests,
        });
        app.post('/', limiter);
        app.get('/', limiter);
        app.get('/', async (req, res, next) => {
            if('/' === req._parsedUrl.pathname){
                return res.send(await HomepageLoader.loadContents(req.query?.lang, distPath, initialConfiguration));
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

/**
 *
 * Reldens - Base Test
 *
 */

const assert = require('assert');
const http = require('http');
const https = require('https');
const querystring = require('querystring');
const { FileHandler } = require('@reldens/server-utils');
const { Logger } = require('@reldens/utils');

class BaseTest
{

    constructor(config)
    {
        this.assert = assert;
        this.testCount = 0;
        this.passedCount = 0;
        this.config = config;
        this.breakOnError = config.breakOnError || false;
        this.baseUrl = config.baseUrl;
        this.adminPath = config.adminPath;
        this.adminUser = config.adminUser;
        this.adminPassword = config.adminPassword;
        let parsedUrl = new URL(this.baseUrl);
        this.hostname = parsedUrl.hostname;
        this.port = parsedUrl.port || ('https:' === parsedUrl.protocol ? 443 : 80);
        this.isHttps = 'https:' === parsedUrl.protocol;
    }

    async test(name, fn)
    {
        this.testCount++;
        try {
            await fn();
            Logger.log(100, '', '✓ PASS: '+name);
            this.passedCount++;
        } catch(error){
            Logger.log(100, '', '✗ FAIL: '+name);
            Logger.log(100, '', 'Error: '+error.message);
            if(this.breakOnError){
                throw error;
            }
        }
    }

    async _makeHttpRequest(options, data)
    {
        return new Promise((resolve, reject) => {
            let httpModule = this.isHttps ? https : http;
            let req = httpModule.request(options, (res) => {
                let body = '';
                res.on('data', (chunk) => body += chunk);
                res.on('end', () => {
                    resolve({
                        statusCode: res.statusCode,
                        headers: res.headers,
                        body: body
                    });
                });
            });
            req.on('error', (error) => {
                reject(error);
            });
            req.on('timeout', () => {
                req.destroy();
                reject(new Error('Request timeout'));
            });
            if(data){
                req.write(data);
            }
            req.end();
        });
    }

    async makeRequest(method, path, data)
    {
        let options = {
            hostname: this.hostname,
            port: this.port,
            path: path,
            method: method,
            headers: {'Content-Type': 'application/json'},
            timeout: 10000
        };
        let requestData = data ? JSON.stringify(data) : null;
        return await this._makeHttpRequest(options, requestData);
    }

    async makeAuthenticatedRequest(method, path, data, session)
    {
        let cookieHeader = this.formatCookies(session);
        let options = {
            hostname: this.hostname,
            port: this.port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json',
                'Cookie': cookieHeader
            },
            timeout: 10000
        };
        let requestData = data ? JSON.stringify(data) : null;
        return await this._makeHttpRequest(options, requestData);
    }

    async makeFormRequest(method, path, data, session)
    {
        let postData = querystring.stringify(data);
        let headers = {
            'Content-Type': 'application/x-www-form-urlencoded',
            'Content-Length': postData.length
        };
        if(session){
            headers['Cookie'] = this.formatCookies(session);
        }
        let options = {
            hostname: this.hostname,
            port: this.port,
            path: path,
            method: method,
            headers: headers,
            timeout: 10000
        };
        return await this._makeHttpRequest(options, postData);
    }

    async makeMultipartRequest(method, path, data, session)
    {
        let boundary = 'WebKitFormBoundary' + Math.random().toString(36).substring(2, 18);
        let postData = this.buildMultipartData(data, boundary);
        let headers = {
            'Content-Type': 'multipart/form-data; boundary=----' + boundary,
            'Content-Length': postData.length
        };
        if(session){
            headers['Cookie'] = this.formatCookies(session);
        }
        let options = {
            hostname: this.hostname,
            port: this.port,
            path: path,
            method: method,
            headers: headers,
            timeout: 10000
        };
        return await this._makeHttpRequest(options, postData);
    }

    async makeFormRequestWithTimeout(method, path, data, session, timeoutMs)
    {
        let cookieHeader = this.formatCookies(session);
        let postData = this.formatFormData(data);
        let options = {
            hostname: this.hostname,
            port: this.port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'Content-Length': postData.length,
                'Cookie': cookieHeader
            },
            timeout: timeoutMs || 15000
        };
        return await this._makeHttpRequest(options, postData);
    }

    formatCookies(sessionCookies)
    {
        if(!sessionCookies){
            return '';
        }
        if('string' === typeof sessionCookies){
            return sessionCookies;
        }
        if(Array.isArray(sessionCookies)){
            return sessionCookies.map(cookie => cookie.split(';')[0]).join('; ');
        }
        return '';
    }

    formatFormData(data)
    {
        let formData = '';
        for(let key of Object.keys(data)){
            formData += encodeURIComponent(key)+'='+encodeURIComponent(data[key])+'&';
        }
        return formData.slice(0, -1);
    }

    buildMultipartData(data, boundary)
    {
        let postData = Buffer.alloc(0);
        for(let key of Object.keys(data)){
            let value = data[key];
            postData = Buffer.concat([postData, Buffer.from('------'+boundary+'\r\n')]);
            if(value && 'object' === typeof value && value.filename && value.filePath){
                if(!FileHandler.exists(value.filePath)){
                    throw new Error('Test file not found: '+value.filePath);
                }
                let fileContent = FileHandler.readFile(value.filePath);
                if('string' === typeof fileContent){
                    fileContent = Buffer.from(fileContent, 'binary');
                }
                let headers = 'Content-Disposition: form-data; name="'+key+'"; filename="'+value.filename
                    +'"\r\nContent-Type: '+value.contentType+'\r\n\r\n';
                postData = Buffer.concat([
                    postData,
                    Buffer.from(headers),
                    Buffer.from(fileContent),
                    Buffer.from('\r\n')
                ]);
                continue;
            }
            let headers = 'Content-Disposition: form-data; name="'+key+'"\r\n\r\n';
            postData = Buffer.concat([postData, Buffer.from(headers), Buffer.from(String(value)), Buffer.from('\r\n')]);
        }
        return Buffer.concat([postData, Buffer.from('------'+boundary+'--\r\n')]);
    }

    entityHasUploadFields(entity, data)
    {
        return this.getUploadFields(data).length > 0;
    }

    getUploadFields(data)
    {
        if(!data){
            return [];
        }
        let uploadFields = [];
        for(let key of Object.keys(data)){
            let value = data[key];
            if(value && 'object' === typeof value && value.filename && value.content){
                uploadFields.push(key);
            }
        }
        return uploadFields;
    }

    async getAuthenticatedSession()
    {
        try {
            let loginResponse = await this.makeRequest('GET', this.adminPath+'/login');
            if(200 !== loginResponse.statusCode){
                throw new Error('Login page not accessible');
            }
            let response = await this.makeFormRequest('POST', this.adminPath+'/login', {
                email: this.adminUser,
                password: this.adminPassword
            });
            if(302 !== response.statusCode){
                throw new Error('Login failed with status: '+response.statusCode);
            }
            if(!response.headers.location){
                throw new Error('Login response missing location header');
            }
            if(response.headers.location.includes('error')){
                throw new Error('Login failed with error in redirect');
            }
            return response.headers['set-cookie'];
        } catch(error){
            Logger.log(100, '', 'Authentication failed: '+error.message);
            throw error;
        }
    }

}

module.exports.BaseTest = BaseTest;

/**
 *
 * Reldens - index
 *
 * Server initialization file and environment variables loader.
 *
 */

// set environment variables:
const dotenv = require('dotenv');
dotenv.config();

// server app:
module.exports = require('./src/server/index');

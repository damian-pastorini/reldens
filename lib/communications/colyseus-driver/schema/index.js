/**
 *
 * Reldens - ColyseusDriver / Schema entry point
 *
 * Flat entry point for the five schema primitives. Reldens code that needs
 * Schema/MapSchema/ArraySchema/type/defineTypes requires from here, destructured.
 *
 */

const { Schema } = require('./schema');
const { MapSchema } = require('./map-schema');
const { ArraySchema } = require('./array-schema');
const { type } = require('./type');
const { defineTypes } = require('./define-types');

module.exports.Schema = Schema;
module.exports.MapSchema = MapSchema;
module.exports.ArraySchema = ArraySchema;
module.exports.type = type;
module.exports.defineTypes = defineTypes;

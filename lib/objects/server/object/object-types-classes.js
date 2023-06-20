/**
 *
 * Reldens - ObjectTypesClasses
 *
 */

const { BaseObject } = require('./type/base-object');
const { AnimationObject } = require('./type/animation-object');
const { NpcObject } = require('./type/npc-object');
const { EnemyObject } = require('./type/enemy-object');
const { TraderObject } = require('./type/trader-object');
const { DropObject } = require('./type/drop-object');
const { MultipleObject } = require('./type/multiple-object');
const { ObjectTypes } = require('./object-types');

module.exports.ObjectTypesClasses = {
    [ObjectTypes.BASE]: BaseObject,
    [ObjectTypes.ANIMATION]: AnimationObject,
    [ObjectTypes.NPC]: NpcObject,
    [ObjectTypes.ENEMY]: EnemyObject,
    [ObjectTypes.TRADER]: TraderObject,
    [ObjectTypes.DROP]: DropObject,
    [ObjectTypes.MULTIPLE]: MultipleObject
};

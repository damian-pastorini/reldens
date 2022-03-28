/**
 *
 * Reldens - DriverProperty
 *
 */

const { BaseProperty } = require('adminjs');

class DriverProperty extends BaseProperty
{

    constructor(entityProperty)
    {
        super(entityProperty);
        this.column = entityProperty;
    }

    position()
    {
        return this.column.position || 0;
    }

    type()
    {
        return this.column.type || 'string';
    }

    isEditable()
    {
        return this.column.isEditable || false;
    }

    isId()
    {
        return this.column.path.indexOf('id') !== -1;
    }

    isSortable()
    {
        return this.column.isSortable || true;
    }

    isTitle()
    {
        return this.column.isTitle || false;
    }

    isVisible()
    {
        return this.column.isVisible || false;
    }

    hideLabel()
    {
        return this.column.hideLabel || false;
    }

    isDisabled()
    {
        return this.column.isDisabled || false;
    }

    isRequired()
    {
        return this.column.isRequired || false;
    }

    isVirtual()
    {
        return this.column.isVirtual || false;
    }

}

module.exports.DriverProperty = DriverProperty;

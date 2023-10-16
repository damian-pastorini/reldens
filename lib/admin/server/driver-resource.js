/**
 *
 * Reldens - DriverResource
 *
 */

const { BaseResource, BaseRecord } = require('adminjs').default;
const { DriverProperty } = require('./driver-property');
const { ErrorManager, Logger, sc } = require('@reldens/utils');

class DriverResource extends BaseResource
{

    constructor(model, config)
    {
        super(model);
        this.rawConfig = config;
        this.model = model;
        this.label = model.name();
        this.idProperty = false;
        this.propertiesObject = this.prepareProperties(config);
        this.callbacks = sc.get(config, 'callbacks', {});
    }

    prepareProperties(config)
    {
        let properties = {};
        if(!config || !config.properties){
            return properties;
        }
        let hasTitle = false;
        for(let i of Object.keys(config.properties)){
            let rawProp = config.properties[i];
            let isId = Boolean(sc.get(rawProp, 'isId', (i === 'id')));
            let isTitle = sc.get(rawProp, 'isTitle', false);
            properties[i] = new DriverProperty({
                isId,
                path: sc.get(rawProp, 'path', i),
                type: sc.get(rawProp, 'type', 'string'),
                position: sc.get(rawProp, 'position', 0),
                isArray: sc.get(rawProp, 'isArray', false),
                isVisible: sc.get(rawProp, 'isVisible', false),
                hideLabel: sc.get(rawProp, 'hideLabel', false),
                isDisabled: sc.get(rawProp, 'isDisabled', false),
                isRequired: sc.get(rawProp, 'isRequired', false),
                isVirtual: sc.get(rawProp, 'isVirtual', false),
                isTitle
            });
            if(isTitle){
                hasTitle = true;
            }
            if(isId){
                this.idProperty = properties[i];
            }
        }
        if(!hasTitle && sc.hasOwn(properties, 'id')){
            properties['id'].column.isTitle = true;
        }
        return properties;
    }

    static isAdapterFor(rawResource)
    {
        return rawResource && rawResource.model.tableName;
    }

    databaseName()
    {
        return this.model.databaseName() || '';
    }

    name()
    {
        return this.model.name() || '';
    }

    id()
    {
        return this.model.tableName();
    }

    propertyId()
    {
        return this.idProperty.path();
    }

    property(path)
    {
        return this.propertiesObject[path];
    }

    properties()
    {
        return [...Object.values(this.propertiesObject)];
    }

    async find(resourceWithFilters, options)
    {
        this.model.limit = options.limit || 0;
        this.model.offset = options.offset || 0;
        this.model.sortBy = options.sort.sortBy;
        this.model.sortDirection = options.sort.direction;
        let prepareFilters = this.prepareFilters(resourceWithFilters.filters);
        let loadedData = await this.model.load(prepareFilters);
        let result = !loadedData ? null : loadedData.map((loadedResult) => {
            loadedResult = !this.rawConfig.arrayColumns ? loadedResult : this.prepareEntityData(loadedResult);
            return new BaseRecord(loadedResult, this);
        });
        let callback = sc.get(this.callbacks, 'find', false);
        if(callback){
            await callback(result, loadedData, resourceWithFilters, prepareFilters, options, this);
        }
        return result;
    }

    async findMany(ids)
    {
        let loadedData = await this.model.loadByIds(ids);
        let result = !loadedData ? null : loadedData.map((loadedResult) => {
            loadedResult = !this.rawConfig.arrayColumns ? loadedResult : this.prepareEntityData(loadedResult);
            return new BaseRecord(loadedResult, this);
        });
        let callback = sc.get(this.callbacks, 'findMany', false);
        if(callback){
            await callback(result, ids, this);
        }
        return result;
    }

    async findOne(id)
    {
        let loadedData = await this.model.loadById(id);
        loadedData = !this.rawConfig.arrayColumns ? loadedData : this.prepareEntityData(loadedData);
        let result = !loadedData ? null: new BaseRecord(loadedData, this);
        let callback = sc.get(this.callbacks, 'findOne', false);
        if(callback){
            await callback(result, id, this);
        }
        return result;
    }

    async count(resourceWithFilters)
    {
        let prepareFilters = this.prepareFilters(resourceWithFilters.filters);
        let result = await this.model.count(prepareFilters);
        let callback = sc.get(this.callbacks, 'count', false);
        if(callback){
            callback(result, resourceWithFilters, prepareFilters, this);
        }
        return result;
    }

    async create(params)
    {
        let originalParams = Object.assign({}, params);
        let preparedParams = this.prepareParams(params);
        this.validateParams(preparedParams);
        let beforeCallback = sc.get(this.callbacks, 'beforeCreate', false);
        if(beforeCallback){
            await beforeCallback(preparedParams, params, originalParams, this);
        }
        let result = await this.model.create(preparedParams);
        let afterCallback = sc.get(this.callbacks, 'afterCreate', false);
        if(afterCallback){
            await afterCallback(result, preparedParams, params, originalParams, this);
        }
        return result;
    }

    async update(id, params)
    {
        let originalParams = Object.assign({}, params);
        let preparedParams = this.prepareParams(params);
        this.validateParams(preparedParams, true);
        let originalModel = await this.model.loadById(id);
        let beforeUpdateCallback = sc.get(this.callbacks, 'beforeUpdate', false);
        if(beforeUpdateCallback){
            await beforeUpdateCallback(originalModel, id, preparedParams, params, originalParams, this);
        }
        let result = await this.model.updateById(id, preparedParams);
        let afterCallback = sc.get(this.callbacks, 'afterUpdate', false);
        if(afterCallback){
            await afterCallback(result, id, preparedParams, params, originalParams, this);
        }
        return result;
    }

    async delete(id)
    {
        let model = await this.model.loadById(id);
        let beforeCallback = sc.get(this.callbacks, 'beforeDelete', false);
        if(beforeCallback){
            await beforeCallback(model, id, this);
        }
        let result = await this.model.deleteById(id);
        let afterCallback = sc.get(this.callbacks, 'afterDelete', false);
        if(afterCallback){
            await afterCallback(result, id, this);
        }
        return result;
    }

    prepareEntityData(loadedData)
    {
        for(let i of Object.keys(this.rawConfig.arrayColumns)){
            let arrayColumn = this.rawConfig.arrayColumns[i];
            if('string' !== typeof loadedData[i] || !sc.hasOwn(arrayColumn, 'splitBy')){
                continue;
            }
            loadedData[i] = loadedData[i].split(arrayColumn.splitBy);
        }
        return loadedData;
    }

    prepareParams(params)
    {
        let toDelete = [];
        for(let i of Object.keys(params)){
            // remove virtual properties:
            let rawProperty = sc.get(this.rawConfig.properties, i, false);
            if(
                // delete virtual properties:
                (rawProperty && rawProperty.isVirtual)
                // delete not-array undefined properties:
                || (i.indexOf('.') === -1 && !rawProperty)
            ){
                toDelete.push(i);
                continue;
            }
            // avoid not-array properties:
            if(!this.rawConfig.arrayColumns || i.indexOf('.') === -1){
                continue;
            }
            // get array property index:
            let paramKey = i.split('.')[0];
            rawProperty = sc.get(this.rawConfig.properties, paramKey, false);
            let arrayColumn = sc.get(this.rawConfig.arrayColumns, paramKey, false);
            if(!arrayColumn || !rawProperty || !rawProperty.isArray){
                toDelete.push(i);
                continue;
            }
            // convert array property into single property with concatenated values:
            params[paramKey] = !params[paramKey] ? params[i] : params[paramKey]+arrayColumn.splitBy+params[i];
            // delete the original property with index:
            toDelete.push(i);
        }
        // delete properties queue:
        if(toDelete.length){
            for(let i of toDelete){
                delete params[i];
            }
        }
        return params;
    }

    validateParams(params, update = false)
    {
        let propsKeys = Object.keys(this.propertiesObject);
        for(let i of propsKeys)
        {
            let prop = this.propertiesObject[i];
            if(!prop.column.isRequired || prop.column.isId || prop.column.isVirtual || prop.column.isArray){
                continue;
            }
            if(update === false && (!sc.hasOwn(params, i) || !params[i])){
                let queryTypeString = !update ? 'Creation' : 'Update';
                Logger.error({
                    isUpdate: update,
                    missingKey: i,
                    params: params
                });
                ErrorManager.error(queryTypeString+' query failed error. Invalid or missing value for: '+i);
            }
        }
    }

    prepareFilters(filtersList)
    {
        let filtersKeys = Object.keys(filtersList);
        if(0 === filtersKeys.length){
            return {};
        }
        let filters = {};
        for(let i of filtersKeys){
            let filter = filtersList[i];
            let rawConfigFilterProperties = this.rawConfig.properties[i];
            if(rawConfigFilterProperties.isVirtual){
                continue;
            }
            if(rawConfigFilterProperties.type === 'reference'){
                filters[filter.path] = filter.value;
                continue;
            }
            if(rawConfigFilterProperties.type === 'boolean'){
                filters[filter.path] = (filter.value === 'true');
                continue;
            }
            filters[filter.path] = {operator: 'like', value: '%'+filter.value+'%'};
        }
        return filters;
    }

}

module.exports.DriverResource = DriverResource;

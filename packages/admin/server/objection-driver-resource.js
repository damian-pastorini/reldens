/**
 *
 * Reldens - ObjectionDriverResource
 *
 */

const { BaseResource, BaseRecord } = require('adminjs');
const { ObjectionDriverProperty } = require('./objection-driver-property');
const { ErrorManager, sc } = require('@reldens/utils');

class ObjectionDriverResource extends BaseResource
{

    constructor(model, config)
    {
        super(model);
        this.rawConfig = config;
        this.model = model;
        this.label = model.tableName;
        this.idProperty = false;
        this.propertiesObject = this.prepareProperties(config);
        this.callbacks = sc.getDef(config, 'callbacks', {});
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
            let isId = Boolean(sc.getDef(rawProp, 'isId', (i === 'id')));
            let isTitle = sc.getDef(rawProp, 'isTitle', false);
            properties[i] = new ObjectionDriverProperty({
                isId,
                path: sc.getDef(rawProp, 'path', i),
                type: sc.getDef(rawProp, 'type', 'string'),
                position: sc.getDef(rawProp, 'position', 0),
                isArray: sc.getDef(rawProp, 'isArray', false),
                isVisible: sc.getDef(rawProp, 'isVisible', false),
                hideLabel: sc.getDef(rawProp, 'hideLabel', false),
                isDisabled: sc.getDef(rawProp, 'isDisabled', false),
                isRequired: sc.getDef(rawProp, 'isRequired', false),
                isVirtual: sc.getDef(rawProp, 'isVirtual', false),
                isTitle,
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
        return this.model.knex().client.config.connection.database || '';
    }

    name()
    {
        return this.model.tableName || '';
    }

    id()
    {
        return this.name();
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
        let query = this.model.query();
        this.appendQueryFilters(query, resourceWithFilters.filters);
        let loadedData = await query.limit(options.limit)
            .offset(options.offset || 0)
            .orderBy(options.sort.sortBy, options.sort.direction);
        let result = !loadedData ? null : loadedData.map((loadedResult) => {
            loadedResult = !this.rawConfig.arrayColumns ? loadedResult : this.prepareEntityData(loadedResult);
            return new BaseRecord(loadedResult, this);
        });
        let callback = sc.getDef(this.callbacks, 'find', false);
        if(callback){
            callback(result, resourceWithFilters, options, this);
        }
        return result;
    }

    async findMany(ids)
    {
        let loadedData = await this.model.query().findByIds(ids);
        let result = !loadedData ? null : loadedData.map((loadedResult) => {
            loadedResult = !this.rawConfig.arrayColumns ? loadedResult : this.prepareEntityData(loadedResult);
            return new BaseRecord(loadedResult, this);
        });
        let callback = sc.getDef(this.callbacks, 'findMany', false);
        if(callback){
            callback(result, ids, this);
        }
        return result;
    }

    async findOne(id)
    {
        let loadedData = await this.model.query().where(this.propertyId(), id).first();
        loadedData = !this.rawConfig.arrayColumns ? loadedData : this.prepareEntityData(loadedData);
        let result = !loadedData ? null: new BaseRecord(loadedData, this);
        let callback = sc.getDef(this.callbacks, 'findOne', false);
        if(callback){
            callback(result, id, this);
        }
        return result;
    }

    async count(resourceWithFilters)
    {
        let query = this.model.query();
        this.appendQueryFilters(query, resourceWithFilters.filters);
        let count = await query.count().first();
        let result = count ? count['count(*)'] : 0;
        let callback = sc.getDef(this.callbacks, 'count', false);
        if(callback){
            callback(result, resourceWithFilters, this);
        }
        return result;
    }

    async create(params)
    {
        let preparedParams = this.prepareParams(params);
        this.validateParams(preparedParams);
        let result = await this.model.query().insert(preparedParams);
        let callback = sc.getDef(this.callbacks, 'create', false);
        if(callback){
            callback(result, preparedParams, params, this);
        }
        return result;
    }

    async update(id, params)
    {
        let preparedParams = this.prepareParams(params);
        this.validateParams(preparedParams, true);
        let result = await this.model.query().patch(preparedParams).where(this.propertyId(), id);
        let callback = sc.getDef(this.callbacks, 'update', false);
        if(callback){
            callback(result, id, preparedParams, params, this);
        }
        return result;
    }

    async delete(id)
    {
        let result = await this.model.query().where(this.propertyId(), id).delete();
        let callback = sc.getDef(this.callbacks, 'delete', false);
        if(callback){
            callback(result, id, this);
        }
        return result;
    }

    prepareEntityData(loadedData)
    {
        for(let i of Object.keys(this.rawConfig.arrayColumns)){
            let arrayColumn = this.rawConfig.arrayColumns[i];
            loadedData[i] = loadedData[i].split(arrayColumn.splitBy);
        }
        return loadedData;
    }

    prepareParams(params)
    {
        let toDelete = [];
        for(let i of Object.keys(params)){
            // remove virtual properties:
            let rawProperty = sc.getDef(this.rawConfig.properties, i, false);
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
            if(!this.rawConfig.arrayColumns && i.indexOf('.') === -1){
                continue;
            }
            // get array property index:
            let paramKey = i.split('.')[0];
            rawProperty = sc.getDef(this.rawConfig.properties, paramKey, false);
            let arrayColumn = sc.getDef(this.rawConfig.arrayColumns, paramKey, false);
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
        for(let i of Object.keys(this.propertiesObject))
        {
            let prop = this.propertiesObject[i];
            if(!prop.column.isRequired || prop.column.isId || prop.column.isVirtual || prop.column.isArray){
                continue;
            }
            if(update === false && (!sc.hasOwn(params, i) || !params[i])){
                ErrorManager.error('Query failed error. Invalid or missing value for: '+i, {
                    isUpdate: update === false,
                    paramsMissingKey: !sc.hasOwn(params, i),
                    paramFalse: !params[i]
                });
            }
        }
    }

    appendQueryFilters(query, filtersList)
    {
        let filtersKeys = Object.keys(filtersList);
        if(!filtersKeys.length){
            return false;
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
            } else {
                query.where(filter.path, 'like', '%'+filter.value+'%');
            }
        }
        if(Object.keys(filters).length){
            query.where(filters);
        }
    }

}

module.exports.ObjectionDriverResource = ObjectionDriverResource;

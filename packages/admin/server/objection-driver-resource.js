/**
 *
 * Reldens - ObjectionDriverResource
 *
 */

const { BaseResource, BaseRecord} = require('adminjs');
const { ObjectionDriverProperty } = require('./objection-driver-property');
const { sc } = require('@reldens/utils');

class ObjectionDriverResource extends BaseResource
{

    constructor(model, config)
    {
        super(model);
        this.rawConfig = config;
        this.model = model;
        this.label = model.tableName;
        this.findExactFilter = sc.getDef(config, 'findExactFilter', false);
        this.idProperty = false;
        this.propertiesObject = this.prepareProperties(config);
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
        this.appendFilters(query, resourceWithFilters.filters);
        let results = await query.limit(options.limit)
            .offset(options.offset || 0)
            .orderBy(options.sort.sortBy, options.sort.direction);
        if(!results){
            return null;
        }
        return results.map((result) => new BaseRecord(result, this));
    }

    async findMany(ids)
    {
        let results = await this.model.query().findByIds(ids);
        if(!results){
            return null;
        }
        return results.map((result) => new BaseRecord(result, this));
    }

    async findOne(id)
    {
        let result = await this.model.query().where(this.idProperty.path(), id).first();
        if(!result){
            return null;
        }
        return new BaseRecord(result, this);
    }

    async count(resourceWithFilters)
    {
        let query = this.model.query();
        this.appendFilters(query, resourceWithFilters.filters);
        let count = await query.count().first();
        return count ? count['count(*)'] : 0;
    }

    async create(params)
    {
        return await this.model.query().insert(params);
    }

    async update(id, params)
    {
        return await this.model.query().patch(params).where({id});
    }

    async delete(id)
    {
        return await this.model.query().where({id}).delete();
    }

    appendFilters(query, filtersList)
    {
        let filtersKeys = Object.keys(filtersList);
        if(!filtersKeys.length){
            return false;
        }
        let filters = {};
        for(let i of filtersKeys){
            let filter = filtersList[i];
            if(this.rawConfig.properties[i].type === 'reference'){
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

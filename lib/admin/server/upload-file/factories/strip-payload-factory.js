/**
 *
 * Reldens - stripFileFromPayload
 *
 */

const AdminJS = require('adminjs');
const { CONTEXT_NAMESPACE, ERROR_MESSAGES } = require('@adminjs/upload/build/features/upload-file/constants');
const { validatePropertiesGlobally } = require('@adminjs/upload/build/features/upload-file/utils/validate-properties');

module.exports.stripPayloadFactory = (uploadOptionsWithDefault) => {
    return async (request, context) => {
        const { properties } = uploadOptionsWithDefault;
        if(request === null || request === void 0 ? void 0 : request.payload){
            let data = context[CONTEXT_NAMESPACE] || {};
            data = Object.assign(
                Object.assign({}, data),
                {
                    [properties.file]: AdminJS.flat.get(request.payload, properties.file),
                    [properties.filesToDelete]: AdminJS.flat.get(request.payload, properties.filesToDelete),
                    __invocations: [...(data.__invocations || []), { properties }]
                }
            );
            context[CONTEXT_NAMESPACE] = data;
            let filteredPayload = AdminJS.flat.filterOutParams(request.payload, properties.file);
            filteredPayload = AdminJS.flat.filterOutParams(filteredPayload, properties.filesToDelete);
            filteredPayload = AdminJS.flat.filterOutParams(filteredPayload, properties.filePath);
            const duplicatedOccurrences = validatePropertiesGlobally(data.__invocations);
            if(duplicatedOccurrences){
                throw new Error(ERROR_MESSAGES.DUPLICATED_KEYS(duplicatedOccurrences));
            }
            if(!filteredPayload[properties.key]){
                filteredPayload[properties.key] = 'temporal-default';
            }
            request.payload = filteredPayload;
        }
        return request;
    };
};

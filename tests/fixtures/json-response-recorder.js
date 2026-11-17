/**
 *
 * Reldens - JsonResponseRecorder
 *
 * Builds an Express like response for the JSON routes handlers: every status code set and every JSON payload sent are
 * pushed, in order, to the given list, and status() returns the same response so the handlers can chain json().
 *
 */

class JsonResponseRecorder
{

    create(recordedValues)
    {
        let response = {json: (responseData) => recordedValues.push(responseData)};
        response.status = (statusCode) => {
            recordedValues.push(statusCode);
            return response;
        };
        return response;
    }

}

module.exports.JsonResponseRecorder = JsonResponseRecorder;

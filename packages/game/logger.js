class Logger
{

    info(data)
    {
        console.log('INFO -', data);
    }

    error(data, shouldThrow = false)
    {
        console.error('ERROR -', data);
        if(shouldThrow){
            throw new Error(data);
        }
    }

}

module.exports.Logger = new Logger();
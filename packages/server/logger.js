class Logger
{

    info(data)
    {
        console.log('INFO -', data);
    }

    error(data, shouldThrow = false)
    {
        console.log('ERROR -', data);
        if(shouldThrow){
            throw new Error(data);
        }
    }

}

module.exports.Logger = new Logger();
#! /usr/bin/env node

const fs = require('fs');
const path = require('path');

let args = process.argv;
if(2 === args.length){
    console.error('- Missing arguments.', args);
    return false;
}

let validCommands = {
    'players-experience-per-level': (data) => {
    },
    'monsters-experience-per-level': (data) => {
    },
    'attributes-per-level': (data) => {
    }
};

function fetchFileContents(filePath)
{
    if (!filePath) {
        console.error('- Missing data file.', filePath);
        return false;
    }

    let relativePath = path.join(process.cwd(), filePath);
    if (!relativePath) {
        console.error('- Invalid data file path.', process.cwd(), filePath);
        return false;
    }

    let fileContent = fs.readFileSync(relativePath, {encoding: 'utf8', flag:'r'});
    if (!fileContent) {
        console.error('- Can not read data file or file empty.', relativePath);
        return false;
    }

    let importedJson = JSON.parse(fileContent);
    if (!importedJson) {
        console.error('- Can not parse data file.');
        return false;
    }

    return importedJson;
}

let extractedParams = args.slice(2);

let command = extractedParams[0] || false;
if (!command) {
    console.error('- Missing command.');
    return false;
}

if (-1 === Object.keys(validCommands).indexOf(command)) {
    console.error('- Invalid command.', command);
    return false;
}

validCommands[command](fetchFileContents(extractedParams[1] || ''));

#! /usr/bin/env node

const path = require('path');
const fs = require('fs');

module.exports.fetchFileContents = (filePath) => {
    if(!filePath){
        console.error('- Missing data file.', filePath);
        return false;
    }
    let relativePath = path.join(process.cwd(), filePath);
    if(!relativePath){
        console.error('- Invalid data file path.', process.cwd(), filePath);
        return false;
    }
    let fileContent = fs.readFileSync(relativePath, {encoding: 'utf8', flag:'r'});
    if(!fileContent){
        console.error('- Can not read data file or file empty.', relativePath);
        return false;
    }
    let importedJson = JSON.parse(fileContent);
    if(!importedJson){
        console.error('- Can not parse data file.');
        return false;
    }
    return importedJson;
};

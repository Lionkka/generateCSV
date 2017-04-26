"use strict";
const fs = require('fs');
const stream = require('stream');

let newLine = new stream.Transform();
let saveObj = new stream.Transform();
let isHeaders = true;
let headers = [];
let notCompleteObj = '';
let hasBreak = false;
let notFirstObj = false;
newLine._transform = getLine;
saveObj._transform = getObj;

parseCSV('books.csv');
function parseCSV(path) {

    const writeFilePath = path.replace(/\.[^.]+$/, ".json");
    const readFile = fs.createReadStream( path,  'utf-8');
    const writeFile = fs.createWriteStream( writeFilePath , 'utf-8');

    writeFile.write('[');

    readFile.on('error', (err)=>{
        console.error(err);
    });
    writeFile.on('error', (err)=>{
        console.error(err);
    });
    /*readFile.on('end', () => {
        writeFile.end(']');
    });*/
    writeFile.on('close',()=>{
        fs.appendFile(writeFilePath,']');
    });

    readFile
        .pipe(newLine)
        .pipe(saveObj)
        .pipe(writeFile);

}

function getLine(chunk, encoding, done) {
    let data = chunk.toString().split('\n');

    //cut empty item
    if(data[data.length-1] === '')
        data = data.slice(0, data.length-1);

    // if has break add to last item
    if(hasBreak){

        data[0] = notCompleteObj + data[0];
        notCompleteObj = '';
        hasBreak = false;
    }

    //write headers
    if(isHeaders){
        headers = data[0].split(',').map((item)=> {return item.slice(1, -1)} );
        isHeaders = false;
        data = data.slice(1);
    }

    //check is entire last item
    let lastItem = data[data.length-1];
    let latObj = lastItem.split(',');

    // "fg","
    if( lastItem[0] !== '"' || lastItem[lastItem.length -1] !== '"' || latObj.length !== headers.length){
        notCompleteObj = lastItem;
        hasBreak = true;
        data = data.slice(0, data.length-1);
    }

    data.forEach((item)=>{
        this.push(item);
    });

    done();
}

function getObj(chunk, encoding, done) {
    let arr = chunk.toString().split(',');

    //cut ""
    arr = arr.map((item)=>{
        return item.slice(1, -1);
    });

    //create object with headers
    let object = {};
    arr.forEach((item, i)=>{
        object[headers[i]] = item;
    });

    //if not first item add comma
    notFirstObj ? this.push(', \n') : notFirstObj = true;
    this.push(JSON.stringify(object));

    done();
}



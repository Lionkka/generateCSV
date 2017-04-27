"use strict";

const fs = require('fs');
const stream = require('stream');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

let notCompleteObjs = {'books': false, 'authors': false};
let hasBreaks = {'books': false, 'authors': false};
let filesParts = {'books': [], 'authors': []};
let isHeaders = {'books': true, 'authors': true};
let headers = {'books': [], 'authors': []};
let closeStatus = {'books': false, 'authors': false};
let isFirstLine = true;
let isClosedFiles = {'books': false, 'authors': false};

const booksFile = fs.createReadStream( 'books.csv' ,  'utf-8');
const authorsFile = fs.createReadStream( 'authors.csv' , 'utf-8');
const BTAFile = fs.createWriteStream( 'books-to-authors.json' , 'utf-8');

BTAFile.write('[');
booksFile.pause();
authorsFile.pause();

booksFile.on('data', (chunk)=> { booksFile.pause(); getChunk('books' , chunk);  });
authorsFile.on('data', (chunk)=> { authorsFile.pause(); getChunk('authors' , chunk);  });

booksFile.on('error', (err)=> { console.error(); });
authorsFile.on('error', (err)=> { console.error();  });

booksFile.on('close', ()=> { closeFiles('books') });
authorsFile.on('close', ()=> { closeFiles('authors')  });

createBTA();

function getChunk(fileName, chunk) {

    let data = chunk.split('\n');
    //save headers
    if(isHeaders[fileName]){
        headers[fileName] = data[0].split(',').map((header)=>{
            return header.slice(1, -1);
        });
        data = data.slice(1);
        isHeaders[fileName] = false;
    }
    //cut last item if it empty
    if(data[data.length -1] === '')
        data =  data.slice(0, data.length - 1);

    //if last iteration had error
    if(hasBreaks[fileName]){
        data[0] = notCompleteObjs[fileName] + data[0];
        notCompleteObjs[fileName] = '';
        hasBreaks[fileName] = false;
    }

    //ckeck broke items
    let lastItem = data[data.length -1];
    let latObj = lastItem.split(',');
    if( lastItem[0] !== '"' || lastItem[lastItem.length -1] !== '"' || latObj.length !== headers[fileName].length){
        notCompleteObjs[fileName] = lastItem;
        hasBreaks[fileName] = true;
        data = data.slice(0, data.length-1);
    }

    //create array of objects
    data = data.map((line)=>{

        let arr = line.split(',').map((item)=>{
            return item.slice(1, -1);
        });

        let obj = {};
        arr.forEach((item, i)=>{
            obj[headers[fileName][i]] = item;
        });

        return obj;

    });
    filesParts[fileName] = data;
    createBTA();
}
function createBTA() {

    let books = filesParts['books'];
    let authors = filesParts['authors'];

    if(!books.length && closeStatus['books'] === false){
        booksFile.resume();
        return false;
    }
    if(authors.length < 2 && closeStatus['authors'] === false){
        authorsFile.resume();
        return false;
    }

    let obj = {};
    obj = books.splice(0, 1)[0];
    obj['authors'] = authors.splice(0,3);
    if(!isFirstLine)
        BTAFile.write(',\n');
    isFirstLine = false;

    BTAFile.write(JSON.stringify(obj));

    createBTA();


}

function closeFiles(closeFile) {
    console.log( closeFile, 'file is closed');
    fs.appendFile('books-to-authors.json',']');
}
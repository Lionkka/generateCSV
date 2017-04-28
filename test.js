"use strict";

const fs = require('fs');
const stream = require('stream');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

const BTAReadStream = fs.createReadStream('books-to-authors.json');
const booksReadStream = fs.createReadStream('books.csv');
const parseJsonT  = stream.Transform();
const checkObjT = stream.Transform();
const checkBooksCountT = stream.Transform();
const closedStreams = {'parseJSON': false , 'checkedBooks': false };

parseJsonT._transform = parseJSON;
checkObjT._transform = checkObj;
checkBooksCountT._transform = checkBooksCount;

//for parseJSON
let line = '';
let broke = false;
let brackets = 0;
let write = false;

//for checkBooksCount
let isHeaders = true;
let headers = [];
let notCompleteObj = '';
let hasBreak = false;
let booksCountInJSON = 0;
let booksCountInCSV = 0;

let checkedParseJSONStream = BTAReadStream
    .pipe(parseJsonT)
    .pipe(checkObjT);

let checkedBooksStream = booksReadStream
    .pipe(checkBooksCountT);

checkedParseJSONStream.on('finish',()=>{
    if(booksCountInJSON !== booksCountInCSV)
        console.error('Not correct books amount. In CSV:', booksCountInCSV, 'In JSON:', booksCountInJSON);
});

function parseJSON(chunk, encoding, done){

    let data = chunk.toString();

    for (let i = 0;  i< data.length; i++){

        let char = data[i];
        if(char === '{'){
            brackets ++;
            write = true;
        }
        if(write)
            line += char;

        if(char === '}'){
            brackets -- ;
            if(!brackets){
                this.push(line);
                write = false;
                line = '';
            }
        }
    }
    if(line !== ''){
        broke = true;
    }

    done();
}

function checkObj(chunk, encoding, done) {

    let obj = JSON.parse(chunk.toString());
    booksCountInJSON ++;
    if( obj['authors'].length > 4 || obj['authors'].length < 1 ){
        console.error('book', obj['id'],' has ', obj['authors'].length, 'authors' );
    }

    done();
}

function checkBooksCount(chunk, encoding, done){
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

    if( lastItem[0] !== '"' || lastItem[lastItem.length -1] !== '"' || latObj.length !== headers.length){
        notCompleteObj = lastItem;
        hasBreak = true;
        data = data.slice(0, data.length-1);
    }

    booksCountInCSV += data.length;

    done();
}
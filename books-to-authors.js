"use strict";

const fs = require('fs');
const stream = require('stream');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

let generateBooksObjT = stream.Transform();
let createBooksPartT = stream.Transform();

let notCompleteObjs = {'books': false, 'authors': false};
let hasBreaks = {'books': false, 'authors': false};
let filesParts = {'books': [], 'authors': []};
let isHeaders = {'books': true, 'authors': true};
let headers = {'books': [], 'authors': []};
let closeStatus = {'books': false, 'authors': false};
let isFirstLine = true;
let isClosedFiles = {'books': false, 'authors': false};
let isLastIteration = false;
let parts = {'books': [], 'authors': []};

const booksFile = fs.createReadStream( 'books.csv' ,  'utf-8');
const authorsFile = fs.createReadStream( 'authors.csv' , 'utf-8');
const BTAFile = fs.createWriteStream( 'books-to-authors.json' , 'utf-8');
BTAFile.write('[');

generateBooksObjT._transform = generateBooksObj;
createBooksPartT._transform = createBooksPart;

booksFile
    .pipe(generateBooksObjT)
    .pipe(createBooksPartT)
    .pipe(BTAFile);
/*booksFile.on('data', (chunk)=> { booksFile.pause(); getChunk('books' , chunk);  });
authorsFile.on('data', (chunk)=> { authorsFile.pause(); getChunk('authors' , chunk);  });

booksFile.on('error', (err)=> { console.error(); });
authorsFile.on('error', (err)=> { console.error();  });

booksFile.on('close', ()=> { closeFiles('books') ; isClosedFiles['books'] = true });
authorsFile.on('close', ()=> { closeFiles('authors') ; isClosedFiles['authors'] = true});
BTAFile.on('close',()=>{console.log(']')});*/

function createBTA() {
    let books = filesParts['books'];
    let authors = filesParts['authors'];
    if(isLastIteration)
        return false;
    //is last iteration?
    if(isClosedFiles['books'] && books.length === 0 || isClosedFiles['authors'] && authors.length === 0){
        isLastIteration = true;
        console.log('write ]');
        BTAFile.write(']');
        return false;
    }

    if(!books.length && closeStatus['books'] === false){
        booksFile.resume();
        return false;
    }
    if(authors.length < 2 && closeStatus['authors'] === false){
        authorsFile.resume();
        return false;
    }

    let randomBook = getRandomItem(0,books.length - 1);
    //console.log('books length:', books.length, 'random book: ', randomBook);
    let obj = books.splice(randomBook, 1)[0];

    let randomCount = getRandomItem(1,4);
    if(authors.length < randomCount)
        randomCount = authors.length;

    obj['authors'] = [];
    for(let i = 0; i < randomCount; i++){

        let randomAuthor = getRandomItem(0,authors.length - 1);
        obj['authors'].push(authors.splice(randomAuthor,1)[0]);
        //console.log('authors length:', authors.length, 'item:', randomAuthor, 'count:', i);
    }

    if(!isFirstLine)
        BTAFile.write(',\n');
    isFirstLine = false;

    BTAFile.write(JSON.stringify(obj));

    createBTA();
}

function getRandomItem(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


function generateBooksObj(chunk, encoding, done) {

    let data = correctData('books', chunk.toString());
    const self = this;

    data.forEach((line)=>{
        let arr = line.split(',').map((item)=>{ return item.slice(1, -1); });
        let obj = {};
        arr.forEach((item, i)=>{ obj[headers['books'][i]] = item; });
        self.push(JSON.stringify(obj));
    });
    done();

}
function correctData(fileName, chunk) {

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

    return data;

}
function createBooksPart(chunk, encoding, done) {

    if(parts['books'].length < 40){
        parts['books'].push(JSON.parse(chunk.toString()));
        console.log(chunk.toString());
        this.push(chunk);
    }
    else generateBooksObjT.pause();
    done();
}

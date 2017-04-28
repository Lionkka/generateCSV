"use strict";

const fs = require('fs');
const stream = require('stream');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

let generateBooksObjT = stream.Transform();
let createBooksPartT = stream.Transform();
let generateAuthorsObjT = stream.Transform();
let createAuthorsPartT = stream.Transform();

let notCompleteObjs = {'books': false, 'authors': false};
let hasBreaks = {'books': false, 'authors': false};
let filesParts = {'books': [], 'authors': []};
let isHeaders = {'books': true, 'authors': true};
let headers = {'books': [], 'authors': []};
let closeStatus = {'books': false, 'authors': false};
let isFirstLine = true;
let isFinishCreate = {'books': false, 'authors': false};
let isFinishGenerate = {'books': false, 'authors': false};
let isLastIteration = false;

const booksStream = fs.createReadStream( 'books.csv' ,  'utf-8');
const authorsStream = fs.createReadStream( 'authors.csv' , 'utf-8');
const BTAFile = fs.createWriteStream( 'books-to-authors.json' , 'utf-8');
BTAFile.write('[');

generateBooksObjT._transform = generateBooksObj;
createBooksPartT._transform = createBooksPart;
generateAuthorsObjT._transform = generateAuthorsObj;
createAuthorsPartT._transform = createAuthorsPart;

const booksGenerateStream = booksStream
    .pipe(generateBooksObjT);
const booksCreateBooksStream = booksGenerateStream.pipe(createBooksPartT);

const authorsGenerateStream = authorsStream
    .pipe(generateAuthorsObjT);
const booksCreateAuthorsStream = authorsGenerateStream.pipe(createAuthorsPartT);


booksCreateBooksStream.on('error', (err)=> { console.error(err); });
booksCreateAuthorsStream.on('error', (err)=> { console.error(err);  });

booksCreateBooksStream.on('finish', ()=> { closeFiles('books');  });
booksCreateAuthorsStream.on('finish', ()=> { closeFiles('authors'); });

booksGenerateStream.on('finish', ()=> {  isFinishGenerate['books'] = true;  });
authorsGenerateStream.on('finish', ()=> {  isFinishGenerate['authors'] = true;   });

function closeFiles(fileName) {
    createBTA();
    BTAFile.write(']');
    isFinishCreate[fileName] = true;
     if(isFinishCreate['books'] || isFinishCreate['authors'])


    console.log(fileName, 'close');
}

function createBTA() {

    let books = filesParts['books'];
    let authors = filesParts['authors'];

    while (books.length > 0 && authors.length > 0){
        let obj = books.splice(0, 1)[0];

        let randomCount = getRandomItem(1,5);
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
    }

    if(isLastIteration)
        return false;
    //is last iteration?
    if(isFinishCreate['books'] && books.length === 0 || isFinishCreate['authors'] && authors.length === 0){
        console.log('if closed ');
        isLastIteration = true;
        console.log('write ]');
        BTAFile.write(']');
        return false;
    }

    if(!books.length && closeStatus['books'] === false){
        generateBooksObjT.resume();
        return false;
    }
    if(authors.length < 2 && closeStatus['authors'] === false){
        generateAuthorsObjT.resume();
        return false;
    }

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

function generateAuthorsObj(chunk, encoding, done) {

    let data = correctData('authors', chunk.toString());
    const self = this;

    data.forEach((line)=>{
        let arr = line.split(',').map((item)=>{ return item.slice(1, -1); });
        let obj = {};
        arr.forEach((item, i)=>{ obj[headers['authors'][i]] = item; });
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
    filesParts['books'].push(JSON.parse(chunk.toString()));
    if(filesParts['books'].length > 30 || isFinishGenerate['books']){
        generateBooksObjT.pause();
        createBTA();
    }
    done();
}

function createAuthorsPart(chunk, encoding, done) {

    filesParts['authors'].push(JSON.parse(chunk.toString()));
    if(filesParts['authors'].length > 120 || isFinishGenerate['authors']){
        generateAuthorsObjT.pause();
        createBTA();
    }
    done();
}

function getRandomItem(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}
"use strict";

const fs = require('fs');
const stream = require('stream');

const getMemory = setInterval(() => {
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();


require('./db');

const Book = require('./models/book');
const Author = require('./models/author');

let generateBooksObjT = stream.Transform();
let createBooksPartT = stream.Transform();
let generateAuthorsObjT = stream.Transform();
let createAuthorsPartT = stream.Transform();
let writeJSONFileT = stream.Transform();

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

const booksStream = fs.createReadStream('books.csv', 'utf-8');
const authorsStream = fs.createReadStream('authors.csv', 'utf-8');
const BTAFile = fs.createWriteStream('books-to-authors.json', 'utf-8');

generateBooksObjT._transform = generateBooksObj;
createBooksPartT._transform = createBooksPart;
generateAuthorsObjT._transform = generateAuthorsObj;
createAuthorsPartT._transform = createAuthorsPart;
writeJSONFileT._transform = writeJSONFile;

Book.remove({})
    .then(() => Author.remove({}))
    .then(() => {
        const booksGenerateStream = booksStream
            .pipe(generateBooksObjT);
        const booksCreateBooksStream = booksGenerateStream.pipe(createBooksPartT);

        const authorsGenerateStream = authorsStream
            .pipe(generateAuthorsObjT);
        const booksCreateAuthorsStream = authorsGenerateStream.pipe(createAuthorsPartT);


        booksCreateBooksStream.on('error', (err) => {
            console.error(err);
        });
        booksCreateAuthorsStream.on('error', (err) => {
            console.error(err);
        });

        booksCreateBooksStream.on('finish', () => {
            closeFiles('books');
        });
        booksCreateAuthorsStream.on('finish', () => {
            closeFiles('authors');
        });

        booksGenerateStream.on('finish', () => {
            isFinishGenerate['books'] = true;
        });
        authorsGenerateStream.on('finish', () => {
            isFinishGenerate['authors'] = true;
        });
    });


function closeFiles(fileName) {
    createBTA()
        .then(writeFirst()
            .then(createJSONFile)
            .then(writeLast)
            .catch(console.error))
        .then(() => console.log('done write json'))
        //find all authors for book
        .then(authorsByBook)
        .then((authorsByBook) => console.log('authorsByBook', authorsByBook))
        //find all books for author
        .then(bookByAuthor)
        .then((bookByAuthor) => console.log('bookByAuthor', bookByAuthor))
        //find 10 first books with populated authors list
        .then(firstTenBooks)
        .then((firstTenBooks) => console.log('firstTenBooks', firstTenBooks[0]))
        //skip 10 first authors and find all books for each next 3 authors
        .then(skipTenAuthors)
        .then((skipTenAuthors) => console.log('skipTenAuthors', skipTenAuthors))
        .then(() => {

        console.log('end');
            //return Book.findOne('')

        })
        .catch(console.error);
}
//skip 10 first authors and find all books for each next 3 authors
function skipTenAuthors() {
    return new Promise((resolve, reject)=>{
        let skip = 10;
        getBooks();
        function getBooks(books = []) {
            Promise.resolve(books)
                .then((books)=>{
                    return Author.find({}).skip(skip).limit(3)
                        .then((authors) =>{
                            return Promise.all(authors.map((item) => bookByAuthor(item.id)))
                                .then((foundBooks)=>{
                                    foundBooks = foundBooks.filter(item=> item);
                                    foundBooks.forEach(item=> books.push(item));

                                    if(books.length < 3){
                                        skip += 3;
                                        getBooks(books);
                                    }
                                    else resolve(books);
                                })
                        });
                });
        }

    });
}
//find 10 first books with populated authors list
function firstTenBooks() {
    return Book.find({}).limit(10).populate('authors')

}
//find all books for author
function bookByAuthor(id = 'id_1') {
    return new Promise((resolve, reject) => {
        Author.findOne({id})
            .then((author) => {
                let authorID = author._id;
                Book.findOne({authors: authorID})
                    .then(resolve)
                    .catch(reject)
            })
    });
}
//find all authors for book
function authorsByBook(id = 'id_1') {
    return Promise.resolve(id)
        .then((id) =>
            Book.findOne({id: id}, 'authors')
        )
        .then((book) => {
            return Promise.all(
                book.authors.map((author) => {
                    return Author.findById(author);
                })
            )
        });
}

function createBTA() {
    let books = filesParts['books'];
    let authors = filesParts['authors'];

    let promises = [];

    while (books.length > 0 && authors.length > 0) {
        promises.push(
            new Promise((resolve, reject) => {

                let obj = books.splice(0, 1)[0];

                let randomCount = getRandomItem(1, 5);
                if (authors.length < randomCount)
                    randomCount = authors.length;

                obj['authors'] = [];
                let authorsPromises = [];
                for (let i = 0; i < randomCount; i++) {

                    let randomAuthor = getRandomItem(0, authors.length - 1);
                    let author = authors.splice(randomAuthor, 1)[0];
                    obj['authors'].push(author);

                    authorsPromises.push(
                        Author.findOne({id: author.id}));
                }

                Promise.all(authorsPromises)
                    .then((authors) => {
                        let authorsIds = authors.map((item) => item._id);
                        isFirstLine = false;

                        return Book.findOneAndUpdate({id: obj.id}, {authors: authorsIds})
                            .then(resolve);
                    })
                    .catch(reject);
            })
        );
    }

    return Promise.all(promises)
        .then(() => {
            if (isLastIteration)
                return false;
            //is last iteration?
            if (isFinishCreate['books'] && books.length === 0 || isFinishCreate['authors'] && authors.length === 0) {
                console.log('if closed ');
                isLastIteration = true;
                return false;
            }

            if (!books.length && closeStatus['books'] === false) {
                generateBooksObjT.resume();
                return false;
            }
            if (authors.length < 2 && closeStatus['authors'] === false) {
                generateAuthorsObjT.resume();
                return false;
            }

        })
        .catch((err) => console.error('error in createBTA'));
}

function generateBooksObj(chunk, encoding, done) {

    let data = correctData('books', chunk.toString());
    const self = this;
    let bookPromises = data.map((line) => {
        let arr = line.split(',').map((item) => {
            return item.slice(1, -1);
        });
        let obj = {};
        arr.forEach((item, i) => {
            obj[headers['books'][i]] = item;
        });
        return Book.create({id: obj.id, title: obj.title})
            .then(() => self.push(JSON.stringify(obj)))
            .catch((err) => console.error('error in Book.create'));
    });

    Promise.all(bookPromises)
        .then(() => done())
        .catch((err) => console.error('error in generateBooksObj'));

}

function generateAuthorsObj(chunk, encoding, done) {

    let data = correctData('authors', chunk.toString());
    const self = this;

    let authorsPromises = data.map((line) => {
        let arr = line.split(',').map((item) => {
            return item.slice(1, -1);
        });
        let obj = {};
        arr.forEach((item, i) => {
            obj[headers['authors'][i]] = item;
        });

        return Author.create({id: obj.id, firstName: obj.firstName, lastName: obj.lastName})
            .then(() => self.push(JSON.stringify(obj)))
            .catch((err) => console.error(err));
    });
    Promise.all(authorsPromises)
        .then(() => done())
        .catch((err) => console.error('error in generateAuthorsObj'));

}

function correctData(fileName, chunk) {

    let data = chunk.split('\n');
    //save headers
    if (isHeaders[fileName]) {
        headers[fileName] = data[0].split(',').map((header) => {
            return header.slice(1, -1);
        });
        data = data.slice(1);
        isHeaders[fileName] = false;
    }
    //cut last item if it empty
    if (data[data.length - 1] === '')
        data = data.slice(0, data.length - 1);

    //if last iteration had error
    if (hasBreaks[fileName]) {
        data[0] = notCompleteObjs[fileName] + data[0];
        notCompleteObjs[fileName] = '';
        hasBreaks[fileName] = false;
    }

    //ckeck broke items
    let lastItem = data[data.length - 1];
    let latObj = lastItem.split(',');
    if (lastItem[0] !== '"' || lastItem[lastItem.length - 1] !== '"' || latObj.length !== headers[fileName].length) {
        notCompleteObjs[fileName] = lastItem;
        hasBreaks[fileName] = true;
        data = data.slice(0, data.length - 1);
    }

    return data;

}

function createBooksPart(chunk, encoding, done) {
    filesParts['books'].push(JSON.parse(chunk.toString()));
    if (filesParts['books'].length > 30 || isFinishGenerate['books']) {
        generateBooksObjT.pause();
        createBTA()
            .then(done);
    }
    else {
        done();
    }
}

function createAuthorsPart(chunk, encoding, done) {

    filesParts['authors'].push(JSON.parse(chunk.toString()));
    if (filesParts['authors'].length > 120 || isFinishGenerate['authors']) {
        generateAuthorsObjT.pause();
        createBTA()
            .then(done);
    }
    else {
        done();
    }
}

function getRandomItem(min, max) {
    return Math.floor(Math.random() * (max - min)) + min;
}


//write JSON
function writeFirst() {
    return new Promise((resolve, reject) => {
        BTAFile.write('[', (err) => {
            if (err) reject();
            resolve();
        })
    });

}

function writeLast() {
    return new Promise((resolve, reject) => {
        BTAFile.write(']', (err) => {
            if (err) reject();
            resolve();
        })
    });

}

function createJSONFile() {
    return new Promise((resolve, reject) => {

        const cursor = Book.find().cursor();

        cursor.eachAsync((doc) => {
            return new Promise((resolve, reject) => {
                Promise.resolve(doc)
                    .then(writeJSONFile)
                    .then(resolve)
                    .catch(reject);
            });
        })
            .then(resolve)
            .catch(reject);

    });

}

function writeJSONFile(book) {
    return new Promise((resolve, reject) => {
        let bookObj = {id: book.id, title: book.title};
        let authors = book.authors.map((author) => Author.findById(author));

        Promise.all(authors)
            .then((authors) => authors.map(item => {
                return {id: item.id, firtsName: item.firtsName, lastName: item.lastName}
            }))
            .then(authorsObjs => {
                bookObj.authors = authorsObjs;
                return bookObj;
            })
            .then((bookObj) => {
                return new Promise((resolve, reject) => {
                    BTAFile.write(JSON.stringify(bookObj) + ',', resolve);
                })
            })
            .then(resolve)
            .catch(reject);
    });
}
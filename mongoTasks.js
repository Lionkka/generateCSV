require('./db');

const Book = require('./models/book');
const Author = require('./models/author');

Promise.resolve()
    //find all authors for book
    // .then(authorsByBook)
    // .then((authorsByBook) => console.log('authorsByBook', authorsByBook))
    //
    // //find all books for author
    // .then(bookByAuthor)
    // .then((bookByAuthor) => console.log('bookByAuthor', bookByAuthor))
    //
    // //find 10 first books with populated authors list
    // .then(firstTenBooks)
    // .then((firstTenBooks) => console.log('firstTenBooks', firstTenBooks[0]))
    //
    // //skip 10 first authors and find all books for each next 3 authors
    // .then(skipTenAuthors)
    // .then((skipTenAuthors) => console.log('skipTenAuthors', skipTenAuthors))
    //
    // //list contains book id as _id with field authors which contains a set of authors
    // .then(aggregation1)
    // .then((aggregation1) => console.log('aggregation1', aggregation1))

    // //skip 10 first authors and find all books for each next 3 authors
    // .then(aggregation2)
    // .then((aggregation2) => console.log('aggregation2', aggregation2))

    // //match all books which has an id finishing with ‘0’, project authors field and rename title field into ‘bookName’;
    .then(aggregation3)
    .then((aggregation3) => console.log('aggregation3', aggregation3))
    .catch(console.error);


//list contains book id as _id with field authors which contains a set of authors
function aggregation1() {
    return Book.aggregate([
        {$project:{
            "_id":"$id",
            "authors": 1
        }}
    ]).limit(2)
}
//list of authors with field bookCounter which contains number of books that was used in authors list;
function aggregation2() {
    return Book.aggregate([
        {$unwind: "$authors"},
        {
            $group:{
                "_id":"$authors",
                booksNumber:{
                    $sum:1
                }
            }
        }
    ]).limit(5)
}
//match all books which has an id finishing with ‘0’, project authors field and rename title field into ‘bookName’;
function aggregation3() {
    return Book.aggregate([
        {
            $match:{
                "id":{
                    $regex: /0$/
                }
            }
        },
        {
            $project:{
                "bookName": "$title",
                "authors": 1
            }
        }
    ]).limit(5)
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
"use strict";
const fs = require('fs');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

function generateCSV(fileName, headers, amount) {
    return new Promise((resolve, reject) => {
        console.log('Write ' + fileName);
        const file = fs.createWriteStream(fileName);
        file.on('error', reject);
        file.on('close', ()=>{
            console.log('End write ' + fileName + ' successful');
            resolve()});

        //write headers
        file.write(headers.map(field => '"' + field + '"').join(',') + '\n');

        writeFile(0);

        function writeFile(i) {
            writeLine(file, headers, i)
                .then( () => {
                    if(i == amount){

                        file.end();
                    }

                    else {
                        writeFile(i+1);
                    }}
                )
                .catch(reject);
        }
    });
}
function writeLine(file, headers, i) {
    return new Promise((resolve, reject)=>{
        let text = headers.map(field => '"' + field + '_' + i + '"').join(',') + '\n';

        if(!file.write(text)) {
            file.once('drain', () => {
                resolve();
            } );
        }
        else {
            resolve();
        }
    });
}

generateCSV('book.csv', ['id', 'title'], 1000)
    .then(generateCSV('authors.csv', ['id', 'firstName', 'lastName'], 1000))
    .then(()=>{console.log('done')})
    .catch( er => {console.log(er)});



"use strict";
const fs = require('fs');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

function generateCSV(fileName, headers, amount) {
    return new Promise((resolve, reject) => {
        const file = fs.createWriteStream(fileName);
        file.on('error', (er)=> reject(er));

        //write headers
        file.write(headers.map(field => '"' + field + '"').join(',') + '\n');

        let i = 0;
        writeFile();

        function writeFile() {
            let text = headers.map(field => '"' + field + '_' + i + '"').join(',') + '\n';

            writeLine(file, text)
                .then( () => {
                    if(i == amount)
                        resolve('Done');
                    else {
                        i++;
                        writeFile();
                    }}
                )
                .catch(()=> { file.once('drain', writeFile );  });
        }
    });
}
function writeLine(file, text) {
    return new Promise((resolve, reject)=>{
        if(!file.write(text)) {
            reject();
        }
        else
            resolve();
    });
}

generateCSV('book.csv', ['id', 'title'], 1000000)
    .then( done => {console.log('done')})
    .catch( er => {console.log(er)});
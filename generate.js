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
        file.on('close', (er)=> resolve('done'));

        //write headers
        file.write(headers.map(field => '"' + field + '"').join(',') + '\n');

        let i = 0;
        write();

        //generate content
        function write() {
            let ok = true;
            do {
                i++;
                //generate line
                let text = headers.map(field => '"' + field + '_' + i + '"').join(',') + '\n';

                //if last line => callback
                if (!file.write(text)) {
                    file.once('drain', write);
                    ok = false;
                }
                if (i == amount)
                    file.close();
            } while (i < amount && ok);
        }


    });
}

generateCSV('book.csv', ['id', 'title'], 1000000)
    .then(
        done => {console.log('done')}
    )
    .catch( er => {console.log(er)});


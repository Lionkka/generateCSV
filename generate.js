"use strict";
const fs = require('fs');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);

function generateCSV(fileName, headers, amount) {

    const file =fs.createWriteStream(fileName);

    //write headers
    file.write(headers.map(field => '"' + field + '"').join(',') + '\n');

    let text = '';
    let i = 0;
    write();

    //generate content
    function write() {
        let ok = true;
        do {

            i++;
            //generate line
            text = headers.map(field => '"' + field +'_'+i+ '"').join(',') + '\n';

            //if last line => callback
            if (i == amount) {

                file.write( text, () => {
                    clearInterval(getMemory);
                });
            }
            else {
                ok = file.write(text);
            }
        } while (i < amount && ok);

        if (i < amount) {

            file.once('drain', write);
        }
    }
}

generateCSV('book.csv', ['id', 'title'], 1000000);


"use strict";
const fs = require('fs');

const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 30);

function generateCSV(fileName, headers, amount) {

    fs.open(fileName, "w+", function (err, file_handle) {

        let text = '';

        //write headers
        headers.forEach((item, i, arr) => {
            if (i == (arr.length - 1))
                text += item;
            else
                text += item + ',';
        });

        text += '\n';

        //generate content
        for (let i = 0; i < amount; i++) {
            for (let j = 0; j < headers.length; j++) {
                text += headers[j] + '_' + i;
                if (j != headers.length - 1)
                    text += ',';
            }
            text += '\n';
        }

        fs.write(file_handle, text);
        fs.close(file_handle);
    });
}

generateCSV('book.csv', ['id', 'title'], 1000000);

//clearInterval(getMemory);
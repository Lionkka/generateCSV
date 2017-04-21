"use strict";
const fs = require('fs');

function generateCVS(fileName, headers, amount){

    fs.open(fileName, "w+" , function(err, file_handle){
        let text = '';

        for (let k = 0; k < headers.length ; k++){
            if(headers[k].indexOf(',')>0)
                text += '"'+ headers[k] + '"';
            else
                text += headers[k] + ',';
        }

        text += '\n';

        for(let i =0; i< amount; i++){
            for(let j=0; j< headers.length; j++){
                text += headers[j] + '_'+i;
                if(j != headers.length-1 )
                    text += ',';
            }
            text += '\n';
        }
        fs.write(file_handle, text);
    });



}

generateCVS('test.txt',['id','title'], 100000);
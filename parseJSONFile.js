"use strict";

const fs = require('fs');
const stream = require('stream');

let isHeaders = true;
let headers = [];
let notCompleteObj = '';
let hasBreak = false;
let booksCountInCSV = 0;

function checkBooksCount(chunk){
    let data = chunk.toString().split('\n');

    //cut empty item
    if(data[data.length-1] === '')
        data = data.slice(0, data.length-1);

    // if has break add to last item
    if(hasBreak){

        data[0] = notCompleteObj + data[0];
        notCompleteObj = '';
        hasBreak = false;
    }

    //write headers
    if(isHeaders){
        headers = data[0].split(',').map((item)=> {return item.slice(1, -1)} );
        isHeaders = false;
        data = data.slice(1);
    }

    //check is entire last item
    let lastItem = data[data.length-1];
    let latObj = lastItem.split(',');

    if( lastItem[0] !== '"' || lastItem[lastItem.length -1] !== '"' || latObj.length !== headers.length){
        notCompleteObj = lastItem;
        hasBreak = true;
        data = data.slice(0, data.length-1);
    }

}


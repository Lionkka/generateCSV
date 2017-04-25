"use strict";
//node generate.js --method=stream --dest=books.csv --count=100000 --fields=id,name

const args =  process.argv.slice(2);
let param = {};

//parse params
args.forEach((item)=>{
    let arr = item.split('=');
    let name = arr[0].substring(2);
    param[name] = arr[1];
});

//check params
if(!param['method'] == 'file' && !param['method'] == 'stream'){
    throw new SyntaxError('Wrong method');
}
if( !param['dest']){
    throw new SyntaxError('Empty destination');
}
if( !Number(param['count']) ){
    throw new SyntaxError('Wrong count');
}
if( !param['fields']){
    throw new SyntaxError('Empty fields');
}

//init params
let method = param['method'];
let dest = param['dest'];
let count = param['count'];
let fields = param['fields'].split(',');

//start measure memory
const getMemory = setInterval(()=>{
    console.log((process.memoryUsage().heapUsed / 1024 / 1024).toFixed(2), 'mb');
}, 300);
getMemory.unref();

const generate_stream = require('./generate_stream');
const generate_fs = require('./generate_fs');

let generate = '';
switch (method){
    case('stream'):
        generate = generate_stream;
        break;
    case ('file'):
        generate = generate_fs;
        break;
}

generate(dest, fields, count)
    .then(()=>{console.log('done')})
    .catch( err => {console.log(err)});

const fs = require('fs');
const generateCSVStream = (fileName, headers, amount)=>{
    return new Promise((resolve, reject) => {
        console.log('Write ' + fileName + ' with stream');
        const file = fs.createWriteStream(fileName);
        file.on('error', reject);
        file.on('close', ()=>{
            console.log('End write ' + fileName + ' successful');
            resolve()});

        //write headers
        file.write(headers.map(field => '"' + field + '"').join(',') + '\n');

        writeFile(1);

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
};
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
module.exports = {
    generate: generateCSVStream
};
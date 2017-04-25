const fs = require('fs');
function generateCSVFS (fileName, headers, amount){
    const openFile = () => {
        return new Promise((resolve, reject) => {

            console.log('Write ' + fileName + ' with FS');

            fs.open(fileName, 'w+', (err, fd) => {
                err? reject(err) : resolve(fd);

            });
        });
    };
    const writeHeaders = (file) => {
        return new Promise((resolve, reject) => {
            fs.write(file, headers.map(field => '"' + field + '"').join(',') + '\n',
                (err) => {
                    err? reject(err) : resolve(file);
                }
            );
        });
    };

    const closeFile = (file) => {
        return new Promise((resolve) => {
            fs.close(file, () => {
                console.log('End write ' + fileName);
                resolve();
            });
        });
    };

    const writeLine = (file, i) => {
        return new Promise((resolve, reject) => {
            let text = headers.map(field => '"' + field + '_' + i + '"').join(',') + '\n';
            fs.write(file, text, (err) => {
                err ? reject(err) : resolve(file);
            });
        });
    };
    const writeContent = (file) => {
        return new Promise((resolve, reject) => {

            writeFile(file, 1);

            function writeFile(file, i) {
                writeLine(file, i)
                    .then((file) => {
                            if (i == amount)
                                resolve(file);

                            else
                                writeFile(file, i + 1);
                        }
                    )
                    .catch(reject);
            }

        });
    };
    return openFile()
        .then(writeHeaders)
        .then(writeContent)
        .then(closeFile);
};

module.exports = {
    generate: generateCSVFS
};
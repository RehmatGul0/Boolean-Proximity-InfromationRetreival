const fs = require('fs');
const lowerCase = require('lower-case')
const natural = require('natural');
const HashMap = require('hashmap');
function extractStopWord() {
    let stopWordsFile = './stopWords.txt';
    return fs.readFileSync(stopWordsFile);
}
module.exports = {
    generateInvertedIndex: async function () {
        let punctuations = ['.', ',', "'", "\"", ":", ";", "?", "\r\n", "!", "--", "-", "(", ")", "\r\n\r\n", "\r\n\r\n\r\n", "]", "["];
        let words = [];
        let map = new HashMap();
        let stopWord = extractStopWord();
        function getData(file) {
            return new Promise(resolve => {
                fs.readFile(file, 'utf8', function read(err, data) {
                    let tokenizer = new natural.WordPunctTokenizer();
                    words = tokenizer.tokenize(data);
                    words.forEach(word => {
                        word = lowerCase(word);
                        let regex = /[.,\s]/g;
                        word = word.replace(regex, '');
                        if (!stopWord.includes(word) && !punctuations.includes(word)) {
                            if (map.get(word) == undefined) {
                                let tempList = [i];
                                map.set(word, tempList);
                            }

                            else {
                                if (!map.get(word).includes(i)) {
                                    let tempList = map.get(word);
                                    tempList.push(i);
                                    map.delete(word);
                                    map.set(word, tempList);
                                }
                            }
                        }
                    })
                    resolve();
                });
            })
        }
        let i = 1;
        while (i <= 50) {
            let file = './stories/' + i + '.txt';
            await getData(file);
            i++;
        }
        return map;
    },
    generatePositionalIndex: async function () {
        let punctuations = ['.', ',', "'", "\"", ":", ";", "?", "\r\n", "!", "--", "-", "(", ")", "\r\n\r\n", "\r\n\r\n\r\n", "]", "["];
        let words = [];
        let map = new HashMap();
        let j = 0;
        let stopWord = extractStopWord();
        function getData(file) {
            return new Promise(resolve => {
                words = fs.readFileSync(file, 'utf8');
                let tokenizer = new natural.WordPunctTokenizer();
                words = tokenizer.tokenize(words);
                j = 0;
                words.forEach(word => {
                    word = lowerCase(word);
                    var regex = /[.,\s]/g;
                    word = word.replace(regex, '');
                    if (!stopWord.includes(word) && !punctuations.includes(word)) {
                        if (map.get(word) == undefined) {
                            let wordMap = new HashMap();
                            let positions = [j];
                            wordMap.set(i, positions);
                            map.set(word, wordMap);
                        }
                        else {
                            let tempList = map.get(word);
                            let tempPostions = [];
                            if (!map.get(word).get(i)) {

                                tempPostions = [j];
                                tempList.set(i, tempPostions);
                                map.delete(word);
                                map.set(word, tempList);
                            }
                            else {
                                tempPostions = tempList.get(i);
                                tempPostions.push(j);
                                tempList.delete(i);
                                tempList.set(i, tempPostions);
                                map.delete(word);
                                map.set(word, tempList);
                            }
                        }
                        j++;
                    }
                })
                resolve();
            })
        }
        let i = 1;
        while (i <= 50) {
            let file = './stories/' + i + '.txt';
            await getData(file);
            i++;
        }
        return map;
    }

}

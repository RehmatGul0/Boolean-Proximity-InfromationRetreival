const express = require('express');
const lowerCase = require('lower-case');
const app = express();
const path = require('path');
const matrix = require('./matrix');
const port = 3000;
const bodyParser = require('body-parser');
var _ = require('lodash/array');
var mergesort = require('divide-et-impera');
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: true
  }));
  
function intersectPostingLists(list1, list2) {
    let tempList = [];
    let i = 0, j = 0;
    while (i < list1.length && j < list2.length) {
        if (list1[i] == list2[j]) {

            tempList.push(list1[i]);
            i++;
            j++;
        }
        else if (list1[i] < list2[j])
            i++;
        else if (list1[i] > list2[j])
            j++;

    }
    return tempList;
}
function positionalIntersect(list1, list2, k) {
    let tempList = new Set();
    let i = 0; j = 0;
    let list1Keys = list1.keys();
    let list2Keys = list2.keys();
    console.log(list1Keys+"\n"+list2Keys);
    while (i < list1Keys.length && j < list2Keys.length) {
        if (list1Keys[i] == list2Keys[j]) {
            let list1Positions = list1.get(list1Keys[i]);
            let list2Positions = list2.get(list2Keys[j]);
            console.log(list1Positions+"-"+list2Positions)
            for (let positionList1 of list1Positions) {
                for (let positionList2 of list2Positions) {
                    if (positionList2 - positionList1 <= k && positionList2 - positionList1 >= 0)
                        tempList.add(list1Keys[i]);
                    else
                        break;
                }
            }
            i++;
            j++;
        }
        else if (list1Keys[i] < list2Keys[j])
            i++;
        else if (list1Keys[i] > list2Keys[j])
            j++;
    }
    console.log(tempList)
    return Array.from(tempList);
}
let server = async () => {
    let invertedIndex = await matrix.generateInvertedIndex();
    let positionalIndex = await matrix.generatePositionalIndex();
    return { invertedIndex: invertedIndex, positionalIndex: positionalIndex };
}
server().then((matrix) => {
    var invertedIndex = matrix.invertedIndex;
    var positionalIndex = matrix.positionalIndex;
    app.get('/', (req, res) => {
        res.sendFile(path.join(__dirname, '/home.html'));
    });
    app.get('/boolean', (req, res) => {
        res.sendFile(path.join(__dirname, '/boolean.html'));
    });
    app.get('/proximity', (req, res) => {
        res.sendFile(path.join(__dirname, '/proximity.html'));
    });
    app.post('/boolean', (req, res) => {
        let query = lowerCase(req.body.query);
        let queryTokens = query.split(" ");
        //removing all "not term" from querry and replacing it with it' relevant document
        if (queryTokens.includes("not")) {
            let i = 0;
            queryTokens.forEach(token => {
                if (token == "not") {
                    let a = new Set(Array.from({ length: 50 }, (v, k) => k + 1));
                    let b = new Set(invertedIndex.get(queryTokens[i + 1]));
                    let difference = new Set([...a].filter(x => !b.has(x)));
                    queryTokens.splice(i, 1);
                    queryTokens[i] = Array.from(difference);
                }
                i++
            })
        }
        if (queryTokens.includes("or")) {
            let i = 0;
            let temp = [];
            while (queryTokens.includes("or")) {
                if (queryTokens[i] == "or") {
                    let list1 = (Array.isArray(queryTokens[i - 1]) === true) ? queryTokens[i - 1] : invertedIndex.get(queryTokens[i - 1]);
                    let list2 = (Array.isArray(queryTokens[i + 1]) === true) ? queryTokens[i + 1] : invertedIndex.get(queryTokens[i + 1]);
                    temp = _.union(list1, list2);
                    temp = mergesort(temp);
                    queryTokens.splice(i, 2);
                    queryTokens[i - 1] = temp;
                    i = 0;
                }
                i++;
            }
        }
        if (queryTokens.includes("and")) {
            let queryTokensLength = [];
            let i = 0;
            queryTokens.forEach(token => {
                if (!Array.isArray(token)) {
                    if (invertedIndex.get(token) != undefined) {
                        queryTokensLength[i] = invertedIndex.get(token).length;
                    }
                    else
                        queryTokensLength[i] = Number.MAX_SAFE_INTEGER;
                }
                else
                    queryTokensLength[i] = token.length;

                i++;
            })
            let list1 = [], list2 = [], temp = [];
            while (queryTokens.length != 1) {
                let min = queryTokensLength.indexOf(Math.min(...queryTokensLength));
                if (min == 0 || queryTokensLength[min - 2] > queryTokensLength[min + 2]) {
                    list1 = (Array.isArray(queryTokens[min]) === true) ? queryTokens[min] : invertedIndex.get(queryTokens[min]);
                    list2 = (Array.isArray(queryTokens[min + 2]) === true) ? queryTokens[min + 2] : invertedIndex.get(queryTokens[min + 2]);
                    if (list1 == undefined || list2 == undefined) {
                        res.send([]);
                        return;
                    }
                    temp = intersectPostingLists(list1, list2);
                    queryTokens.splice(min + 1, min + 2);
                    queryTokensLength.splice(min + 1, min + 2);
                    queryTokens[min] = temp;
                    queryTokensLength[min] = temp.length;
                }
                else if (min == queryTokens.length - 1 || queryTokensLength[min - 2] < queryTokensLength[min + 2]) {
                    list1 = (Array.isArray(queryTokens[min]) === true) ? queryTokens[min] : invertedIndex.get(queryTokens[min]);
                    list2 = (Array.isArray(queryTokens[min - 2]) === true) ? queryTokens[min - 2] : invertedIndex.get(queryTokens[min - 2]);
                    if (list1 == undefined || list2 == undefined) {
                        res.send([]);
                        return;
                    }
                    temp = intersectPostingLists(list1, list2);
                    queryTokens.splice(min - 2, min);
                    queryTokensLength.splice(min - 2, min);
                    queryTokens[min - 2] = temp;
                    queryTokensLength[min - 2] = temp.length;
                }
            }
        }
        res.send(queryTokens);
    });
    app.post('/proximity', (req, res) => {
        let query = lowerCase(req.body.query);
        let queryTokens = query.split(/\/| /);
        let list1 = positionalIndex.get(queryTokens[0]);
        let list2 = positionalIndex.get(queryTokens[1]);
        let result = positionalIntersect(list1, list2, queryTokens[3]);
        res.send(result);

    });
    app.listen(port, () => console.log(`Example app listening on port ${port}!`))

})
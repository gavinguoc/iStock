var http = require("http");
var cheerio = require("cheerio");
var utilStock = require("./utilStock");
var iconv = require('iconv-lite');
var request = require('request');
var deepcopy = require('deepcopy');

var stock = {};
var sindex = {};
var relatePower = {};
var queueTest = 0;
var levelf = {};
var levels = {};
var level = {};
var cbFunc = null;
// var firstyear = 0;
var overwritten = true;
var repaid = false;

const NETPSTR = "netprofitdate";
const STOCKNO = 5000;
const STOCKYEAR = 5;
const PREDICTQ = 2;
const PE = "http://money.finance.sina.com.cn/quotes_service/api/jsonp_v2.php/t/Market_Center.getHQNodeDataNew?page=1&num=" + STOCKNO + "&sort=per_d&asc=0&node=hs_a";
//const CUR = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/mainindex/index.phtml?num=" + STOCKNO;
const CURTIME = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/mainindex/index.phtml?s_i=&s_a=&s_c=&reportdate=2018&quarter=2&num=" + STOCKNO;
const STOCKVERTICAL = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/incomedetail/index.phtml?num=" + STOCKNO;
//const STOCKDEBT = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/debtpaying/index.phtml?num=" + STOCKNO;
const STOCKDEBT_ALL = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/debtpaying/index.phtml?s_i=&s_a=&s_c=&reportdate=2018&quarter=2&num=" + STOCKNO;
const PREDICT = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/performance/index.phtml?s_i=&s_a=&s_c=&s_type=&reportdate=2018&quarter=2&num=" + STOCKNO;
const CODE = "600890";

const SVARR = ['code',
    'name',
    'vertical'/*所属行业*/,
    'verticalincome'/*所属行业收入(万元)*/,
    'verticalrefcost'/*所属行业参考成本(万元)*/,
    'verticalrefprofit'/*参考利润*/,
    'vprofitdesc'/*利润描述*/,
    'vprofitdate'/*发布日期*/
];
const SBARR = ['code',
    'name',
    'curratio'/*流动比率*/,
    'quickratio'/*速动比率*/,
    'cashratio'/*现金比率*/,
    'icr'/*利息支付倍数*/,
    'equity'/*股东权益比率*/,
    'debt2asset'/*资产负债率*/
];
const CURARR = ['code',
    'name',
    'eps'/*每股收益*/,
    'epsr'/*每股收益同比%*/,
    'navps'/*每股净资产(元)*/,
    'roe'/*净资产收益率(%)*/,
    'cps'/*每股现金流量(元)*/,
    'netprofit'/*净利润(万元)*/,
    'netprofitr'/*净利润同比(%)*/,
    'bonus'/*分配方案*/,
    'netprofitdate'/*发布日期*/,
    'details'
];

const PREDARR = ['code',
    'name',
    'type'/*类型（预升，预减）*/,
    'pQUAdate'/*公告日期*/,
    'pQUAtarget'/*报告期*/,
    'pQUAdesc'/*业绩预告摘要*/,
    'pQUAeps'/*上年同期每股收益(元)*/,
    'pQUAincratio'/*业绩增幅*/,
    'pQUAdetail'/*明细*/,
];

const CUROUT = [
    'code',
    'name',
    'eps',
    'epsr',
    'cps',
    'netprofit',
    'netprofitr',
    'netprofitdate',
    'bonus',
    'symbol',
    'per_d',
    'per',
    'roe',
    'vertical',
    'vprofitdesc',
    'debt2asset',
    '28changeratio',
    '92changeratio',
    '183changeratio',
    '365changeratio',
];
const INDEX = "index";

const CHANGERATIO = {
    "http://quote.stockstar.com/Radar/stockperformance_5.htm": 4 * 7 /* 20日强度 20日 */,
    "http://quote.stockstar.com/Radar/stockperformance_1.htm": 13 * 7 + 1 /* 60日强度 13周 */,
    "http://quote.stockstar.com/Radar/stockperformance_2.htm": 26 * 7 + 1 /* 6个月强度 26周 */,
    "http://quote.stockstar.com/Radar/stockperformance_3.htm": 52 * 7 + 1 /* 1年强度 52周 都需要往前推一天*/
};
const CRURL = "http://quote.stockstar.com";
const CRARR = [
    'code',
    'name',
    'price', /*最新价*/
    'REPchangeratio', /* 涨跌幅 */
    'REPexchangeratio', /*周换手率 */
    'REPvolume', /*成交量(万手)	 */
    'REPhighestprice', /*最高价*/
    'REPlowestprice', /*最低价 */
    'investrecommend', /*投资评级*/
    'cashdirection' /*资金流向*/
];
const CRNAME = "changeratio";

const INDEXURL = "http://vip.stock.finance.sina.com.cn/corp/go.php/vMS_MarketHistory/stockid/##STOCK##/type/S.phtml?year=##YEAR##&jidu=##QUARTER##";
const INDEXID = [
    '000001',
    '399001'
];
const INDEXARR = [
    'date', /*日期*/
    'open', /*开盘价*/
    'high', /*最高价*/
    'close', /*收盘价*/
    'low', /*最低价*/
    'vol', /*交易量(股)*/
    'volprice' /*交易金额(元)*/
]

function parseUrl(url, callback) {
    var data = "";
    request({
        encoding: null,
        url: url,
        timeout: 3000000
    }, function (error, res, body) {
        if (!error && res.statusCode == 200) {
            data = iconv.decode(body, 'gb2312').toString();
            callback(data);
        } else {
            callback(null);
        }
    });

}

function parseUrlx(url, callback) {
    var data = "";

    http.get(url, function (error, res, body) {
        if (!error && res.statusCode == 200) {
            data = iconv.decode(body, 'gb2312').toString();
            callback(data);
        } else {
            callback(null);
        }
    });

}


function getStockData(url, urlArr, year, count, cb) {

    if (year != null) {
        url = url;
    }

    queueTest++;
    console.log("url:" + url + " by year:" + year + " count:" + count + " at getStockData queueTest increase:" + queueTest + " urlArr:" 
        + ((urlArr == SBARR) ? "SBARR" : 
        ((urlArr == SVARR) ? "SVARR" : 
        ((urlArr == CURARR) ? "CURARR" : 
        ((urlArr == PREDARR)? "PREDARR":
        "UNKNOWN")
        ))));

    parseUrl(url, function (data) {

        queueTest--;
        console.log("getStockData queueTest decrease:" + queueTest + " urlArr:" 
        + ((urlArr == SBARR) ? "SBARR" : 
        ((urlArr == SVARR) ? "SVARR" : 
        ((urlArr == CURARR) ? "CURARR" : 
        ((urlArr == PREDARR)? "PREDARR":
        "UNKNOWN")
        ))) + " by year:" + year + " count:" + count);

        if (data) {
            //console.log(data);
            var $ = cheerio.load(data);
            var objTr = $("#dataTable tr");

            if(String(count).indexOf("Q") != -1){
                count = count;
            }

            if((count == 1) && (CURARR == urlArr)){
                count = count;
            }

           for (var i = 0; i < objTr.length; i++) {
                var e = objTr[i];
                var iStock = {};
                var iStockCode = "";
                var objTd = $(e).find("td");

                for (var j = 0; j < objTd.length; j++) {
                    var y = objTd[j];

                    if (j > 0 && iStockCode != "" && isNaN(iStockCode)) { continue; }

                    switch (j) {
                        case 0:
                            iStockCode = $(y).text();
                            if (isNaN(iStockCode)) { continue; }

                            if (iStockCode == CODE) { // && year && (count == 1 || count == 2) && (CURARR == urlArr)
                                iStockCode = iStockCode;
                            }

                            if (year && String(count).indexOf("Q") == -1 ) {
                                if (stock.hasOwnProperty(iStockCode) && stock[iStockCode].hasOwnProperty(INDEX) && stock[iStockCode][INDEX].hasOwnProperty(year)) {
                                    iStock = deepcopy(stock[iStockCode][INDEX][year]);
                                }
                                else {
                                    if (!stock.hasOwnProperty(iStockCode)) stock[iStockCode] = {};
                                    if (!stock[iStockCode].hasOwnProperty(INDEX)) stock[iStockCode][INDEX] = {};
                                    iStock = {};
                                    stock[iStockCode][INDEX][year] = {};
                                    iStock[urlArr[j]] = iStockCode;
                                }
                            }
                            else {
                                if (!stock.hasOwnProperty(iStockCode)) stock[iStockCode] = {};
                                if (!stock[iStockCode].hasOwnProperty(INDEX)) stock[iStockCode][INDEX] = {};
                            }
                            stock[iStockCode][urlArr[j]] = iStockCode;
                            break;
                        case 1:
                            stock[iStockCode][urlArr[j]] = $(y).text();
                            if (year) iStock[urlArr[j]] = $(y).text();
                            break;

                        default:
                            if(year && String(count).indexOf("Q") != -1 ){
                                stock[iStockCode][urlArr[j].replace("QUA", count)] = $(y).text();
                            }
                            else
                            {
                                if (year) {
                                    iStock[urlArr[j]] = $(y).text();
                                    if(urlArr[j].indexOf('date') != -1){
                                        iStock[urlArr[j]] = year;
                                        if(url.indexOf("quarter=4") == -1){
                                            iStock[urlArr[j]] = year + "Q" + url.substr(url.indexOf("quarter=") + "quarter=".length, 1);

                                        }
                                    }
                                }
                                // Manage the Stock main data is up-to-date on the year
                                if (year == null || (count <=2 && ((!stock[iStockCode].hasOwnProperty(NETPSTR) 
                                                        || (stock[iStockCode].hasOwnProperty(NETPSTR) && year >= stock[iStockCode][NETPSTR])) 
                                                     && !(stock[iStockCode][urlArr[j]] && !overwritten && count == 1)))) { // 
                                    if (stock[iStockCode][urlArr[j]] && stock[iStockCode][urlArr[j]] != "" && year == null) {// 
                                        stock[iStockCode][urlArr[j]] = stock[iStockCode][urlArr[j]] + "-" + $(y).text();
                                    }
                                    else {
                                        if(!(stock[iStockCode][urlArr[j]] && !overwritten && count == 1)) {
                                            stock[iStockCode][urlArr[j]] = $(y).text();
                                            // if(stock[iStockCode][INDEX][year] && (year == firstyear && count != 1)){
                                            //     stock[iStockCode][INDEX][year][urlArr[j]] = $(y).text();
                                            // }
                                            if(urlArr[j] == NETPSTR && year){
                                                // var y = new Date().getFullYear();
                                                // if (utilStock.getQuarter(new Date()) == 1) {
                                                //     y = y - 1;
                                                // }
                                                stock[iStockCode][urlArr[j]] = year;
                                                if(url.indexOf("quarter=4") == -1){
                                                    stock[iStockCode][urlArr[j]] = year + "Q" + url.substr(url.indexOf("quarter=") + "quarter=".length, 1);
                                                }
                                            }
                                        }
                                    }
                                }
                            }

                            break;
                    }
                    //console.log($(y).text());
                }

                if (iStockCode == CODE ) { //&& year && (count == 1 || count == 2) && (CURARR == urlArr)
                    iStockCode = iStockCode;
                }

                if(String(count).indexOf("Q") != -1){
                    count = count;
                }
                /// Manage the sub data of the year is good
                if (objTd.length && year && String(count).indexOf("Q") == -1 && !isNaN(iStockCode)) {
                    //if(!stock[iStockCode][INDEX].hasOwnProperty(year) || (stock[iStockCode][INDEX].hasOwnProperty(year) && !Object.keys(stock[iStockCode][INDEX][year]).length)) {
                    // if(!(stock[iStockCode][INDEX].hasOwnProperty(year) && Object.keys(stock[iStockCode][INDEX][year]).length && year == firstyear && 
                    //     (stock[iStockCode][INDEX].hasOwnProperty(NETPSTR) && stock[iStockCode][INDEX][year][NETPSTR] == firstyear && String(iStock[NETPSTR]).indexOf("Q") !=-1) 
                        
                    //     )) {
                    if(!(!overwritten && count == 1 && stock[iStockCode][INDEX].hasOwnProperty(year) && 
                        (stock[iStockCode][INDEX][year].hasOwnProperty(urlArr[urlArr.length-1])) )){
                        stock[iStockCode][INDEX][year] = deepcopy(iStock);
                        if (count == 2) { overwritten = false; }
                    }
                }

            }

            if(!objTr.length) {
                console.log("getStockData url:" + url + " queueTest decrease:" + queueTest + " No valid data returned! data:" + (data?data.substr(1,10):"null"));
            }
        }
        else{
            console.log("getStockData url:" + url + " queueTest decrease:" + queueTest + " No data returned! data:" + (data?data.substr(1,10):"null"));
        }

        if (cb == null && queueTest == 1) {

            var fileName = "stock_"+ utilStock.formatDateTime(new Date()) +  ".txt";

            console.log("getStockData queueTest value reach:" + queueTest + " urlArr:" + ((urlArr == SBARR) ? "SBARR" : ((urlArr == SVARR) ? "SVARR" : ((urlArr == CURARR) ? "CURARR" : ((urlArr == PREDARR) ? "PREDARR" : "UNKNOWN")))));
            var fs = require("fs");
            var arrf = [];
            var arrs = [];
            var arrk = [];

            arrf = Object.keys(stock).sort();
            for (var i = 0; i < arrf.length; i++) { // go through two stocks
                //if (arrf[i] == INDEX) { continue; }
                arrs = Object.keys(stock[arrf[i]]).sort();
                if (arrf[i] == CODE ) { //&& year && (count == 1 || count == 2) && (CURARR == urlArr)
                    arrf[i] = arrf[i];
                }
                
                for (var j = 0; j < arrs.length; j++) {
                    levelf[arrs[j]] = 1;
                    level[arrs[j]] = 1;// && Object.keys(stock[arrf[i]][arrs[j]]).count > 0
                    var t = Object.keys(stock[arrf[i]][arrs[j]]).sort();
                    if (typeof(stock[arrf[i]][arrs[j]]) == 'object' && t.length) {
                        //var t = Object.keys(stock[arrf[i]][arrs[j]]).sort();
                        for(var m = 0; m < t.length; m++){
                            arrk = Object.keys(stock[arrf[i]][arrs[j]][t[m]]).sort();
                            for (var k = 0; k < arrk.length; k++) {
                                levels[arrk[k]] = 1;
                                level[arrk[k]] = 1;
                            }
                        }
                    }
                }
                
            }

            //console.log(levelf + "#####" + levels);
            arrk = CUROUT.sort();
            //arrf.splice(arrf.indexOf(INDEX), 1);
            var keysLevelf =  Object.keys(levelf).sort();

            for(var j = 0; j< keysLevelf.length; j++){
                if(keysLevelf[j].indexOf("pQ") != -1 && keysLevelf[j].indexOf("eps") == -1&& keysLevelf[j].indexOf("detail") == -1){
                    arrk[arrk.length] = keysLevelf[j];
                }
            }

            fs.writeFileSync(fileName, arrk.join(",") + "\n");

            arrf = Object.keys(stock).sort();
            for (var i = 0; i < arrf.length; i++) {

                if (arrf[i] == "") { continue; }

                var outs = "";
                var y = new Date().getFullYear();
                if (utilStock.getQuarter(new Date()) == 1) {
                    y = y - 1;
                }                   

                //arrs = CUROUT.sort();
                console.log("Processing: " + arrf[i]);
                
                var str = "";
                for (var j = 0; j < arrk.length; j++) {
                    //if (CUROUT.indexOf(arrs[j]) == -1) { continue; }
                    str = stock[arrf[i]][arrk[j]];
                    if(str){str = String(str).replace(/(\r\n|\n|\r)/gm,"-");}
                    if (arrf[i] == CODE) {
                        arrf[i] = arrf[i];
                    }
                    if (Object.keys(levelf).indexOf(arrk[j]) != -1) {
                        if (outs == "") {
                            outs = str?str:" ";// + ((arrk[j].indexOf('date') > -1) ? ("-" + y) : "");
                        }
                        else {
                            outs = outs + "," + (str?str:"");// + ((arrk[j].indexOf('date') > -1) ? ("-" + y) : "");
                        }
                    }
                }

                fs.appendFileSync(fileName, outs + "\n");
                arrs = Object.keys(stock[arrf[i]][INDEX]).sort();
                for (var j = 0; j < arrs.length; j++) {
                    var yf = arrs[j];
                    var crValue = 0;
                    outs = "-x-";
                    if (1) { //yf != y) { // Go and Print OUT this year anyway
                        //arrk = CUROUT.sort();
                        for (var k = 0; k < arrk.length; k++) {
                            //if (CUROUT.indexOf(arrk[k]) == -1 ) { continue; }
                            if (Object.keys(levels).indexOf(arrk[k]) == -1) {
                                var tValue = 0;
                                var tValue2 = "";
                                if (j < 2 && arrk[k].indexOf(CRNAME) != -1) {
                                    if (stock[arrf[i]]['symbol'] && stock[arrf[i]]['symbol'].indexOf('sz') != -1) {
                                        crValue = sindex[INDEXID[1]][arrk[k]]['ratio'];
                                        tValue2 = " " + sindex[INDEXID[1]][arrk[k]]['date'];
                                    } else {
                                        crValue = sindex[INDEXID[0]][arrk[k]]['ratio'];
                                        tValue2 = " " + sindex[INDEXID[0]][arrk[k]]['date'];
                                    }
                                    tValue = crValue.toFixed(2) + "%";
                                    // if (k == 0) { tValue = tValue + tValue2; }
                                    tValue = tValue + tValue2;
                                    if (j == 0) {
                                        if (outs == "-x-") {
                                            outs = tValue;
                                        } else {
                                            outs = outs + "," + tValue;
                                        }
                                    } else if (j == 1) {
                                        tValue = 100 * ((parseFloat(stock[arrf[i]][arrk[k]]) + 100) - crValue) / crValue;
                                        tValue = tValue.toFixed(2);
                                        tValue = tValue + "%";
                                        if (outs == "-x-") {
                                            outs = tValue;
                                        } else {
                                            outs = outs + "," + tValue;
                                        }
                                    }
                                } else {
                                    if (outs == "-x-") {
                                        outs = "";
                                    } else {
                                        outs = outs + "," + "";
                                    }
                                }
                            } else {
                                if (outs == "-x-") {
                                    outs = stock[arrf[i]][INDEX][yf][arrk[k]];// + ((arrk[k].indexOf('date') > -1) ? ("-" + yf) : "");
                                } else {
                                    outs = outs + "," + stock[arrf[i]][INDEX][yf][arrk[k]];// + ((arrk[k].indexOf('date') > -1) ? ("-" + yf) : "");
                                }
                            }
                        }
                        fs.appendFileSync(fileName, outs + "\n");
                    }
                }

            }

        }
        if (cb && queueTest == 1) cb();
        
    });
}

function getIndex(cb) {

    queueTest = 1;
    for (var i = 0; i < INDEXID.length; i++) {
        var urlQuery = INDEXURL.replace("##STOCK##", INDEXID[i]);
        console.log("Get id#" + INDEXID[i] + " index data");
        sindex[INDEXID[i]] = {};
        relatePower[INDEXID[i]] = {};
        var fixMonth = utilStock.getQuarter(new Date()) * 3;

        for (var j = 0; j < STOCKYEAR + 1; j++) {
            var date = new Date(new Date().getFullYear(), fixMonth - j * 3 - 1, 1);
            var year = date.getFullYear();
            var qt = utilStock.getQuarter(date);
            var url = urlQuery.replace("year=##YEAR##&jidu=##QUARTER##", "year=" + year + "&jidu=" + qt)

            getIndexData(url, INDEXARR, INDEXID[i], cb);
        }
    }
}

function getIndexData(url, urlArr, id, cb) {

    queueTest++;

    console.log("url:" + url + " index:" + id + " getIndexData queueTest increase:" + queueTest);
    parseUrl(url, function (data) {

        queueTest--;

        console.log("getIndexData queueTest decrease:" + queueTest);

        if (data) {

            var $ = cheerio.load(data);
            var objTr = $("#FundHoldSharesTable tr");
            var indexObj = sindex[id];

            for (var i = 0; i < objTr.length; i++) {
                var e = objTr[i];
                var indexDate = "";

                var objTd = $(e).find("td");
                for (var j = 0; j < objTd.length; j++) {
                    var y = objTd[j];

                    if ((j > 0 && indexDate == "") || (indexDate != "" && isNaN(Date.parse(indexDate)))) { continue; }

                    switch (j) {
                        case 0:
                            indexDate = utilStock.trim($(y).text());
                            if (isNaN(Date.parse(indexDate))) { continue; }
                            indexObj[indexDate] = {};
                            indexObj[indexDate][urlArr[j]] = indexDate;
                            break;

                        default:
                            indexObj[indexDate][urlArr[j]] = utilStock.trim($(y).text());
                            break;
                    }
                }
            }
        }
        else{
            console.log("getIndexData url:" + url + " queueTest decrease:" + queueTest + " No data returned! data:" + (data?data.substr(1,10):"null"));
        }

        if (queueTest == 1 && cb) {

            var hValues = Object.values(CHANGERATIO);
            hValues.unshift(0);
            var curDay = utilStock.lastWorkingDay(new Date(), 0);
            var cntDay;

            for (var i = 0; i < INDEXID.length; i++) {
                var indexKey = INDEXID[i];
                var curIndex = sindex[indexKey];

                cntDay = 0;
                while (!curIndex[curDay]) {
                    curDay = utilStock.lastWorkingDay(curDay, 1);
                    cntDay++;

                    if (cntDay > Object.keys(curIndex).length + 10) {
                        curDay = "";
                        break;
                    }
                }

                if (curDay == "") break;

                for (var j = 0; j < hValues.length; j++) {
                    //loop the different duration of changeratio
                    var key = hValues[j] + CRNAME;
                    var curKey = hValues[0] + CRNAME;
                    var lastDay = curDay;

                    cntDay = 0;
                    lastDay = utilStock.lastWorkingDay(lastDay, hValues[j]);

                    while (!curIndex[lastDay]) {
                        lastDay = utilStock.lastWorkingDay(lastDay, 1);
                        cntDay++;

                        if (cntDay > Object.keys(curIndex).length + 30) {
                            lastDay = "";
                            break;
                        }
                    }
                    //TODO: Check whether the in-weekdays will have the same algorithm
                    //if (i > 0) {
                    // cntDay = 0;
                    // lastDay = utilStock.lastWorkingDay(lastDay, 1);

                    // while (!curIndex[lastDay]) {
                    //     lastDay = utilStock.lastWorkingDay(lastDay, 1);
                    //     cntDay++;

                    //     if (cntDay > Object.keys(curIndex).length + 10) {
                    //         lastDay = "";
                    //         break;
                    //     }
                    // }
                    //}

                    if (lastDay != "") {
                        curIndex[key] = {};
                        curIndex[key]['target'] = curIndex[lastDay];
                        curIndex[key]['date'] = lastDay + " close value";
                        curIndex[key]['ratio'] = 100 * curIndex[curKey]['target']['close'] / curIndex[key]['target']['close'];
                        console.log("Identified id#" + INDEXID[i] + " index data back " + hValues[j] + " by " + lastDay + " value " + curIndex[key]['ratio'] + " Cal from close:" + curIndex[key]['target']['close'] + " now close:" + curIndex[curKey]['target']['close']);
                    }

                }

            }

            cb();

        }
    });
}

function getChangeRatio(url, duration, cb) {

    queueTest++;
    console.log("getChangeRatio url:" + url + " duration:" + duration + " queueTest increase:" + queueTest);

    parseUrl(url, function (data) {

        queueTest--;

        console.log("getChangeRatio queueTest decrease:" + queueTest);

        if (data) {
            //console.log(data);
            var urlBase;
            var $ = cheerio.load(data);
            var objTr = $("#table1 tbody tr");

            if(!objTr.length){
                console.log("getChangeRatio url:" + url + " queueTest decrease:" + queueTest + " data returned but invalid! data:" + (data?data.substr(1,10):"null"));
            }

            for (var i = 0; i < objTr.length; i++) {
                var e = objTr[i];
                var objTd = $(e).find("td");
                var iStockCode = "";

                for (var j = 0; j < objTd.length; j++) {
                    var y = objTd[j];
                    var h = CRARR[j].replace("REP", duration.toString());

                    if ((iStockCode.substring(0, 1) == '2') || (iStockCode.substring(0, 1) == '9') || (j > 0 && iStockCode != "" && isNaN(iStockCode))) { continue; }

                    switch (j) {
                        case 0:
                            iStockCode = $(y).text();
                            if (iStockCode == "" || isNaN(iStockCode) || iStockCode.substring(0, 1) == '2' || iStockCode.substring(0, 1) == '9') { continue; }
                            if (!stock.hasOwnProperty(iStockCode)) stock[iStockCode] = {};
                            if(iStockCode == CODE){
                                iStockCode = iStockCode;
                            }
                            break;

                        default:
                            stock[iStockCode][h] = $(y).text();
                            break;
                    }
                }
            }

            if (CHANGERATIO[url]) {
                var urlCount = Math.ceil($("#ClientPageControl1_hdnTotalCount").val() / $("#ClientPageControl1_hdnPageSize").val());
                for (var k = 2; k <= urlCount; k++) {
                    getChangeRatio(url.replace(/(\d+)\.htm/, "$1" + "_2_1_" + k + ".html"), duration, cb);
                }
            }
        }
        else{
            console.log("getChangeRatio url:" + url + " duration:" + duration + " queueTest decrease:" + queueTest + " No data returned! data:" + (data?data.substr(1,10):"null"));
        }

        if (queueTest == 1) {
            if (cb) cb();
        }
    });
}

parseUrl(PE, function (data) {

    console.log(utilStock.formatDateTime(new Date()));

    if (data) {
        // console.log(data);
        var $ = cheerio.load(data);
        var jsonStr = data.substr(2, data.length - 3);
        jsonStr = jsonStr.replace(/([^{,:]+):\"?([^},"]+)\"?/g, "\"$1\":\"$2\"");
        //console.log(jsonStr);
        var iStock = JSON.parse(jsonStr);
        for (i = 0; i < iStock.length; i++) {
            iStock[i][INDEX] = {};
            stock[iStock[i].code] = iStock[i];
            if(iStock[i].code == CODE){
                iStock[i].code  = iStock[i].code
            }
        }
        levelf = iStock[0];

        console.log("Finish loading jsonstr!");

        getIndex(function () {
            var cr = Object.keys(CHANGERATIO);
            queueTest = 1;

            for (var i = 0; i < cr.length; i++) {
                getChangeRatio(cr[i], CHANGERATIO[cr[i]], function () {
                    queueTest = 1;
                    getStockData(STOCKVERTICAL, SVARR, null, null, function () {
                        queueTest = 1;
                        repaid = false;
                        for (var i = 1; i <= STOCKYEAR; i++) {
                            var year = new Date().getFullYear() - i + 1;
                            var qt = utilStock.getQuarter(new Date());

                            if(qt != 2) {repaid = true;}
                            
                            // Q1	
                            // 通常Q4没出，Q3出了	
                            // 先Q3，再Q4	
                                
                                
                            // Q2	
                            // 通常Q1没出，Q4出了	
                            // 但是目前看也有Q4没出的	
                            // 还得考虑Q3	
                            // 先Q3，再Q4，再Q1	
                                
                            // Q3	
                            // 先Q1，在Q2	

                            if (i == 1) {
                                if (qt == 1 || qt == 2) {
                                    // if it's first quarter, then I need to put it to last year
                                    qt = 3;
                                    year = year - 1;
                                }
                                else {
                                    qt = qt - 1;
                                }
                                //firstyear = year;
                                overwritten = true;
                            }
                            else if(i == 3 && !repaid){
                                i = 2;
                                qt = 1;
                                year = new Date().getFullYear();
                                repaid = true;
                                overwritten = true;
                            }
                            else {
                                qt = 4;
                            }

                            var urlQuery = STOCKDEBT_ALL.replace("reportdate=2018&quarter=2", "reportdate=" + year + "&quarter=" + qt);
                            
                            getStockData(urlQuery, SBARR, year, i, function () {
                                queueTest = 1;
                                repaid = false;
                                for (var i = 1; i <= STOCKYEAR; i++) {
                                    var year = new Date().getFullYear() - i + 1;
                                    var qt = utilStock.getQuarter(new Date());

                                    if(qt != 2) {repaid = true;}

                                    // Q1	
                                    // 通常Q4没出，Q3出了	
                                    // 先Q3，再Q4	
                                        
                                        
                                    // Q2	
                                    // 通常Q1没出，Q4出了	
                                    // 但是目前看也有Q4没出的	
                                    // 还得考虑Q3	
                                    // 先Q3，再Q4，再Q1	
                                        
                                    // Q3	
                                    // 先Q1，在Q2	

                                    if (i == 1) {
                                        if (qt == 1 || qt == 2) {
                                            // if it's first quarter, then I need to put it to last year
                                            qt = 3;
                                            year = year - 1;
                                        }
                                        else {
                                            qt = qt - 1;
                                        }
                                        // firstyear = year;
                                        overwritten = true;
                                    }
                                    else if(i == 3 && !repaid){
                                        i = 2;
                                        qt = 1;
                                        year = new Date().getFullYear();
                                        repaid = true;
                                        overwritten = true;
                                    }
                                    else {
                                        qt = 4;
                                    }

                                    var urlQuery = CURTIME.replace("reportdate=2018&quarter=2", "reportdate=" + year + "&quarter=" + qt);

                                    getStockData(urlQuery, CURARR, year, i, function () {
                                        queueTest = 1;
                                        // firstyear = 0;
                                        // backtrack two quarters excluding the current one
                                        for (var i = 1; i <= PREDICTQ; i++) {
                                            var year = new Date().getFullYear();
                                            var qt = utilStock.getQuarter(new Date())- i;

                                            if (qt <= 0) {
                                                // if it's first quarter, then I need to put it to last year
                                                qt = 4;
                                                year = year - 1;
                                            }
        
                                            var urlQuery = PREDICT.replace("reportdate=2018&quarter=2", "reportdate=" + year + "&quarter=" + qt);

                                            getStockData(urlQuery, PREDARR, year, "Q" + qt, null);
                                        }
                                    }); 
                                }
                            });
                        }
                    });
                });
            }
        });
    }

});
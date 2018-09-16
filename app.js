var http = require("http");
var cheerio = require("cheerio");
var utilStock = require("./utilStock");
var iconv = require('iconv-lite');
var request = require('request');

var stock = {};
var sindex = {};
var relatePower = {};
var queueTest = 0;
var levelf = {};
var levels = {};
var level = {};
var cbFunc = null;

const STOCKNO = 5000;
const STOCKYEAR = 5;
const PE = "http://money.finance.sina.com.cn/quotes_service/api/jsonp_v2.php/t/Market_Center.getHQNodeDataNew?page=1&num=" + STOCKNO + "&sort=per_d&asc=0&node=hs_a";
//const CUR = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/mainindex/index.phtml?num=" + STOCKNO;
const CURTIME = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/mainindex/index.phtml?s_i=&s_a=&s_c=&reportdate=2018&quarter=2&num=" + STOCKNO;
const STOCKVERTICAL = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/incomedetail/index.phtml?num=" + STOCKNO;
const STOCKDEBT = "http://vip.stock.finance.sina.com.cn/q/go.php/vFinanceAnalyze/kind/debtpaying/index.phtml?num=" + STOCKNO;
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
    '91changeratio',
    '182changeratio',
    '364changeratio'
];
const INDEX = "index";

const CHANGERATIO = {
    "http://quote.stockstar.com/Radar/stockperformance_5.htm": 4 * 7 /* 20日强度 20日 */,
    "http://quote.stockstar.com/Radar/stockperformance_1.htm": 13 * 7/* 60日强度 13周 */,
    "http://quote.stockstar.com/Radar/stockperformance_2.htm": 26 * 7/* 6个月强度 26周 */,
    "http://quote.stockstar.com/Radar/stockperformance_3.htm": 52 * 7/* 1年强度 52周*/
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
        url: url
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

    parseUrl(url, function (data) {

        if (data) {
            //console.log(data);
            var $ = cheerio.load(data);
            var objTr = $("#dataTable tr");

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
                            if (year) {
                                if (stock.hasOwnProperty(iStockCode) && stock[iStockCode].hasOwnProperty(INDEX) && stock[iStockCode][INDEX].hasOwnProperty(year)) {
                                    iStock = stock[iStockCode][INDEX][year];
                                }
                                else {
                                    if (!stock.hasOwnProperty(iStockCode)) stock[iStockCode] = {};
                                    if (!stock[iStockCode].hasOwnProperty(INDEX)) stock[iStockCode][INDEX] = {};
                                    iStock = stock[iStockCode][INDEX][year] = {};
                                    iStock[urlArr[j]] = iStockCode;
                                }
                            }
                            stock[iStockCode][urlArr[j]] = iStockCode;
                            break;
                        case 1:
                            stock[iStockCode][urlArr[j]] = $(y).text();
                            if (year) iStock[urlArr[j]] = $(y).text();
                            break;

                        default:
                            if (year) {
                                iStock[urlArr[j]] = $(y).text();
                            }
                            else {
                                if (stock[iStockCode][urlArr[j]] && stock[iStockCode][urlArr[j]] != "") {
                                    stock[iStockCode][urlArr[j]] = stock[iStockCode][urlArr[j]] + "-" + $(y).text();
                                }
                                else {
                                    stock[iStockCode][urlArr[j]] = $(y).text();
                                }
                            }
                            break;
                    }
                    //console.log($(y).text());
                    if (year && j == urlArr.length && !isNaN(iStockCode)) {
                        stock[iStockCode][INDEX][year] = iStock;
                    }
                }
            }

            queueTest++;

            if (count && queueTest >= STOCKYEAR + 1) {
                var fs = require("fs");
                var arrf = [];
                var arrs = [];
                var arrt = [];

                arrf = Object.keys(stock).sort();
                for (var i = 0; i < arrf.length; i++) {
                    //if (arrf[i] == INDEX) { continue; }
                    arrs = Object.keys(stock[arrf[i]]).sort();
                    for (var j = 0; j < arrs.length; j++) {
                        levelf[arrs[j]] = 1;
                        level[arrs[j]] = 1;
                        if (typeof stock[arrf[i]][arrs[j]] == 'object') {
                            var t = Object.keys(stock[arrf[i]][arrs[j]]).sort();
                            arrt = Object.keys(stock[arrf[i]][arrs[j]][t[0]]).sort();
                            for (var k = 0; k < arrt.length; k++) {
                                levels[arrt[k]] = 1;
                                level[arrt[k]] = 1;
                            }
                        }
                    }
                }

                console.log(levelf + "#####" + levels);
                arrf = CUROUT.sort();
                //arrf.splice(arrf.indexOf(INDEX), 1);
                fs.writeFileSync("stock.txt", arrf.join(",") + "\n");

                arrf = Object.keys(stock).sort();
                for (var i = 0; i < arrf.length; i++) {

                    if (arrf[i] == "") { continue; }

                    var outs = "";
                    var y = new Date().getFullYear();
                    arrs = CUROUT.sort();
                    console.log("Processing: " + arrf[i] + "\n");

                    for (var j = 0; j < arrs.length; j++) {
                        if (CUROUT.indexOf(arrs[j]) == -1) { continue; }
                        if (arrf[i] == "002680") {
                            arrf[i] = arrf[i];
                        }
                        if (Object.keys(levelf).indexOf(arrs[j]) != -1) {
                            if (outs == "") {
                                outs = stock[arrf[i]][arrs[j]] + ((arrs[j].indexOf('date') > -1) ? ("-" + y) : "");
                            }
                            else {
                                outs = outs + "," + stock[arrf[i]][arrs[j]] + ((arrs[j].indexOf('date') > -1) ? ("-" + y) : "");
                            }
                        } else {
                            if (stock[arrf[i]].hasOwnProperty(INDEX) && stock[arrf[i]][INDEX].hasOwnProperty(y)) {
                                if (outs == "") {
                                    outs = stock[arrf[i]][INDEX][y][arrs[j]] + ((arrs[j].indexOf('date') > -1) ? ("-" + y) : "");
                                }
                                else {
                                    outs = outs + "," + stock[arrf[i]][INDEX][y][arrs[j]] + ((arrs[j].indexOf('date') > -1) ? ("-" + y) : "");
                                }
                            }
                        }
                    }

                    fs.appendFileSync("stock.txt", outs + "\n");
                    arrs = Object.keys(stock[arrf[i]][INDEX]).sort();
                    for (var j = 0; j < arrs.length; j++) {
                        var yf = arrs[j];
                        var crValue = 0;
                        outs = "-x-";
                        if (yf != y) {
                            arrt = CUROUT.sort();
                            for (var k = 0; k < arrt.length; k++) {
                                //if (CUROUT.indexOf(arrt[k]) == -1 ) { continue; }
                                if (Object.keys(levelf).indexOf(arrt[k]) != -1) {
                                    var tValue = 0;
                                    if (j < 2 && arrt[k].indexOf(CRNAME) != -1) {
                                        if (stock[arrf[i]]['symbol'].indexOf('sz') != -1) {
                                            crValue = sindex[INDEXID[1]][arrt[k]]['ratio'];
                                        } else {
                                            crValue = sindex[INDEXID[0]][arrt[k]]['ratio'];
                                        }
                                        tValue = crValue.toFixed(2);
                                        tValue = tValue + "%";
                                        
                                        if (j == 0) {
                                            if (outs == "-x-") {
                                                outs = tValue;
                                            } else {
                                                outs = outs + "," + tValue;
                                            }
                                        } else if (j == 1) {
                                            tValue = 100*((parseFloat(stock[arrf[i]][arrt[k]]) + 100) - crValue) / crValue;
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
                                        outs = stock[arrf[i]][INDEX][yf][arrt[k]] + ((arrt[k].indexOf('date') > -1) ? ("-" + yf) : "");
                                    } else {
                                        outs = outs + "," + stock[arrf[i]][INDEX][yf][arrt[k]] + ((arrt[k].indexOf('date') > -1) ? ("-" + yf) : "");
                                    }
                                }
                            }
                            fs.appendFileSync("stock.txt", outs + "\n");
                        }
                    }

                }

            }

            if (cb) cb();
        }

    });
}

function getIndex(cb) {

    queueTest = 1;
    for (var i = 0; i < INDEXID.length; i++) {
        var urlQuery = INDEXURL.replace("##STOCK##", INDEXID[i]);
        sindex[INDEXID[i]] = {};
        relatePower[INDEXID[i]] = {};
        var fixMonth = utilStock.getQuarter(new Date()) * 3;

        for (var j = 0; j < STOCKYEAR; j++) {
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

    parseUrl(url, function (data) {

        queueTest--;

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

                        if (cntDay > Object.keys(curIndex).length + 10) {
                            lastDay = "";
                            break;
                        }
                    }
                    //TODO: Check whether the in-weekdays will have the same algorithm
                    if (i > 0) {
                        cntDay = 0;
                        lastDay = utilStock.lastWorkingDay(lastDay, 1);

                        while (!curIndex[lastDay]) {
                            lastDay = utilStock.lastWorkingDay(lastDay, 1);
                            cntDay++;

                            if (cntDay > Object.keys(curIndex).length + 10) {
                                lastDay = "";
                                break;
                            }
                        }
                    }

                    if (lastDay != "") {
                        curIndex[key] = {};
                        curIndex[key]['target'] = curIndex[lastDay];
                        curIndex[key]['ratio'] = 100 * curIndex[curKey]['target']['close'] / curIndex[key]['target']['close'];
                    }

                }

            }

            cb();

        }
    });
}

function getChangeRatio(url, duration, cb) {

    console.log("url:" + url);
    queueTest++;

    parseUrl(url, function (data) {

        queueTest--;

        console.log("queueTest:" + queueTest);

        if (data) {
            //console.log(data);
            var urlBase;
            var $ = cheerio.load(data);
            var objTr = $("#table1 tbody tr");
            for (var i = 0; i < objTr.length; i++) {
                var e = objTr[i];
                var objTd = $(e).find("td");
                var iStockCode = "";

                for (var j = 0; j < objTd.length; j++) {
                    var y = objTd[j];
                    var h = CRARR[j].replace("REP", duration.toString());

                    if ((iStockCode.substring(0,1) == '2') || (iStockCode.substring(0,1) == '9') || (j > 0 && iStockCode != "" && isNaN(iStockCode))) { continue; }

                    switch (j) {
                        case 0:
                            iStockCode = $(y).text();
                            if (iStockCode == "" || isNaN(iStockCode) || iStockCode.substring(0,1) == '2' || iStockCode.substring(0,1) == '9') { continue; }
                            if (!stock.hasOwnProperty(iStockCode)) stock[iStockCode] = {};
                            break;

                        default:
                            stock[iStockCode][h] = $(y).text();
                            break;
                    }
                }
            }

            //var objHref = $("#divPageControl").find("a");

            //var urlCount = $(objHref[objHref.length-2]).text();
            if (CHANGERATIO[url]) {
                for (var k = 2; k <= 120; k++) {
                    getChangeRatio(url.replace(/(\d+)\.htm/, "$1" + "_2_1_" + k + ".html"), duration, cb);
                }
            }
        }

        if (queueTest == 1) {
            if (cb) cb();
        }
    });
}

parseUrl(PE, function (data) {

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
        }
        levelf = iStock[0];

        console.log("Finish loading jsonstr!");

        getIndex(function () {
            queueTest = 1;
            var cr = Object.keys(CHANGERATIO);
            for (var i = 0; i < cr.length; i++) {
                getChangeRatio(cr[i], CHANGERATIO[cr[i]], function () {
                    getStockData(STOCKVERTICAL, SVARR, null, null, function () {
                        getStockData(STOCKDEBT, SBARR, null, null, function () {
                            queueTest = 1;
                            for (var i = 1; i <= STOCKYEAR; i++) {
                                var month = new Date().getMonth;
                                var year = new Date().getFullYear() - i + 1;
                                var qt = utilStock.getQuarter(new Date());;

                                if (i == 1) {
                                    if (qt == 1) {
                                        qt = 4
                                    }
                                    else {
                                        qt = qt - 1;
                                    }
                                }
                                else {
                                    qt = 4;
                                }

                                var urlQuery = CURTIME.replace("reportdate=2018&quarter=2", "reportdate=" + year + "&quarter=" + qt);
                                getStockData(urlQuery, CURARR, year, i, null);
                            }
                        });
                    });
                });
            }
        });
    }

});
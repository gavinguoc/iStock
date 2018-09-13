var http = require("http");
var cheerio = require("cheerio");
var utilStock = require("./utilStock");
var iconv = require('iconv-lite');
var request = require('request');

var stock = {};
var queueTest = 0;
var levelf = {};
var levels = {};
var level = {};

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
    'debt2asset'
];
const INDEX = "index";

const CHANGERATIO = {
    "http://quote.stockstar.com/Radar/stockperformance_5.htm": 4/* 20日强度 1个月 */,
    "http://quote.stockstar.com/Radar/stockperformance_1.htm": 13/* 60日强度 13周 */,
    "http://quote.stockstar.com/Radar/stockperformance_2.htm": 26/* 6个月强度 26周 */,
    "http://quote.stockstar.com/Radar/stockperformance_3.htm": 52/* 1年强度 52周*/
};
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

function parseUrl(url, callback) {
    var data="";
    request({
        encoding: null,
        url: url
    }, function(error, res, body) {
        if (!error && res.statusCode == 200) {
            data = iconv.decode(body, 'gb2312').toString();
            callback(data);
        }else{
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

            for(var i = 0; i < objTr.length; i++){
                var e = objTr[i];
                var iStock = {};
                var iStockCode = "";
                var objTd = $(e).find("td");
                for(var j = 0; j < objTd.length; j++){
                    var y = objTd[j];

                    if (j > 0 && iStockCode != "" && isNaN(iStockCode)) { continue; }

                    switch (j) {
                        case 0:
                            iStockCode = $(y).text();
                            if (isNaN(iStockCode)) { continue; }
                            if(year){
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
                            if(year) iStock[urlArr[j]] = $(y).text();
                            break;

                        default:
                            if(year) {
                                iStock[urlArr[j]] = $(y).text();
                            }
                            else{
                                if(stock[iStockCode][urlArr[j]] && stock[iStockCode][urlArr[j]] != "") {
                                    stock[iStockCode][urlArr[j]] = stock[iStockCode][urlArr[j]] + "-" + $(y).text();
                                }
                                else{
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

            if (count && queueTest >= STOCKYEAR+1 ) {
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
                    var outs = "";
                    var y = new Date().getFullYear();
                    arrs = CUROUT.sort();
                    console.log("Processing: " + arrf[i] + "\n");
                    
                    for (var j = 0; j < arrs.length; j++) {
                        if (CUROUT.indexOf(arrs[j]) == -1 ) { continue; }
                        if(arrf[i] == "002680") {
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
                            if (stock[arrf[i]][INDEX].hasOwnProperty(y)) {
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
                        outs = "-x-";
                        if (yf != y) {
                            arrt = CUROUT.sort();
                            for (var k = 0; k < arrt.length; k++) {
                                //if (CUROUT.indexOf(arrt[k]) == -1 ) { continue; }
                                if (Object.keys(levelf).indexOf(arrt[k]) != -1) {
                                    if (outs == "-x-") {
                                        outs = "";
                                    } else {
                                        outs = outs + "," + "";
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

            if(cb) cb();
        }

    });
}

function getChangeRatio(url, duration) {
    parseUrl(url, function (data) {

        if (data) {
            //console.log(data);
            var $ = cheerio.load(data);

            $("#dataTable tr").each(function (i, e) {
                var iStock = {};
                var iStockCode = "";
                $(e).find("td").each(function (j, y) {

                });
            });
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

        var cr = object.keys(CHANGERATIO);
        for(var i = 0; i< cr.length; i++){
            getChangeRatio(cr[i],CHANGERATIO[cr[i]]);
        }

        getStockData(STOCKVERTICAL, SVARR, null,null, function(){
            getStockData(STOCKDEBT, SBARR, null,null, function(){
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
                    getStockData(urlQuery, CURARR, year,i, null);
                }
            });
        });
    }

});
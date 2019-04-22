exports.getQuarter = function(date)
{
    var month = date.getMonth() + 1;
    return (Math.ceil(month / 3));
};

exports.trim = function(str){
    return str.replace(/(^\s*)|(\s*$)/g, "");
};

function formatDate(d) {
    var yyyy = d.getFullYear().toString();
    var mm = (d.getMonth() + 101).toString().slice(-2);
    var dd = (d.getDate() + 100).toString().slice(-2);
    return yyyy + "-" + mm + "-" + dd;
}

exports.formatDateTime = function(d) {
    var yyyy = d.getFullYear().toString();
    var mm = (d.getMonth() + 101).toString().slice(-2);
    var dd = (d.getDate() + 100).toString().slice(-2);
    var hh = (d.getHours() + 100 ).toString().slice(-2);
    var ms =  (d.getMinutes() + 100 ).toString().slice(-2);
    var ss =  (d.getSeconds() + 100 ).toString().slice(-2);

    return yyyy + "-" + mm + "-" + dd + "_" + hh + "_" + ms + "_" + ss;
}

exports.lastWorkingDay = function(d, duration){
    var date = new Date(d);
    var day = new Date(date.getFullYear(), date.getMonth(), date.getDate() - duration);
    var weekSeq = day.getDay();

    if(weekSeq == 0 || weekSeq == 6){
        return this.lastWorkingDay(day, 1);
    }
    else{
        return formatDate(day);
    }
};
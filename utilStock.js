exports.getQuarter = function(date)
{
    var month = date.getMonth() + 1;
    return (Math.ceil(month / 3));
};
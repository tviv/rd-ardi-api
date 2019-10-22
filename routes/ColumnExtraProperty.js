class ColumnExtraProperty {
    constructor({colNumber, range, sign, type}) {
        this.colNumber = colNumber;
        this.range = range || 1;
        this.sign = sign;
        this.type = type;
    };

}

class RowExtraProperty {
    constructor({rowNumber, sign}) {
        this.rowNumber = rowNumber;
        this.sign = sign;
    };

}

module.exports = {ColumnExtraProperty, RowExtraProperty};
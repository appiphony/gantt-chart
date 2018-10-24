import { Element, api } from 'engine';

export default class GanttChartAllocation extends Element {
    _allocation;
    _size = 50;

    @api index;
    @api startDate;
    @api endDate;

    get _startDate() {
        return new Date(this._allocation.Start_Date__c).getTime() < this.startDate ? this.startDate : new Date(this._allocation.Start_Date__c).getTime();
    }

    get _endDate() {
        return new Date(this._allocation.End_Date__c).getTime() > this.endDate ? this.endDate : new Date(this._allocation.End_Date__c).getTime();
    }

    get left() {
        return Math.ceil((this._startDate - this.startDate) / 24 / 60 / 60 / 1000) * this._size + 'px;';
    }

    get top() {
        return this.index * this._size + 'px;';
    }

    get height() {
        return this._size / 2 + 'px;';
    }

    get width() {
        return Math.ceil((this._endDate - this._startDate) / 24 / 60 / 60 / 1000 + 1) * this._size + 'px;';
    }

    get style() {
        return 'border:1px solid black; text-align: center; background: green; color: white; overflow-x: hidden; left: ' + this.left + ' height: ' + this.height + ' top: ' + this.top + ' width: ' + this.width;
    }

    @api
    get allocation() {
        return this._allocation;
    }
    set allocation(allocation) {
        this._allocation = allocation;
    }

    handleDragStart(event) {
        event.dataTransfer.setData('allocation', JSON.stringify(this.allocation));
    }
}

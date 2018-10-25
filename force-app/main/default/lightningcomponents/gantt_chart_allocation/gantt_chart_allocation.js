import { Element, api } from 'engine';

export default class GanttChartAllocation extends Element {
    _allocation;
    _size = 50;

    @api index;
    @api startDate;
    @api endDate;

    get _startDate() {
        return new Date(this._allocation.Start_Date__c) < this.startDate ? this.startDate : new Date(this._allocation.Start_Date__c);
    }

    get _endDate() {
        return new Date(this._allocation.End_Date__c) > this.endDate ? this.endDate : new Date(this._allocation.End_Date__c);
    }

    get left() {
        return Math.ceil((this._startDate.getTime() - this.startDate.getTime()) / 24 / 60 / 60 / 1000) * this._size + 'px;';
    }

    get top() {
        return this.index * this._size + 'px;';
    }

    get height() {
        return this._size / 2 + 'px;';
    }

    get width() {
        return Math.ceil((this._endDate.getTime() - this._startDate.getTime()) / 24 / 60 / 60 / 1000 + 1) * this._size + 'px;';
    }

    get style() {
        return 'left: ' + this.left + ' top: ' + this.top + ' width: ' + this.width;
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

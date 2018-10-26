import { Element, api } from 'engine';

export default class GanttChartAllocation extends Element {
    _allocation;
    _size = 25;

    @api index;
    @api startDate;
    @api endDate;

    get _startDate() {
        return new Date(this._allocation.Start_Date__c + 'T00:00:00') < this.startDate ? this.startDate : new Date(this._allocation.Start_Date__c + 'T00:00:00');
    }

    get _endDate() {
        return new Date(this._allocation.End_Date__c + 'T00:00:00') > this.endDate ? this.endDate : new Date(this._allocation.End_Date__c + 'T00:00:00');
    }

    get height() {
        return this._size / 2 + 'px;';
    }

    get left() {
        return (this._startDate - this.startDate) / (this.endDate - this.startDate + 24*60*60*1000) * 100 + '%;';
    }

    get right() {
        return (this.endDate - this._endDate) / (this.endDate - this.startDate + 24*60*60*1000) * 100 + '%;';
    }

    get top() {
        return this.index * this._size + 'px;';
    }

    get style() {
        return [
            'left: ' + this.left,
            'right: ' + this.right,
            'top: ' + this.top
        ].join(' ');
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

        // currently not working
        var img = document.createElement('img');
        img.src = 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7';
        event.dataTransfer.setDragImage(img, 0, 0);
    }

    handleLeftDragStart(event) {
        event.dataTransfer.setData('direction', 'left');
        this.handleDragStart(event);
    }

    handleRightDragStart(event) {
        event.dataTransfer.setData('direction', 'right');
        this.handleDragStart(event);
    }
}

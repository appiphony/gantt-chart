import { Element, api } from 'engine';

export default class GanttChartAllocation extends Element {
    _allocation;
    _size = 50;

    @api index;
    @api startDate;
    @api endDate;

    get _startDate() {
        return new Date(this._allocation.Start_Date__c + 'T00:00:00').getTime() < this.startDate.getTime() ? this.startDate.getTime() : new Date(this._allocation.Start_Date__c + 'T00:00:00').getTime();
    }

    get _endDate() {
        return new Date(this._allocation.End_Date__c + 'T00:00:00').getTime() > this.endDate.getTime() ? this.endDate.getTime() : new Date(this._allocation.End_Date__c + 'T00:00:00').getTime();
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
        return [
            'left: ' + this.left,
            'top: ' + this.top,
            'width: ' + this.width
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

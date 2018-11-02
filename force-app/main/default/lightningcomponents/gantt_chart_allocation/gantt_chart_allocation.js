import { Element, api, track } from 'engine';

export default class GanttChartAllocation extends Element {
    _size = 25;

    @api allocation;
    @api index;
    @api startDate;
    @api endDate;

    @track isDragging = false;
    @track style;
    
    get times() {
        var _times = [];

        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
            _times.push(date.getTime());
        }

        return _times;
    }
    
    connectedCallback() {
        this._startDate = new Date(this.allocation.Start_Date__c + 'T00:00:00');
        this._endDate = new Date(this.allocation.End_Date__c + 'T00:00:00');
        this.style = this.getStyle();
    }

    getLeft() {
        return (this._startDate - this.startDate) / (this.endDate - this.startDate + 24*60*60*1000) * 100 + '%;';
    }

    getRight() {
        return (this.endDate - this._endDate) / (this.endDate - this.startDate + 24*60*60*1000) * 100 + '%;';
    }

    getTop() {
        return this.index * this._size + 'px;';
    }

    getStyle() {
        var _style = [
            'left: ' + this.getLeft(),
            'right: ' + this.getRight()
        ];

        if (this.isDragging) {
            _style.push('pointer-events: none;');
        } else {
            _style.push('pointer-events: auto;');
        }

        return _style.join(' ');
    }

    dragInfo = {};
    handleDragStart(event) {
        this.dragInfo.allocation = Object.assign({}, this.allocation);
        this.isDragging = true;
        this.template.querySelector('.timeslots').classList.remove('slds-hide');

        // hide drag image
        var el = this.template.querySelector('.allocation');
        el.style.opacity = 0;
        setTimeout(function() {
            el.style.opacity = 1;
            el.style.pointerEvents = 'none';
        }, 0);
    }

    handleLeftDragStart(event) {
        this.dragInfo.direction = 'left';
        this.handleDragStart(event);
    }

    handleRightDragStart(event) {
        this.dragInfo.direction = 'right';
        this.handleDragStart(event);
    }

    handleDragEnd(event) {
        event.preventDefault();

        const allocation = this.dragInfo.allocation;
        
        var startDateUTC = this._startDate.getTime() + this._startDate.getTimezoneOffset() * 60 * 1000;
        var endDateUTC = this._endDate.getTime() + this._endDate.getTimezoneOffset() * 60 * 1000;

        this.dispatchEvent(new CustomEvent('update', {
            bubbles: true,
            composed: true,
            detail: {
                allocationId: allocation.Id,
                startDate: startDateUTC + '',
                endDate: endDateUTC + ''
            }
        }));

        this.dragInfo = {};
        this.isDragging = false;
        this.template.querySelector('.timeslots').classList.add('slds-hide');
        this.template.querySelector('.allocation').style = this.getStyle();
    }

    handleDragOver(event) {
        const direction = this.dragInfo.direction;
        const myDate = new Date(parseInt(event.currentTarget.dataset.time, 10));

        if (!this.dragInfo.startTime) {
            this.dragInfo.startTime = myDate;
        }

        var deltaDate = Math.trunc((myDate - this.dragInfo.startTime) / 1000 / 60 / 60 / 24);
        var newStartDate = new Date(this.allocation.Start_Date__c + 'T00:00:00');
        newStartDate.setDate(newStartDate.getDate() + deltaDate);
        var newEndDate = new Date(this.allocation.End_Date__c + 'T00:00:00');
        newEndDate.setDate(newEndDate.getDate() + deltaDate);

        switch(direction) {
            case 'left':
                this._startDate = newStartDate;
                break;
            case 'right':
                this._endDate = newEndDate;
                break;
            default:
                this._endDate = newEndDate;
                this._startDate = newStartDate;
        }

        this.template.querySelector('.allocation').style = this.getStyle();
    }

    handleActionsClick() {
        var boundingRect = this.template.querySelector('.allocation').getBoundingClientRect();
        var actionsClicked = new CustomEvent('showMenu', { 
            bubbles: true, 
            composed: true,
            detail : {boundingRect: boundingRect, right: this.getRight()}
        });

        this.dispatchEvent(actionsClicked);
    } 
}

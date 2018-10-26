import { Element, api } from 'engine';

export default class GanttChartTimeslot extends Element {
    @api date;
    @api projectSize = 0;

    get style() {
        return [
            'height: ' + (this.projectSize + 1) * 25 + 'px;',
            'min-height: 65px;'
        ].join(' ');
    }

    handleClick() {
        var dateUTC = this.date.getTime() + this.date.getTimezoneOffset() * 60 * 1000;

        this.dispatchEvent(new CustomEvent('allocation', {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: {
                startDate: dateUTC + '',
                endDate: dateUTC + ''
            }
        }));
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        event.preventDefault();
        
        const allocation = JSON.parse(event.dataTransfer.getData('allocation'));
        const direction = event.dataTransfer.getData('direction');

        var startDate = new Date(allocation.Start_Date__c + 'T00:00:00');
        var endDate = new Date(allocation.End_Date__c + 'T00:00:00');

        switch(direction) {
            case 'left':
                if (this.date.getTime() <= endDate.getTime()) {
                    startDate = this.date;
                }
                break;
            case 'right':
                if (this.date.getTime() >= startDate.getTime()) {
                    endDate = this.date;
                }
                break;
            default:
                endDate = new Date(endDate.getTime() - startDate.getTime() + this.date.getTime());
                startDate = this.date;
        }

        var startDateUTC = startDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000;
        var endDateUTC = endDate.getTime() + endDate.getTimezoneOffset() * 60 * 1000;

        this.dispatchEvent(new CustomEvent('allocation', {
            bubbles: true,
            composed: true,
            detail: {
                allocationId: allocation.Id,
                startDate: startDateUTC + '',
                endDate: endDateUTC + ''
            }
        }));
    }
}

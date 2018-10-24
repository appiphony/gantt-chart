import { Element, api } from 'engine';

export default class GanttChartTimeslot extends Element {
    _date;

    @api
    get date() {
        return this._date;
    }
    set date(date) {
        // convert to GMT
        this._date = new Date(date.getTime() + date.getTimezoneOffset() * 60 * 1000);
    }

    handleClick() {
        this.dispatchEvent(new CustomEvent('allocation', {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: {
                startDate: this.date.getTime() + '',
                endDate: this.date.getTime() + ''
            }
        }));
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        event.preventDefault();

        const allocation = JSON.parse(event.dataTransfer.getData('allocation'));

        this.dispatchEvent(new CustomEvent('allocation', {
            bubbles: true,
            cancelable: true,
            composed: true,
            detail: {
                allocationId: allocation.Id,
                startDate: this.date.getTime() + '',
                endDate: this.date.getTime() + ''
            }
        }));
    }
}

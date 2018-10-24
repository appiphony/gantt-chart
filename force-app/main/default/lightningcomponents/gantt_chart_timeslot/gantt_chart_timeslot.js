import { Element, api } from 'engine';
import { showToast } from 'lightning-notifications-library';

import saveAllocation from '@salesforce/apex/ganttChart.saveAllocation';

export default class GanttChartTimeslot extends Element {
    _date;
    _resource;

    @api
    get date() {
        return this._date;
    }
    set date(date) {
        this._date = date;
    }

    @api
    get resource() {
        return this._resource;
    }
    set resource(resource) {
        this._resource = resource;
    }

    handleClick() {
        // send event to create
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        debugger
        event.preventDefault();

        const allocation = JSON.parse(event.dataTransfer.getData('allocation'));

        saveAllocation({
            allocationId: allocation.Id,
            startDate: this.date,
            endDate: this.date
        }).catch(e => {
            showToast({
                message: e.message,
                variant: 'error'
            });
        });
    }
}

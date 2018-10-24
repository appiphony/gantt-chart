import { Element, api, track, wire } from 'engine';

import getAllocationLists from '@salesforce/apex/ganttChart.getAllocationLists';
import getResource from '@salesforce/apex/ganttChart.getResource';

export default class GanttChartResource extends Element {
    @api recordId;
    @api startDate;
    @api endDate;
    @api isResource;

    @track resource = {};
    @track allocationLists = [];

    get dates() {
        var _dates = [];

        var endTime = this.endDate.getTime();
        for (var time = this.startDate.getTime(); time < endTime; time += 24*60*60*1000) {
            _dates.push(new Date(time));
        }

        return _dates;
    }

    @wire(getResource, { recordId: '$recordId' })
    wiredResource({ error, data }) {
        if (error) {
            this.error = error;
        } else if (data) {
            this.resource = data;
        }
    }

    @wire(getAllocationLists, { recordId: '$recordId', startDate: '$startDate', endDate: '$endDate' })
    wiredAllocationLists({ error, data }) {
        if (error) {
            this.error = error;
        } else if (data) {
            this.allocationLists = data;
        }
    }

    get link() {
        return '/' + this.resource.Id;
    }
}

import { Element, api, track, wire } from 'engine';

import getAllocationLists from '@salesforce/apex/ganttChart.getAllocationLists';
import getResource from '@salesforce/apex/ganttChart.getResource';

export default class GanttChartResource extends Element {
    @api recordId;
    @api showHeader;

    @track resource = {};
    @track allocationLists = [];

    @wire(getResource, { recordId: '$recordId' })
    wiredResource({ error, data }) {
        if (error) {
            this.error = error;
        } else if (data) {
            this.resource = data;
        }
    }
    @wire(getAllocationLists, { recordId: '$recordId', startDate: null, endDate: null })
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

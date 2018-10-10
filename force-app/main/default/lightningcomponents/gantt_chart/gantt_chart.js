import { Element, api, track, wire } from 'engine';
import getRecordType from '@salesforce/apex/ganttChart.getRecordType';
import getResourceIds from '@salesforce/apex/ganttChart.getResourceIds';

export default class GanttChart extends Element {
    @api recordId;
    @track recordType;
    @track resourceIds = [];

    @wire(getRecordType, { recordId: '$recordId' })
    wiredRecordType({ error, data }) {
        if (error) {
            this.error = error;
        } else if (data) {
            this.recordType = data;
        }
    }

    @wire(getResourceIds, { recordId: '$recordId', startDate: null, endDate: null })
    wiredResourceIds({ error, data }) {
        if (error) {
            this.error = error;
        } else if (data) {
            this.resourceIds = data;
        }
    }

    get showHeader() {
        return 'Resource__c' !== this.recordType;
    }
}

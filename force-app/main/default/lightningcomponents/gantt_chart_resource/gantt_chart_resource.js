import { Element, api, track, wire } from 'engine';
import { showToast } from 'lightning-notifications-library';
import { refreshApex } from '@salesforce/apex';

import getAllocationLists from '@salesforce/apex/ganttChart.getAllocationLists';
import saveAllocation from '@salesforce/apex/ganttChart.saveAllocation';

export default class GanttChartResource extends Element {
    @api resource
    @api projectId;
    @api startDate;
    @api endDate;

    @track allocationLists = [];

    get recordId() {
        return this.resource.Id;
    }

    get dates() {
        var _dates = [];

        for (var time = this.startDate.getTime(); time <= this.endDate.getTime(); time += 24*60*60*1000) {
            _dates.push(new Date(time));
        }

        return _dates;
    }

    get projectSize() {
        return this.allocationLists.length;
    }
    
    get projectIdOrEmpty() {
        return this.projectId ? this.projectId : '';
    }

    get startDateUTC() {
        return this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
    }

    get endDateUTC() {
        return this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
    }

    connectedCallback() {
        this.recordId = this.resource.Id;
        this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + ''
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
        this.projectIdOrEmpty = this.projectId ? this.projectId : '';
    }

    wiredAllocationLists;
    @wire(getAllocationLists, { recordId: '$recordId', projectId: '$projectIdOrEmpty', startDate: '$startDateUTC', endDate: '$endDateUTC' })
    wiredGetAllocationLists(value) {
        this.wiredAllocationLists = value;

        if (value.error) {
            showToast({
                error: value.error,
                variant: 'error'
            });
        } else if (value.data) {
            this.allocationLists = value.data;
        }
    }

    get link() {
        return '/' + this.recordId;
    }

    handleAllocation(event) {
        var allocation = event.detail;

        if (null == allocation.projectId && null != this.projectId) {
            allocation.projectId = this.projectId;
        }

        if (null == allocation.resourceId) {
            allocation.resourceId = this.recordId;
        }

        saveAllocation(allocation)
        .then(() => {
            return refreshApex(this.wiredAllocationLists);
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }
}

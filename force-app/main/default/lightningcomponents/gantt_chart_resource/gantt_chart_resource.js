import {
    Element,
    api,
    track,
    wire
} from 'engine';
import {
    showToast
} from 'lightning-notifications-library';
import {
    refreshApex
} from '@salesforce/apex';

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

    get times() {
        var _times = [];

        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
            _times.push(date.getTime());
        }

        return _times;
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
    @wire(getAllocationLists, {
        recordId: '$recordId',
        projectId: '$projectIdOrEmpty',
        startDate: '$startDateUTC',
        endDate: '$endDateUTC'
    })
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

    handleClick(event) {
        const myDate = new Date(parseInt(event.currentTarget.dataset.time, 10));
        var dateUTC = myDate.getTime() + myDate.getTimezoneOffset() * 60 * 1000;

        this.handleAllocationUpdate({
            detail: {
                startDate: dateUTC + '',
                endDate: dateUTC + ''
            }
        });
    }

    handleAllocationUpdate(event) {
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
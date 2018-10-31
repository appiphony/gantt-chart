import {
    Element,
    api
} from 'engine';
import {
    showToast
} from 'lightning-notifications-library';

import saveAllocation from '@salesforce/apex/ganttChart.saveAllocation';

export default class GanttChartResource extends Element {
    @api resource
    @api projectId;
    @api startDate;
    @api endDate;

    get times() {
        var _times = [];

        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
            _times.push(date.getTime());
        }

        return _times;
    }

    get projects() {
        return Object.values(this.resource.allocationsByProject);
    }

    get link() {
        return '/' + this.resource.id;
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
            allocation.resourceId = this.resource.id;
        }

        saveAllocation(allocation)
            .then(() => {
                // send refresh to top
                this.dispatchEvent(new CustomEvent('refresh', {
                    bubbles: true,
                    composed: true
                }));
            }).catch(error => {
                showToast({
                    message: error.message,
                    variant: 'error'
                });
            });
    }
}
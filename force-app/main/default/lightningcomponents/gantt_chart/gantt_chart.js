import { Element, api, track, wire } from 'engine';
import { showToast } from 'lightning-notifications-library';
import { refreshApex } from '@salesforce/apex';

import getResourceIds from '@salesforce/apex/ganttChart.getResourceIds';
import getResources from '@salesforce/apex/ganttChart.getResources';

export default class GanttChart extends Element {
    @api recordId;
    @api days = 14;
    
    // doesn't work due to bug (W-4610385)
    @track startDate = new Date();
    @track resourceIds = [];

    @track addResourceId;
    @track isResource = false;
    @track showResourceModal = false;

    get endDate() {
        return new Date(this.startDate.getTime() + this.days*24*60*60*1000);
    }

    get formattedStartDate() {
        return this.startDate.toLocaleDateString();
    }

    get formattedEndDate() {
        return this.endDate.toLocaleDateString();
    }

    connectedCallback() {
        // workaround for bug (W-4610385)
        this.startDate = new Date();
        this.startDate.setHours(0,0,0,0);
        this.days = 14;
    }

    @wire(getResourceIds, { recordId: '$recordId', startDate: '$startDate', days: '$days' })
    wiredGetResourceIds(value) {
        this.wiredResourceIds = value;

        if (value.error) {
            showToast({
                message: value.error,
                variant: 'error'
            });
        } else if (value.data) {
            this.resourceIds = value.data;
        }
    }

    openAddResourceModal() {
        getResources()
        .then((resources) => {
            this.resources = resources;
            this.showResourceModal = true;
        }).catch((error) => {
            showToast({
                message: error,
                variant: 'error'
            });
        });
    }

    refresh() {
        refreshApex(this.wiredResourceIds);
    }
}
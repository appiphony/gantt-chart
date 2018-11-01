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


import getChartData from '@salesforce/apex/ganttChart.getChartData';
import getResources from '@salesforce/apex/ganttChart.getResources';

export default class GanttChart extends Element {
    @api recordId;
    @api days = 14;

    // chart
    @track dates;
    @track months;
    @track projectId;
    @track resources;

    // doesn't work due to bug (W-4610385)
    get startDate() {
        if (null == this._startDate) {
            this._startDate = new Date();
            this._startDate.setHours(0, 0, 0, 0);
            this._startDate.setDate(this._startDate.getDate() - this._startDate.getDay());
        }

        return this._startDate;
    }
    set startDate(date) {
        this._startDate = date;
    }

    get isResource() {
        return null == this.projectId;
    }

    get endDate() {
        var _endDate = new Date(this.startDate);
        _endDate.setDate(_endDate.getDate() + this.days - 1);
        return _endDate;
    }

    get startDateUTC() {
        return this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
    }

    get endDateUTC() {
        return this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
    }

    get formattedStartDate() {
        return this.startDate.toLocaleDateString();
    }

    get formattedEndDate() {
        return this.endDate.toLocaleDateString();
    }

    get recordIdOrEmpty() {
        return this.recordId ? this.recordId : '';
    }

    // modal
    @track modalResource;
    @track modalResources = [];
    @track showResourceModal = false;
    @track showResourceRole = false;
    @track modalAddDisabled = true;

    connectedCallback() {
        // workaround for bug (W-4610385)
        this._startDate = new Date();
        this._startDate.setHours(0, 0, 0, 0);
        this._startDate.setDate(this._startDate.getDate() - this._startDate.getDay());

        this.startDate = this._startDate;
        this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
        this.days = 14;
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';

        this.recordIdOrEmpty = this.recordId ? this.recordId : '';

        this.dates = this.getDates();
    }

    getDates() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var dates = [];
        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
            if (!dates[date.getMonth()]) {
                dates[date.getMonth()] = {
                    name: monthNames[date.getMonth()],
                    days: []
                };
            }

            dates[date.getMonth()].days.push((date.getMonth() + 1) + '/' + date.getDate());
        }

        return dates.filter(d => d);
    }

    wiredChartData;
    @wire(getChartData, {
        recordId: '$recordIdOrEmpty',
        startDate: '$startDateUTC',
        endDate: '$endDateUTC'
    })
    wiredGetChartData(value) {
        this.wiredChartData = value;

        if (value.error) {
            this.resources = [];
            showToast({
                message: value.error,
                variant: 'error'
            });
        }
        if (value.data) {
            this.projectId = value.data.projectId;
            this.resources = value.data.resources;
        } else {
            this.resources = [];
        }
    }

    openAddResourceModal() {
        getResources().then(resources => {
            var excludeResources = this.resources;
            this.modalResources = resources.filter(resource => {
                return excludeResources.filter(excludeResource => {
                    return excludeResource.Id === resource.Id
                }).length === 0;
            });
            this.modalAddDisabled = true;
            this.showResourceModal = true;
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }

    selectResource(event) {
        this.modalResources.forEach(resource => {
            if (resource.Id === event.target.value) {
                this.modalResource = Object.assign({}, resource);
                this.showResourceRole = true;
            }
        });
        
        if (this.modalResource && this.modalResource.Default_Role__c) {
            this.modalAddDisabled = false;
        } else {
            this.modalAddDisabled = true;
        }
    }

    handleRoleChange(event) {
        this.modalResource.Default_Role__c = event.detail.value.trim();
        if (this.modalResource && this.modalResource.Default_Role__c) {
            this.modalAddDisabled = false;
        } else {
            this.modalAddDisabled = true;
        }
    }

    addResourceById() {
        this.resources = this.resources.concat([this.modalResource]);

        this.modalResource = null;
        this.modalResources = [];
        this.showResourceModal = false;
        this.showResourceRole = false;
    }

    hideResourceModal() {
        this.modalResource = null;
        this.modalResources = [];
        this.showResourceModal = false;
        this.showResourceRole = false;
    }

    handleRefresh() {
        refreshApex(this.wiredChartData);
    }
}
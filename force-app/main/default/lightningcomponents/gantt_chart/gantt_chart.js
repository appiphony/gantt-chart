import { Element, api, track, wire } from 'engine';
import { showToast } from 'lightning-notifications-library';

import getChartData from '@salesforce/apex/ganttChart.getChartData';
import getResources from '@salesforce/apex/ganttChart.getResources';

export default class GanttChart extends Element {
    @api recordId;
    @api days = 14;
    
    // chart
    @track projectId;
    @track resources;

    // doesn't work due to bug (W-4610385)
    get startDate() {
        if (null == this._startDate) {
            this._startDate = new Date();
            this._startDate.setHours(0,0,0,0);
            this._startDate = new Date(this.startDate.getTime() - this.startDate.getDay() * 24*60*60*1000);
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
        return new Date(this.startDate.getTime() + (this.days - 1)*24*60*60*1000);
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

    get dates() {
        var _dates = [];

        for (var time = this.startDate.getTime(); time <= this.endDate.getTime(); time += 24*60*60*1000) {
            var date = new Date(time);

            _dates.push((date.getMonth()+1) + '/' + date.getDate());
        }

        return _dates;
    }

    get recordIdOrEmpty() {
        return this.recordId ? this.recordId : '';
    }

    // modal
    @track modalResource;
    @track modalResources = [];
    @track showResourceModal = false;
    @track showResourceRole = false;

    connectedCallback() {
        // workaround for bug (W-4610385)
        this._startDate = new Date();
        this._startDate.setHours(0,0,0,0);
        this._startDate = new Date(this.startDate.getTime() - this.startDate.getDay() * 24*60*60*1000);

        this.startDate = this._startDate;
        this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
        this.days = 14;
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';

        this.recordIdOrEmpty = this.recordId ? this.recordId : '';
    }

    @wire(getChartData, { recordId: '$recordIdOrEmpty', startDate: '$startDateUTC', endDate: '$endDateUTC' })
    wiredGetChartData(value) {
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
            this.resources =  [];
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
    }

    handleRoleChange(event) {
        this.modalResource.Default_Role__c = event.detail.value.trim();
    }

    addResourceById() {
        this.resources = this.resources.concat([this.modalResource]);
        
        this.modalResource = null;
        this.showResourceModal = false;
        this.showResourceRole = false;
        this.modalResources = [];
    }

    hideResourceModal() {
        this.showResourceModal = false;
    }
}
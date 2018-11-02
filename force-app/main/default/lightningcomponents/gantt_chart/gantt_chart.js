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

    // dates
    @track startDate;
    @track endDate;
    @track startDateUTC;
    @track endDateUTC;
    @track formattedStartDate;
    @track formattedEndDate;
    @track dates;

    // chart
    @track projectId;
    @track resources;

    get isResource() {
        return null == this.projectId;
    }

    get dateShift() {
        switch (this.days) {
            case 14:
                return 7;
            default:
                return 7;
        }
    }

    setStartDate(startDate) {
        this.startDate = startDate;

        this.endDate = new Date(this.startDate);
        this.endDate.setDate(this.endDate.getDate() + this.days - 1);

        this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
        this.formattedStartDate = this.startDate.toLocaleDateString();
        this.formattedEndDate = this.endDate.toLocaleDateString();

        this.dates = this.getDates();
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
    @track showDeleteModal = false;

    connectedCallback() {
        this.days = 14;
        this.recordIdOrEmpty = this.recordId ? this.recordId : '';

        var _startDate = new Date();
        _startDate.setHours(0, 0, 0, 0);
        _startDate.setDate(_startDate.getDate() - _startDate.getDay());

        this.setStartDate(_startDate);
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
            dates[date.getMonth()].style = 'width: calc(' + dates[date.getMonth()].days.length + '/' + this.days + '*100%)';
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

    navigateToToday() {
        var _startDate = new Date();
        _startDate.setHours(0, 0, 0, 0);
        _startDate.setDate(_startDate.getDate() - _startDate.getDay());

        this.setStartDate(_startDate);

        this.handleRefresh();
    }

    navigateToPrevious() {
        var _startDate = new Date(this.startDate);
        _startDate.setDate(_startDate.getDate() - this.dateShift);

        this.setStartDate(_startDate);
        
        this.handleRefresh();
    }

    navigateToNext() {
        var _startDate = new Date(this.startDate);
        _startDate.setDate(_startDate.getDate() + this.dateShift);

        this.setStartDate(_startDate);

        this.handleRefresh();
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
        var newResource = Object.assign({}, this.modalResource);
        newResource.allocationsByProject = [];
        this.resources = this.resources.concat([newResource]);

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
        getChartData({
            recordId: this.recordIdOrEmpty,
            startDate: this.startDateUTC,
            endDate: this.endDateUTC
        }).then(data => {
            this.projectId = data.projectId;
            this.resources = data.resources;
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }
}
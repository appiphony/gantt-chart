import {
    Element,
    api,
    track
} from 'engine';
import {
    showToast
} from 'lightning-notifications-library';

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
    @track resources = [];
    @track isResourceView = false;

    get dateShift() {
        switch (this.days) {
            case 14:
                return 7;
            default:
                return 7;
        }
    }

    setStartDate(_startDate) {
        _startDate.setHours(0, 0, 0, 0);
        _startDate.setDate(_startDate.getDate() - _startDate.getDay());

        this.startDate = _startDate;

        this.endDate = new Date(this.startDate);
        this.endDate.setDate(this.endDate.getDate() + this.days - 1);

        this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
        this.formattedStartDate = this.startDate.toLocaleDateString();
        this.formattedEndDate = this.endDate.toLocaleDateString();

        this.dates = this.getDates();
    }

    // modal
    @track resourceModalData = {};

    connectedCallback() {
        this.days = 14;
        this.recordIdOrEmpty = this.recordId ? this.recordId : '';

        this.setStartDate(new Date());

        this.handleRefresh();
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

    navigateToToday() {
        this.setStartDate(new Date());

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
            this.resourceModalData.resources = resources.filter(resource => {
                return excludeResources.filter(excludeResource => {
                    return excludeResource.Id === resource.Id
                }).length === 0;
            });
            
            this.template.querySelector('#resource-modal').show();
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }

    handleResourceSelect(event) {
        this.resourceModalData.resources.forEach(resource => {
            if (resource.Id === event.target.value) {
                this.resourceModalData.resource = Object.assign({}, resource);
                this.resourceModalData.hasResource = true;
            }
        });

        this.validateResourceModalData();
    }

    handleRoleChange(event) {
        this.resourceModalData.resource.Default_Role__c = event.detail.value.trim();

        this.validateResourceModalData();
    }

    validateResourceModalData() {
        if (!this.resourceModalData.resource || !this.resourceModalData.resource.Default_Role__c) {
            this.resourceModalData.disabled = true;
        } else {
            this.resourceModalData.disabled = false;
        }
    }

    addResourceById() {
        var newResource = Object.assign({}, this.resourceModalData.resource);
        newResource.allocationsByProject = [];
        this.resources = this.resources.concat([newResource]);

        this.template.querySelector('#resource-modal').hide();

        this.resourceModalData = {
            disabled: true,
            resource: null,
            resources: []
        };
    }

    handleRefresh() {
        var self =  this;

        getChartData({
            recordId: self.recordIdOrEmpty,
            startDate: self.startDateUTC,
            endDate: self.endDateUTC
        }).then(data => {
            self.isResourceView = self.recordId && !data.projectId;
            self.projectId = data.projectId;

            // empty old data
            self.resources.forEach(function(resource, i) {
                self.resources[i] = {
                    Id: resource.Id,
                    Name: resource.Name,
                    allocationsByProject: {}
                };
            });
            
            data.resources.forEach(function(newResource) {
                for (var i = 0; i < self.resources.length; i++) {
                    if (self.resources[i].Id === newResource.Id) {
                        self.resources[i] = newResource;
                        return;
                    }
                }

                self.resources.push(newResource);
            });
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }
}
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
    @track datePickerString;

    // TODO: move filter search to new component?
    @track filterData = {
        projects: [],
        roles: [],
        status: '',
        // TODO: pull from backend
        statusOptions: [{
            label: 'All',
            value: 'All'
        }, {
            label: 'Hold',
            value: 'Hold'
        }, {
            label: 'Unavailable',
            value: 'Unavailable'
        }]
    };
    @track view = false;
    @track projectId;
    @track resources = [];

    get dateShift() {
        switch (this.days) {
            case 14:
                return 7;
            default:
                return 7;
        }
    }

    setStartDate(_startDate) {
        if (_startDate instanceof Date && !isNaN(_startDate)) {
            _startDate.setHours(0, 0, 0, 0);

            // this.datePickerString = _startDate.toString().replace(/(\w+) (\w+) (\d+) (\d+).+/, '$2 $3, $4');
            this.datePickerString = _startDate.toISOString();

            _startDate.setDate(_startDate.getDate() - _startDate.getDay());

            this.startDate = _startDate;

            this.endDate = new Date(this.startDate);
            this.endDate.setDate(this.endDate.getDate() + this.days - 1);

            this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
            this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
            this.formattedStartDate = this.startDate.toLocaleDateString();
            this.formattedEndDate = this.endDate.toLocaleDateString();

            this.dates = this.getDates();

            this.handleRefresh();
        } else {
            showToast({
                error: 'Invalid Date',
                variant: 'error'
            });
        }
    }

    // modal
    @track resourceModalData = {};

    connectedCallback() {
        this.days = 14;
        this.recordIdOrEmpty = this.recordId ? this.recordId : '';

        this.setStartDate(new Date());
    }

    getDates() {
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        today = today.getTime();

        var dates = [];

        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
            if (!dates[date.getMonth()]) {
                dates[date.getMonth()] = {
                    name: monthNames[date.getMonth()],
                    days: []
                };
            }

            var day = {
                class: 'slds-col slds-p-vertical_x-small slds-m-top_x-small timeline_day',
                value: (date.getMonth() + 1) + '/' + date.getDate()
            }

            if (date.getTime() === today) {
                day.class += ' today';
            }
            
            dates[date.getMonth()].days.push(day);
            dates[date.getMonth()].style = 'width: calc(' + dates[date.getMonth()].days.length + '/' + this.days + '*100%)';
        }

        // reorder index
        return dates.filter(d => d);
    }

    navigateToToday() {
        this.setStartDate(new Date());
    }

    navigateToPrevious() {
        var _startDate = new Date(this.startDate);
        _startDate.setDate(_startDate.getDate() - this.dateShift);

        this.setStartDate(_startDate);
    }

    navigateToNext() {
        var _startDate = new Date(this.startDate);
        _startDate.setDate(_startDate.getDate() + this.dateShift);

        this.setStartDate(_startDate);
    }

    navigateToDay(event) {
        this.setStartDate(new Date(event.target.value + 'T00:00:00'));
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
            self.projects = data.projects;
            self.roles = data.roles;

            // empty old data
            self.resources.forEach(function(resource, i) {
                self.resources[i] = {
                    Id: resource.Id,
                    Name: resource.Name,
                    Default_Role__c: resource.Default_Role__c,
                    primaryAllocation: null,
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

    /*** Filter Modal ***/
    openFilterModal() {
        this.template.querySelector('#filter-modal').show();
    }

    filterProjects(event) {
        var text = event.target.value;

        this.filterData.projectOptions = this.projects.filter(project => {
            return project.Name.toLowerCase().includes(text.toLowerCase()) && !this.filterData.projects.filter(p => {
                return p.id === project.Id;
            }).length;
        });
    }

    addProjectFilter(event) {
        this.filterData.projects.push(Object.assign({}, event.currentTarget.dataset));
        this.filterData.projectOptions = [];
        this.filterData.projectSearch = '';
    }

    removeProjectFilter(event) {
        this.filterData.projects.splice(event.currentTarget.dataset.index, 1);
    }

    filterRoles(event) {
        var text = event.target.value;

        this.filterData.roleOptions = this.roles.filter(role => {
            return role.toLowerCase().includes(text.toLowerCase()) && !this.filterData.roles.filter(r => {
                return r === role
            }).length;
        });
    }

    addRoleFilter(event) {
        this.filterData.roles.push(event.currentTarget.dataset.role);
        this.filterData.roleOptions = [];
        this.filterData.roleSearch = '';
    }

    removeRoleFilter(event) {
        this.filterData.roles.splice(event.currentTarget.dataset.index, 1);
    }

    setStatusFilter(event) {
        this.filterData.status = event.currentTarget.value;
    }

    applyFilters() {
        this.template.querySelectorAll('c-gantt_chart_resource').forEach(resource => {
            resource.applyFilters(this.filterData);
        });
        this.template.querySelector('#filter-modal').hide();
    }
}
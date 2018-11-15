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
    
    // dates
    @track startDate;
    @track endDate;
    @track startDateUTC;
    @track endDateUTC;
    @track formattedStartDate;
    @track formattedEndDate;
    @track dates;
    @track slots = 14;

    // options
    @track datePickerString;
    @track view = {
        slotSize: '7',
        options: [{
            label: 'Detail',
            value: '1'
        }, {
            label: 'High Density',
            value: '7'
        }]
    };

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
    @track projectId;
    @track resources = [];

    dateShift = 7;

    constructor() {
        super();
        this.template.addEventListener('click', this.closeDropdowns.bind(this));
    }

    closeDropdowns() {
        this.template.querySelectorAll('.resource-component').forEach(
            function(row, rowIndex) {
                row.closeAllocationMenu();
            }
        )
    }

    setStartDate(_startDate) {
        if (_startDate instanceof Date && !isNaN(_startDate)) {
            _startDate.setHours(0, 0, 0, 0);

            this.datePickerString = _startDate.toISOString();

            _startDate.setDate(_startDate.getDate() - _startDate.getDay());

            this.startDate = _startDate;
            this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
            this.formattedStartDate = this.startDate.toLocaleDateString();
            
            this.setDateHeaders();
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
        this.setView('7');
        this.setStartDate(new Date());
    }

    setView(value) {
        this.view.slotSize = value;
        this.view.dateIncrement = parseInt(value, 10);
        this.setDateHeaders();
        this.handleRefresh();
    }

    handleViewChange(event) {
        this.setView(event.target.value);
    }
    
    setDateHeaders() {
        this.endDate = new Date(this.startDate);
        this.endDate.setDate(this.endDate.getDate() + this.slots * this.view.dateIncrement - 1);
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
        this.formattedEndDate = this.endDate.toLocaleDateString();

        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        var today = new Date();
        today.setHours(0, 0, 0, 0);
        today = today.getTime();

        var dates = {};

        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + this.view.dateIncrement)) {
            var index = date.getFullYear() * 100 + date.getMonth();
            if (!dates[index]) {
                dates[index] = {
                    name: monthNames[date.getMonth()],
                    days: []
                };
            }

            var day = {
                class: 'slds-col slds-p-vertical_x-small slds-m-top_x-small timeline_day',
                label: (date.getMonth() + 1) + '/' + date.getDate(),
                start: date
            }

            if (this.view.dateIncrement > 1) {
                var end = new Date(date);
                end.setDate(end.getDate() + this.view.dateIncrement - 1);
                day.label = day.label + ' - ' + (end.getMonth() + 1) + '/' + end.getDate();
                day.end = end;
            } else {
                day.end = date;
                if (date.getDay() === 6) {
                    day.class = day.class + ' is-saturday';
                }    
            }

            if (today >= day.start && today <= day.end) {
                day.class += ' today';
            }
            
            dates[index].days.push(day);
            dates[index].style = 'width: calc(' + dates[index].days.length + '/' + this.slots + '*100%)';
        }

        // reorder index
        this.dates = Object.values(dates);

        this.template.querySelectorAll('c-gantt_chart_resource').forEach(resource => {
            resource.refreshDates(this.startDate, this.endDate, this.view.dateIncrement);
        });
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

    validateResourceModalData() {
        if (!this.resourceModalData.resource) {
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
            recordId: self.recordId ? self.recordId : '',
            startTime: self.startDateUTC,
            endTime: self.endDateUTC,
            slotSize: self.view.slotSize
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

            this.applyFilters();
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
            return project.Name && project.Name.toLowerCase().includes(text.toLowerCase()) && !this.filterData.projects.filter(p => {
                return p.id === project.Id;
            }).length;
        });
    }

    addProjectFilter(event) {
        event.preventDefault();
        
        this.filterData.projects.push(Object.assign({}, event.currentTarget.dataset));
        this.hideDropdowns();
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
        event.preventDefault();

        this.filterData.roles.push(event.currentTarget.dataset.role);
        this.hideDropdowns();
    }

    removeRoleFilter(event) {
        this.filterData.roles.splice(event.currentTarget.dataset.index, 1);
    }

    setStatusFilter(event) {
        this.filterData.status = event.currentTarget.value;
    }

    hideDropdowns() {
        this.filterData.projectOptions = [];
        this.filterData.roleOptions = [];
    }

    applyFilters() {
        this.template.querySelectorAll('c-gantt_chart_resource').forEach(resource => {
            resource.applyFilters(this.filterData);
        });
        this.template.querySelector('#filter-modal').hide();
    }
}
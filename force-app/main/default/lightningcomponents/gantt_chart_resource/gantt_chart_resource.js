import {
    Element,
    api,
    track
} from 'engine';
import {
    showToast
} from 'lightning-notifications-library';

import getProjects from '@salesforce/apex/ganttChart.getProjects';
import saveAllocation from '@salesforce/apex/ganttChart.saveAllocation';
import deleteAllocation from '@salesforce/apex/ganttChart.deleteAllocation';

export default class GanttChartResource extends Element {
    @api isResourceView;
    @api projectId;
    @api
    get resource() {
        return this._resource;
    }
    set resource(_resource) {
        this._resource = _resource;
        this.setProjects();
    }
    
    @api
    get startDate() {
        return this._startDate;
    }
    set startDate(_startDate) {
        this._startDate = _startDate;
        this.setTimes();
    }
    
    @api
    get endDate() {
        return this._endDate;
    }
    set endDate(_endDate) {
        this._endDate = _endDate;
        this.setTimes();
    }

    @api
    applyFilters(_filterData) {
        this.projects.forEach(project => {
            project.filtered = _filterData.projects.length;

            if (_filterData.projects.length) {
                _filterData.projects.forEach(p => {
                    if (p.id === project.id) {
                        project.filtered = false;
                    }
                });
            }

            project.allocations.forEach(allocation => {
                var matchRole = !_filterData.roles.length;
                var matchStatus = !_filterData.status;

                if (_filterData.roles.length) {
                    _filterData.roles.forEach(role => {
                        if (role === allocation.Role__c) {
                            matchRole = true;
                        }
                    });
                }

                if (_filterData.status) {
                    matchStatus = allocation.Status__c === _filterData.status;
                }
                
                allocation.filtered = !matchRole || !matchStatus;
            });
        });
    }

    @api 
    closeAllocationMenu() {
        if (this.menuData.open) {
            this.menuData.show = true;
            this.menuData.open = false;
        } else {
            this.menuData.show = false;
            this.menuData.open = false;
        }
    }

    @track addAllocationData = {};
    @track editAllocationData = {};
    @track menuData = {
        open: false,
        show: false,
        style: ''
    };
    @track projects = [];
    effortOptions = [{
        label: 'Low',
        value: 'Low'
    }, {
        label: 'Medium',
        value: 'Medium'
    }, {
        label: 'High',
        value: 'High'
    }];
    statusOptions = [{
        label: 'Active',
        value: 'Active'
    }, {
        label: 'Hold',
        value: 'Hold'
    }, {
        label: 'Unavailable',
        value: 'Unavailable'
    }];

    connectedCallback() {
        this.setProjects();
        this.menuData = {
            show: false,
            style: ''
        };
    }

    calcClass(allocation) {
        var classes = [
            'slds-is-absolute',
            'allocation'
        ];

        switch(allocation.Status__c) {
            case 'Hold':
                classes.push('hold');
                break;
            case 'Unavailable':
                classes.push('unavailable');
                break;
            default:
                break;
        }

        switch(allocation.Effort__c) {
            case 'Low':
                classes.push('low-effort');
                break;
            case 'Medium':
                classes.push('medium-effort');
                break;
            case 'High':
                classes.push('high-effort');
                break;
            default:
                break;
        }

        return classes.join(' ');
    }
    calcStyle(allocation) {
        const backgroundColor = allocation.Project__r.Color__c
        const colorMap = {
            Blue: '#1589ee',
            Green: '#4AAD59',
            Red: '#E52D34',
            Turqoise: '#0DBCB9',
            Navy: '#052F5F', 
            Orange: '#E56532',
            Purple: '#62548E',
            Pink: '#CA7CCE', 
            Brown: '#823E17',
            Lime: '#7CCC47',
            Gold: '#FCAF32'
        };
        const oneDay = 24*60*60*1000;
        const totalDays = Math.round((this.endDate - this.startDate + oneDay) / oneDay);
        const left = Math.round((new Date(allocation.Start_Date__c + 'T00:00:00') - this.startDate) / oneDay) / totalDays * 100 + '%';
        const right = Math.round((this.endDate - new Date(allocation.End_Date__c + 'T00:00:00')) / oneDay) / totalDays * 100 + '%';

        var styles = [
            'left: ' + left,
            'right: ' + right
        ];

        if ('Unavailable' !== allocation.Status__c) {
            styles.push('background-color: ' + colorMap[backgroundColor]);
        }

        if (this.isDragging) {
            styles.push('pointer-events: none');
        } else {
            styles.push('pointer-events: auto');
        }

        return styles.join('; ');
    }

    setProjects() {
        var self = this;
        self.projects = [];

        Object.keys(self.resource.allocationsByProject).forEach(projectId => {
            var project = {
                id: projectId,
                allocations: []
            };

            self.resource.allocationsByProject[projectId].forEach(allocation => {
                allocation.class = self.calcClass(allocation);
                allocation.style = self.calcStyle(allocation);

                project.allocations.push(allocation);
            });

            self.projects.push(project);
        });
    }

    setTimes() {
        if (this._startDate && this._endDate) {
            var _times = [];
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            today = today.getTime();

            for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
                var time = {
                    class: 'slds-col timeslot',
                    value: date.getTime()
                };

                if (time.value === today) {
                    time.class += ' today';
                }

                _times.push(time);
            }

            this.times = _times;
        }
    }

    handleTimeslotClick(event) {
        const myDate = new Date(parseInt(event.currentTarget.dataset.time, 10));
        var dateUTC = myDate.getTime() + myDate.getTimezoneOffset() * 60 * 1000;

        if (this.projectId) {
            this._saveAllocation({
                startDate: dateUTC + '',
                endDate: dateUTC + ''
            });
        } else {
            var self = this;
            getProjects()
                .then(projects => {
                    self.addAllocationData = {
                        projects: projects.map(project => {
                            return {
                                value: project.Id,
                                label: project.Name
                            };
                        }),
                        role: self.resource.Default_Role__c,
                        disabled: true,
                        startDate: dateUTC + '',
                        endDate: dateUTC + ''
                    };
                    self.template.querySelector('#add-allocation-modal').show();
                }).catch(error => {
                    showToast({
                        message: error.message,
                        variant: 'error'
                    });
                });
        }
    }

    handleAddAllocationDataChange(event) {
        this.addAllocationData[event.target.dataset.field] = event.target.value;

        if (!this.addAllocationData.projectId || !this.addAllocationData.role) {
            this.addAllocationData.disabled = true;
        } else {
            this.addAllocationData.disabled = false;
        }
    }

    addAllocationModalSuccess() {
        this._saveAllocation({
            projectId: this.addAllocationData.projectId,
            role: this.addAllocationData.role,
            startDate: this.addAllocationData.startDate,
            endDate: this.addAllocationData.endDate
        }).then(() => {
            this.template.querySelector('#add-allocation-modal').hide();
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }

    _saveAllocation(allocation) {
        if (null == allocation.projectId && null != this.projectId) {
            allocation.projectId = this.projectId;
        }

        if (null == allocation.resourceId) {
            allocation.resourceId = this.resource.Id;
        }

        if (null == allocation.role) {
            allocation.role = this.resource.Default_Role__c;
        }

        return saveAllocation(allocation)
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

    dragInfo = {};
    isDragging = false;
    handleDragStart(event) {
        var container = this.template.querySelector('#' + event.currentTarget.dataset.id);
        this.dragInfo.projectIndex = container.dataset.project;
        this.dragInfo.allocationIndex = container.dataset.allocation;
        this.dragInfo.newAllocation = this.projects[container.dataset.project].allocations[container.dataset.allocation];

        this.isDragging = true;

        // hide drag image
        container.style.opacity = 0;
        setTimeout(function () {
            container.style.opacity = 1;
            container.style.pointerEvents = 'none';
        }, 0);
    }

    handleLeftDragStart(event) {
        this.dragInfo.direction = 'left';
        this.handleDragStart(event);
    }

    handleRightDragStart(event) {
        this.dragInfo.direction = 'right';
        this.handleDragStart(event);
    }

    handleDragEnd(event) {
        event.preventDefault();

        const projectIndex = this.dragInfo.projectIndex;
        const allocationIndex = this.dragInfo.allocationIndex;
        const allocation = this.dragInfo.newAllocation;

        this.projects = JSON.parse(JSON.stringify(this.projects));
        this.projects[projectIndex].allocations[allocationIndex] = allocation;

        var startDate = new Date(allocation.Start_Date__c + 'T00:00:00');
        var endDate = new Date(allocation.End_Date__c + 'T00:00:00');

        this._saveAllocation({
            allocationId: allocation.Id,
            startDate: startDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000 + '',
            endDate: endDate.getTime() + endDate.getTimezoneOffset() * 60 * 1000 + ''
        });

        this.dragInfo = {};
        this.isDragging = false;
        this.template.querySelector('#' + allocation.Id).style.pointerEvents = 'auto';
    }

    handleDragEnter(event) {
        const projectIndex = this.dragInfo.projectIndex;
        const allocationIndex = this.dragInfo.allocationIndex;
        const direction = this.dragInfo.direction;
        const myDate = new Date(parseInt(event.currentTarget.dataset.time, 10));

        if (!this.dragInfo.startTime) {
            this.dragInfo.startTime = myDate;
        }

        var allocation = JSON.parse(JSON.stringify(this.projects[projectIndex].allocations[allocationIndex]));
        var deltaDate = Math.trunc((myDate - this.dragInfo.startTime) / 1000 / 60 / 60 / 24);
        var startDate = new Date(allocation.Start_Date__c + 'T00:00:00')
        var newStartDate = new Date(startDate);
        newStartDate.setDate(startDate.getDate() + deltaDate);
        var endDate = new Date(allocation.End_Date__c + 'T00:00:00');
        var newEndDate = new Date(endDate);
        newEndDate.setDate(endDate.getDate() + deltaDate);

        switch (direction) {
            case 'left':
                if (newStartDate <= endDate) {
                    allocation.Start_Date__c = newStartDate.toJSON().substr(0, 10);
                }
                break;
            case 'right':
                if (newEndDate >= startDate) {
                    allocation.End_Date__c = newEndDate.toJSON().substr(0, 10);
                }
                break;
            default:
                allocation.Start_Date__c = newStartDate.toJSON().substr(0, 10);
                allocation.End_Date__c = newEndDate.toJSON().substr(0, 10);

        }

        this.dragInfo.newAllocation = allocation;
        this.template.querySelector('#' + allocation.Id).style = this.calcStyle(allocation);
    }

    openAllocationMenu(event) {
        var container = this.template.querySelector('#' + event.currentTarget.dataset.id);
        var allocation = this.projects[container.dataset.project].allocations[container.dataset.allocation];
        
        if (this.menuData.allocation && this.menuData.allocation.Id === allocation.Id) {
            this.closeAllocationMenu();
        } else {
            this.menuData.open = true;
        
            var projectHeight = this.template.querySelector('.project-container').getBoundingClientRect().height;
            var allocationHeight = this.template.querySelector('.allocation').getBoundingClientRect().height;
            var rightEdge = (this.endDate - new Date(allocation.End_Date__c + 'T00:00:00')) / (this.endDate - this.startDate + 24 * 60 * 60 * 1000) * 100 + '%';
            var topEdge = projectHeight * container.dataset.project + allocationHeight;
        
            this.menuData.allocation = Object.assign({}, allocation);
            this.menuData.style = 'top: ' + topEdge + 'px; right: ' + rightEdge + '; left: unset';
        }
    }

    handleModalEditClick(event) {
        this.editAllocationData = {
            resourceName: this.menuData.allocation.Resource__r.Name,
            projectName: this.menuData.allocation.Project__r.Name,
            id: this.menuData.allocation.Id,
            startDate: this.menuData.allocation.Start_Date__c,
            endDate: this.menuData.allocation.End_Date__c,
            role: this.menuData.allocation.Role__c,
            effort: this.menuData.allocation.Effort__c,
            status: this.menuData.allocation.Status__c,
            disabled: false
        };
        this.template.querySelector('#edit-allocation-modal').show();

        this.closeAllocationMenu();
    }

    handleEditAllocationDataChange(event) {
        this.editAllocationData[event.target.dataset.field] = event.target.value;

        if (!this.editAllocationData.role || !this.editAllocationData.startDate || !this.editAllocationData.endDate) {
            this.editAllocationData.disabled = true;
        } else {
            this.editAllocationData.disabled = false;
        }
    }

    editAllocationModalSuccess() {
        const startDate = new Date(this.editAllocationData.startDate + 'T00:00:00');
        const endDate = new Date(this.editAllocationData.endDate + 'T00:00:00');
        
        this._saveAllocation({
            allocationId: this.editAllocationData.id,
            startDate: startDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000 + '',
            endDate: endDate.getTime() + startDate.getTimezoneOffset() * 60 * 1000 + '',
            role: this.editAllocationData.role,
            effort: this.editAllocationData.effort,
            status: this.editAllocationData.status
        }).then(() => {
            this.editAllocationData = {};
            this.template.querySelector('#edit-allocation-modal').hide();
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }

    handleMenuDeleteClick(event) {
        this.template.querySelector('#delete-modal').show();
        this.closeAllocationMenu();
    }

    handleMenuDeleteSuccess() {
        deleteAllocation({
            allocationId: this.menuData.allocation.Id
        }).then(() => {
            this.dispatchEvent(new CustomEvent('refresh', {
                bubbles: true,
                composed: true
            }));

            this.template.querySelector('#delete-modal').hide();
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }
}
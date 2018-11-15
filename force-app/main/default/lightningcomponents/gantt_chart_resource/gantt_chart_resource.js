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

    @api startDate;
    @api endDate;
    @api dateIncrement;

    @api
    refreshDates(startDate, endDate, dateIncrement) {
        if (startDate && endDate && dateIncrement) {
            var times = [];
            var today = new Date();
            today.setHours(0, 0, 0, 0);
            today = today.getTime();

            for (var date = new Date(startDate); date <= endDate; date.setDate(date.getDate() + dateIncrement)) {
                var time = {
                    class: 'slds-col timeslot',
                    start: date.getTime()
                };

                if (dateIncrement > 1) {
                    var end = new Date(date);
                    end.setDate(end.getDate() + dateIncrement - 1);
                    time.end = end.getTime();
                } else {
                    time.end = date.getTime();
                }

                if (today >= time.start && today <= time.end) {
                    time.class += ' today';
                }

                times.push(time);
            }

            this.times = times;
            this.startDate = startDate;
            this.endDate = endDate;
            this.dateIncrement = dateIncrement;
            this.setProjects();
        }
    }

    @api
    applyFilters(_filterData) {
        var resource = JSON.parse(JSON.stringify(this._resource));
        resource.filtered = !_filterData.roles.length;

        if (_filterData.roles.length) {
            _filterData.roles.forEach(r => {
                if (r === resource.Default_Role__c) {
                    resource.filtered = false;
                }
            });
        }
        this._resource = resource;

        var projects = JSON.parse(JSON.stringify(this.projects));
        projects.forEach(project => {
            project.filtered = _filterData.projects.length;

            if (_filterData.projects.length) {
                _filterData.projects.forEach(p => {
                    if (p.id === project.id) {
                        project.filtered = false;
                    }
                });
            }

            project.allocations.forEach(allocation => {
                allocation.filtered = !_filterData.status;

                if (_filterData.status) {
                    allocation.filtered = allocation.Status__c !== _filterData.status;
                }
            });
        });
        this.projects = projects;
    }

    @api
    closeAllocationMenu() {
        if (this.menuData.open) {
            this.menuData.show = true;
            this.menuData.open = false;
        } else {
            this.menuData = {
                show: false,
                open: false
            };
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
        this.refreshDates(this.startDate, this.endDate, this.dateIncrement);
    }

    calcClass(allocation) {
        var classes = [
            'slds-is-absolute',
            'allocation'
        ];

        switch (allocation.Status__c) {
            case 'Unavailable':
                classes.push('unavailable');
                break;
            case 'Hold':
                classes.push('hold');
                break;
            default:
                break;
        }

        if ('Unavailable' !== allocation.Status__c) {
            switch (allocation.Effort__c) {
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
        }

        return classes.join(' ');
    }
    calcStyle(allocation) {
        if (!this.times) {
            return;
        }

        const totalSlots = this.times.length;
        var styles = [
            'left: ' + allocation.left / totalSlots * 100 + '%',
            'right: ' + (totalSlots - (allocation.right + 1)) / totalSlots * 100 + '%'
        ];

        if ('Unavailable' !== allocation.Status__c) {
            const backgroundColor = allocation.color
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

    handleTimeslotClick(event) {
        const start = new Date(parseInt(event.currentTarget.dataset.start, 10));
        const end = new Date(parseInt(event.currentTarget.dataset.end, 10));
        const startUTC = start.getTime() + start.getTimezoneOffset() * 60 * 1000;
        const endUTC = end.getTime() + end.getTimezoneOffset() * 60 * 1000;

        if (this.projectId) {
            this._saveAllocation({
                startDate: startUTC + '',
                endDate: endUTC + ''
            });
        } else {
            var self = this;
            getProjects()
                .then(projects => {
                    projects = projects.map(project => {
                        return {
                            value: project.Id,
                            label: project.Name
                        };
                    });

                    projects.unshift({
                        value: 'Unavailable',
                        label: 'Unavailable'
                    });

                    self.addAllocationData = {
                        projects: projects,
                        startDate: startUTC + '',
                        endDate: endUTC + '',
                        disabled: true
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

        if (!this.addAllocationData.projectId) {
            this.addAllocationData.disabled = true;
        } else {
            this.addAllocationData.disabled = false;
        }
    }

    addAllocationModalSuccess() {
        if ('Unavailable' === this.addAllocationData.projectId) {
            this.addAllocationData.projectId = null;
            this.addAllocationData.status = 'Unavailable';
        }

        this._saveAllocation({
            projectId: this.addAllocationData.projectId,
            status: this.addAllocationData.status,
            startDate: this.addAllocationData.startDate,
            endDate: this.addAllocationData.endDate
        }).then(() => {
            this.addAllocationData = {};
            this.template.querySelector('#add-allocation-modal').hide();
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }

    _saveAllocation(allocation) {
        if (null == allocation.projectId && null != this.projectId && !allocation.status) {
            allocation.projectId = this.projectId;
        }

        if (null == allocation.resourceId) {
            allocation.resourceId = this.resource.Id;
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
        const start = new Date(parseInt(event.currentTarget.dataset.start, 10));
        const end = new Date(parseInt(event.currentTarget.dataset.end, 10));
        const index = parseInt(event.currentTarget.dataset.index, 10);

        if (!this.dragInfo.startIndex) {
            this.dragInfo.startIndex = index;
        }

        var allocation = JSON.parse(JSON.stringify(this.projects[projectIndex].allocations[allocationIndex]));
        const totalSlots = this.times.length;

        switch (direction) {
            case 'left':
                if (index <= allocation.right) {
                    allocation.Start_Date__c = start.toJSON().substr(0, 10);
                    allocation.left = index;
                } else {
                    allocation = this.dragInfo.newAllocation
                }
                break;
            case 'right':
                if (index >= allocation.left) {
                    allocation.End_Date__c = end.toJSON().substr(0, 10);
                    allocation.right = index;
                } else {
                    allocation = this.dragInfo.newAllocation
                }
                break;
            default:
                var deltaIndex = index - this.dragInfo.startIndex;
                allocation.left = allocation.left + deltaIndex;
                allocation.right = allocation.right + deltaIndex;
                allocation.Start_Date__c = new Date(this.times[allocation.left].start).toJSON().substr(0, 10);
                allocation.End_Date__c = new Date(this.times[allocation.right].end).toJSON().substr(0, 10);

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
            id: this.menuData.allocation.Id,
            startDate: this.menuData.allocation.Start_Date__c,
            endDate: this.menuData.allocation.End_Date__c,
            effort: this.menuData.allocation.Effort__c,
            status: this.menuData.allocation.Status__c,
            disabled: false
        };
        this.template.querySelector('#edit-allocation-modal').show();

        this.closeAllocationMenu();
    }

    handleEditAllocationDataChange(event) {
        this.editAllocationData[event.target.dataset.field] = event.target.value;

        if (!this.editAllocationData.startDate || !this.editAllocationData.endDate) {
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
            projectId: this.editAllocationData.projectId,
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
        this.editAllocationData = {
            id: this.menuData.allocation.Id,
        };
        this.template.querySelector('#delete-modal').show();
        this.closeAllocationMenu();
    }

    handleMenuDeleteSuccess() {
        deleteAllocation({
            allocationId: this.editAllocationData.id
        }).then(() => {
            this.template.querySelector('#delete-modal').hide();
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
import {
    Element,
    api,
    track
} from 'engine';
import {
    NavigationMixin
} from 'lightning-navigation';
import {
    showToast
} from 'lightning-notifications-library';

import getProjects from '@salesforce/apex/ganttChart.getProjects';
import saveAllocation from '@salesforce/apex/ganttChart.saveAllocation';
import deleteAllocation from '@salesforce/apex/ganttChart.deleteAllocation';

import tmpl from './gantt_chart_resource.html';

export default class GanttChartResource extends NavigationMixin(Element) {
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

    @track addAllocationData = {};
    @track menuData = {
        show: false,
        style: ''
    };
    @track projects;
    
    connectedCallback() {
        this.setProjects();
        this.menuData = {
            show: false,
            style: ''
        };
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

        var style = [
            'background-color: ' + colorMap[backgroundColor],
            'left: ' + left,
            'right: ' + right
        ];

        if (this.isDragging) {
            style.push('pointer-events: none');
        } else {
            style.push('pointer-events: auto');
        }

        return style.join('; ');
    }

    setProjects() {
        var self = this;
        this.projects = Object.values(self.resource.allocationsByProject);

        this.projects.forEach(function (allocations) {
            allocations.forEach(function (allocation) {
                allocation.style = self.calcStyle(allocation);
            });
        });

        // empty space at bottom
        this.projects.push([]);
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
            // CAN WE PREVENT REDIRECT TO NEW RECORD
            // CAN WE SET DEFAULT VALUES
            // this[NavigationMixin.Navigate]({
            //     type: 'standard__objectPage',
            //     attributes: {
            //         objectApiName: 'Allocation__c',
            //         actionName: 'new'
            //     }
            // });

            var self = this;
            getProjects()
                .then(projects => {
                    self.addAllocationData = {
                        projects: projects,
                        role: self.resource.Default_Role__c,
                        disabled: true,
                        startDate: dateUTC + '',
                        endDate: dateUTC + ''
                    };
                    self.template.querySelector('#allocation-modal').show();
                }).catch(error => {
                    showToast({
                        message: error.message,
                        variant: 'error'
                    });
                });
        }
    }

    handleProjectSelect(event) {
        this.addAllocationData.projectId = event.target.value;

        this.validateAddAllocationData();
    }

    handleRoleChange(event) {
        this.addAllocationData.role = event.target.value;

        this.validateAddAllocationData();
    }

    validateAddAllocationData() {
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
            this.template.querySelector('#allocation-modal').hide();
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
        this.dragInfo.newAllocation = this.projects[container.dataset.project][container.dataset.allocation];

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
        this.projects[projectIndex][allocationIndex] = allocation;

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

        var allocation = JSON.parse(JSON.stringify(this.projects[projectIndex][allocationIndex]));
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
        var allocation = this.projects[container.dataset.project][container.dataset.allocation];
        var projectHeight = this.template.querySelector('.project-container').getBoundingClientRect().height;
        var allocationHeight = this.template.querySelector('.allocation').getBoundingClientRect().height;
        var rightEdge = (this.endDate - new Date(allocation.End_Date__c + 'T00:00:00')) / (this.endDate - this.startDate + 24 * 60 * 60 * 1000) * 100 + '%';
        var topEdge = projectHeight * container.dataset.project + allocationHeight;

        this.menuData.allocationId = event.currentTarget.dataset.id;
        this.menuData.style = 'top: ' + topEdge + 'px; right: ' + rightEdge + '; left: unset';
        this.menuData.show = true;
    }

    handleModalEditClick(event) {
        var recordId = event.currentTarget.dataset.id;

        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                actionName: 'edit'
            }
        });

        this.closeAllocationMenu();
    }

    handleMenuDeleteClick(event) {
        this.template.querySelector('#delete-modal').show();
        this.closeAllocationMenu();
    }

    handleMenuDeleteSuccess() {
        deleteAllocation({
            allocationId: this.menuData.allocationId
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

    closeAllocationMenu() {
        this.menuData.show = false;
    }

    render() {
        return tmpl;
    }
}
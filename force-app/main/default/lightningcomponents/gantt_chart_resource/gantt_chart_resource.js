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

export default class GanttChartResource extends Element {
    @api resource
    @api projectId;
    @api startDate;
    @api endDate;

    @track projects;
    @track modalData = {
        show: false
    };
    @track actionMenuOpen = false;
    @track actionMenuPosition;
    
    get times() {
        var _times = [];

        for (var date = new Date(this.startDate); date <= this.endDate; date.setDate(date.getDate() + 1)) {
            _times.push(date.getTime());
        }

        return _times;
    }

    get link() {
        return '/' + this.resource.id;
    }

    connectedCallback() {
        var self = this;
        this.projects = Object.values(self.resource.allocationsByProject);

        this.projects.forEach(function (allocations) {
            allocations.forEach(function (allocation) {
                allocation.style = self.calcStyle(allocation);
            });
        });
    }

    calcStyle(allocation) {
        var backgroundColor = allocation.Project__r.Color__c
        var left = (new Date(allocation.Start_Date__c + 'T00:00:00') - this.startDate) / (this.endDate - this.startDate + 24 * 60 * 60 * 1000) * 100 + '%';
        var right = (this.endDate - new Date(allocation.End_Date__c + 'T00:00:00')) / (this.endDate - this.startDate + 24 * 60 * 60 * 1000) * 100 + '%';

        var style = [
            'background-color: ' + backgroundColor,
            'left: ' + left,
            'right: ' + right
        ];

        if (this.isDragging) {
            style.push('pointer-events: none;');
        } else {
            style.push('pointer-events: auto;');
        }

        return style.join('; ');
    }

    handleClick(event) {
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
                .then((projects) => {
                    self.modalData = {
                        projects: projects,
                        show: true,
                        disabled: true,
                        startDate: dateUTC + '',
                        endDate: dateUTC + ''
                    };
                }).catch((error) => {
                    showToast({
                        message: error.message,
                        variant: 'error'
                    });
                });
            
        }
    }

    selectProject(event) {
        this.modalData.projectId = event.target.value;

        if (this.modalData.projectId) {
            this.modalData.disabled = false;
        }
    }

    addAllocation() {
        this._saveAllocation({
            projectId: this.modalData.projectId,
            startDate: this.modalData.startDate,
            endDate: this.modalData.endDate
        }).then(() => {
            this.hideModal();
        });
    }

    hideModal() {
        this.modalData = { show: false };
    }

    handleSaveAllocation(event) {

    }

    _saveAllocation(allocation) {
        if (null == allocation.projectId && null != this.projectId) {
            allocation.projectId = this.projectId;
        }

        if (null == allocation.resourceId) {
            allocation.resourceId = this.resource.id;
        }

        if (null == allocation.role) {
            allocation.role = this.resource.primaryAllocation.Role__c;
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

    handleActionsClick(event) {
        var container = this.template.querySelector('#' + event.currentTarget.dataset.id);
        var allocation = this.projects[container.dataset.project][container.dataset.allocation];
        var allocationHeight = this.template.querySelector('.allocation').getBoundingClientRect().height;
        var rightEdge = (this.endDate - new Date(allocation.End_Date__c + 'T00:00:00')) / (this.endDate - this.startDate + 24 * 60 * 60 * 1000) * 100 + '%';

        this.actionMenuPosition = 'top: ' + allocationHeight + 'px; right: ' + rightEdge + '; left: unset';
        this.actionMenuOpen = true;
    }
}
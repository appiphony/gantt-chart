import { Element, api, track, wire } from 'engine';
import { showToast } from 'lightning-notifications-library';

import getChartData from '@salesforce/apex/ganttChart.getChartData';
import getResources from '@salesforce/apex/ganttChart.getResources';

export default class GanttChart extends Element {
    @api recordId;
    @api days = 14;
    
    @track chartResources = [];
    @track projectId;
    @track resources = [];
    @track showResourceModal = false;
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

    connectedCallback() {
        // workaround for bug (W-4610385)
        this._startDate = new Date();
        this._startDate.setHours(0,0,0,0);
        this._startDate = new Date(this.startDate.getTime() - this.startDate.getDay() * 24*60*60*1000);

        this.startDate = this._startDate;
        this.startDateUTC = this.startDate.getTime() + this.startDate.getTimezoneOffset() * 60 * 1000 + '';
        this.days = 14;
        this.endDateUTC = this.endDate.getTime() + this.endDate.getTimezoneOffset() * 60 * 1000 + '';
        
    }

    @wire(getChartData, { recordId: '$recordId', startDate: '$startDateUTC', endDate: '$endDateUTC' })
    wiredGetChartData(value) {
        if (value.error) {
            showToast({
                message: value.error,
                variant: 'error'
            });
        }
        if (value.data) {
            this.projectId = value.data.projectId;
            this.chartResources = value.data.resources;
        }
    }

    openAddResourceModal() {
        getResources()
        .then(resources => {
            this.resources = resources;
            this.showResourceModal = true;
        }).catch(error => {
            showToast({
                message: error.message,
                variant: 'error'
            });
        });
    }
}
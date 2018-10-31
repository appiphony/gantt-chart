import { Element, api } from 'engine';

export default class GanttChartTimeslot extends Element {
    @api date;
    @api resource;
    @api projectSize = 0;
    @api startDate;
    @api endDate;

    get style() {
        return [
            'height: ' + (this.projectSize + 1) * 25 + 'px;',
        ].join(' ');
    }
}

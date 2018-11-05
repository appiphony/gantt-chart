import {
    Element,
    api,
    track
} from "engine";

export default class GanttChartModal extends Element {
    @track title;
    @track body;
    @track success = {
        variant: 'brand'
    };

    @api
    show() {
        this.template.querySelector('#modal').classList.remove('slds-hide');
    }
    @api
    hide() {
        this.template.querySelector('#modal').classList.add('slds-hide');
    }
}
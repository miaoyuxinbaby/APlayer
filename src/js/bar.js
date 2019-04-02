class Bar {
    constructor (template) {
        this.elements = {};
        this.elements.volume = template.volume;
        // 已播放的进度
        this.elements.played = template.played;
        // 已加载的进度
        this.elements.loaded = template.loaded;
    }

    /**
     * Update progress
     *
     * @param {String} type - Point out which bar it is
     * @param {Number} percentage
     * @param {String} direction - Point out the direction of this bar, Should be height or width
     */
    set (type, percentage, direction) {
        // 三种进度都是进度条，百分比形式控制
        percentage = Math.max(percentage, 0);
        percentage = Math.min(percentage, 1);
        this.elements[type].style[direction] = percentage * 100 + '%';
    }

    get (type, direction) {
        return parseFloat(this.elements[type].style[direction]) / 100;
    }
}

export default Bar;
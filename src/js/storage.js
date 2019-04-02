import utils from './utils';

class Storage {
    constructor (player) {
        // 本地存储的 key
        this.storageName = player.options.storageName;

        this.data = JSON.parse(utils.storage.get(this.storageName));
        if (!this.data) {
            this.data = {};
        }
        // 目前只存了音量这一个内容
        this.data.volume = this.data.volume || player.options.volume;
    }

    // 暴露存取的 api
    get (key) {
        return this.data[key];
    }

    set (key, value) {
        this.data[key] = value;
        utils.storage.set(this.storageName, JSON.stringify(this.data));
    }
}

export default Storage;
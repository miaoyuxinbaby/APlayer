class Events {
    constructor () {
        this.events = {};

        // 将原生事件和 player 的自定义事件区分开
        this.audioEvents = [
            'abort', 'canplay', 'canplaythrough', 'durationchange', 'emptied', 'ended', 'error',
            'loadeddata', 'loadedmetadata', 'loadstart', 'mozaudioavailable', 'pause', 'play',
            'playing', 'progress', 'ratechange', 'seeked', 'seeking', 'stalled', 'suspend',
            'timeupdate', 'volumechange', 'waiting'
        ];
        this.playerEvents = [
            'destroy',
            'listshow', 'listhide', 'listadd', 'listremove', 'listswitch', 'listclear',
            'noticeshow', 'noticehide',
            'lrcshow', 'lrchide',
        ];
    }

    on (name, callback) {
        // 如果没有找到对应的事件，则 type 返回值为 null
        if (this.type(name) && typeof callback === 'function') {
            if (!this.events[name]) {
                this.events[name] = [];
            }
            this.events[name].push(callback);
        }
    }

    trigger (name, data) {
        if (this.events[name] && this.events[name].length) {
            for (let i = 0; i < this.events[name].length; i++) {
                this.events[name][i](data);
            }
        }
    }

    type (name) {
        if (this.playerEvents.indexOf(name) !== -1) {
            return 'player';
        }
        else if (this.audioEvents.indexOf(name) !== -1) {
            return 'audio';
        }

        console.error(`Unknown event name: ${name}`);
        return null;
    }
}

export default Events;

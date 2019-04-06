import Promise from 'promise-polyfill';

import utils from './utils';
import Icons from './icons';
import handleOption from './options';
import Template from './template';
import Bar from './bar';
import Storage from './storage';
import Lrc from './lrc';
import Controller from './controller';
import Timer from './timer';
import Events from './events';
import List from './list';

const instances = [];

class APlayer {

    /**
     * APlayer constructor function
     *
     * @param {Object} options - See README
     * @constructor
     */
    constructor (options) {
        // 序列号 options
        this.options = handleOption(options);
        // 用户指定的容器 dom
        this.container = this.options.container;
        // 播放器 播放状态 isPaused
        this.paused = true;
        // 这是啥。。。可能是预留的api，但文档中没有相关描述并且，感觉没啥用。因为播放完毕肯定有监听事件，直接写在里面就 ok 了
        this.playedPromise = Promise.resolve();
        // 播放器模式，normal fixed mini 三种
        this.mode = 'normal';

        // 洗牌算法 获取一个随机播放列表
        this.randomOrder = utils.randomOrder(this.options.audio.length);

        // 根据对应配置项，为容器dom添加对应的样式
        this.container.classList.add('aplayer');
        if (this.options.lrcType && !this.options.fixed) {
            this.container.classList.add('aplayer-withlrc');
        }
        if (this.options.audio.length > 1) {
            this.container.classList.add('aplayer-withlist');
        }
        if (utils.isMobile) {
            this.container.classList.add('aplayer-mobile');
        }
        this.arrow = this.container.offsetWidth <= 300;
        if (this.arrow) {
            this.container.classList.add('aplayer-arrow');
        }

        // save lrc
        this.container = this.options.container;
        if (this.options.lrcType === 2 || this.options.lrcType === true) {
            const lrcEle = this.container.getElementsByClassName('aplayer-lrc-content');
            for (let i = 0; i < lrcEle.length; i++) {
                if (this.options.audio[i]) {
                    this.options.audio[i].lrc = lrcEle[i].innerHTML;
                }
            }
        }

        // new dom 实例
        this.template = new Template({
            container: this.container,
            options: this.options,
            randomOrder: this.randomOrder,
        });

        // 添加 fixed 模式的样式
        if (this.options.fixed) {
            this.container.classList.add('aplayer-fixed');
            this.template.body.style.width = this.template.body.offsetWidth - 18 + 'px';
        }
        // 添加 mini 模式的样式
        if (this.options.mini) {
            this.setMode('mini');
            this.template.info.style.display = 'block';
        }
        // 歌曲信息栏的宽度如果小于200，更换样式
        if (this.template.info.offsetWidth < 200) {
            this.template.time.classList.add('aplayer-time-narrow');
        }

        // new 歌词
        if (this.options.lrcType) {
            this.lrc = new Lrc({
                container: this.template.lrc,
                async: this.options.lrcType === 3,
                player: this,
            });
        }
        // 初始化事件
        this.events = new Events();
        // 本地存储初始化
        this.storage = new Storage(this);
        // 进度条
        this.bar = new Bar(this.template);
        // 操作栏
        this.controller = new Controller(this);
        // 缓冲检测
        this.timer = new Timer(this);
        // 播放列表
        this.list = new List(this);

        // 这里才执行 initAudio，所以我认为，new Controller中 initVolumeButton 中的音量设置是无效的。
        this.initAudio();
        // 绑定事件
        this.bindEvents();
        if (this.options.order === 'random') {
            this.list.switch(this.randomOrder[0]);
        }
        else {
            this.list.switch(0);
        }

        // autoplay
        if (this.options.autoplay) {
            this.play();
        }

        instances.push(this);
    }

    initAudio () {
        this.audio = document.createElement('audio');
        this.audio.preload = this.options.preload;

        // 代理绑定对应的事件
        for (let i = 0; i < this.events.audioEvents.length; i++) {
            this.audio.addEventListener(this.events.audioEvents[i], (e) => {
                this.events.trigger(this.events.audioEvents[i], e);
            });
        }

        // 设置初始音量
        this.volume(this.storage.get('volume'), true);
    }
    // 将事件和默认回调绑定
    bindEvents () {
        this.on('play', () => {
            if (this.paused) {
                this.setUIPlaying();
            }
        });

        this.on('pause', () => {
            if (!this.paused) {
                this.setUIPaused();
            }
        });

        // 当播放进度变化时，更新歌词和进度条。
        this.on('timeupdate', () => {
            if (!this.disableTimeupdate) {
                this.bar.set('played', this.audio.currentTime / this.duration, 'width');
                this.lrc && this.lrc.update();
                const currentTime = utils.secondToTime(this.audio.currentTime);
                if (this.template.ptime.innerHTML !== currentTime) {
                    this.template.ptime.innerHTML = currentTime;
                }
            }
        });

        // 歌曲总时长变化时
        // show audio time: the metadata has loaded or changed
        this.on('durationchange', () => {
            if (this.duration !== 1) {           // compatibility: Android browsers will output 1 at first
                this.template.dtime.innerHTML = utils.secondToTime(this.duration);
            }
        });

        // 音频下载进度
        // show audio loaded bar: to inform interested parties of progress downloading the media
        this.on('progress', () => {
            const percentage = this.audio.buffered.length ? this.audio.buffered.end(this.audio.buffered.length - 1) / this.duration : 0;
            this.bar.set('loaded', percentage, 'width');
        });

        // 下载失败
        // audio download error: an error occurs
        let skipTime;
        this.on('error', () => {
            if (this.list.audios.length > 1) {
                this.notice('An audio error has occurred, player will skip forward in 2 seconds.');
                // 重试
                skipTime = setTimeout(() => {
                    this.skipForward();
                    if (!this.paused) {
                        this.play();
                    }
                }, 2000);
            }
            else if (this.list.audios.length === 1) {
                this.notice('An audio error has occurred.');
            }
        });
        // list 切换，当然要删除所有的重试定时器
        this.events.on('listswitch', () => {
            skipTime && clearTimeout(skipTime);
        });

        // 播放结束，根据情况判断怎么做
        // multiple audio play
        this.on('ended', () => {
            // 未开启循环
            if (this.options.loop === 'none') {
                // 列表顺序
                if (this.options.order === 'list') {
                    if (this.list.index < this.list.audios.length - 1) {
                        this.list.switch((this.list.index + 1) % this.list.audios.length);
                        this.play();
                    }
                    else {
                        this.list.switch((this.list.index + 1) % this.list.audios.length);
                        this.pause();
                    }
                }
                // 随机播放
                else if (this.options.order === 'random') {
                    if (this.randomOrder.indexOf(this.list.index) < this.randomOrder.length - 1) {
                        this.list.switch(this.nextIndex());
                        this.play();
                    }
                    else {
                        this.list.switch(this.nextIndex());
                        this.pause();
                    }
                }
            }
            // 单曲循环
            else if (this.options.loop === 'one') {
                this.list.switch(this.list.index);
                this.play();
            }
            // 列表循环
            else if (this.options.loop === 'all') {
                this.skipForward();
                this.play();
            }
        });
    }

    // 切歌的时候用来设置 audio，针对一些格式的音乐做了特殊处理
    setAudio (audio) {
        if (this.hls) {
            this.hls.destroy();
            this.hls = null;
        }
        let type = audio.type;
        if (this.options.customAudioType && this.options.customAudioType[type]) {
            if (Object.prototype.toString.call(this.options.customAudioType[type]) === '[object Function]') {
                this.options.customAudioType[type](this.audio, audio, this);
            }
            else {
                console.error(`Illegal customType: ${type}`);
            }
        }
        else {
            if (!type || type === 'auto') {
                // m3u8后缀的是hls文件
                if (/m3u8(#|\?|$)/i.exec(audio.url)) {
                    type = 'hls';
                }
                else {
                    type = 'normal';
                }
            }
            if (type === 'hls') {
                // hls特殊处理
                if (Hls.isSupported()) {
                    this.hls = new Hls();
                    this.hls.loadSource(audio.url);
                    this.hls.attachMedia(this.audio);
                }
                else if (this.audio.canPlayType('application/x-mpegURL') || this.audio.canPlayType('application/vnd.apple.mpegURL')) {
                    this.audio.src = audio.url;
                }
                else {
                    this.notice('Error: HLS is not supported.');
                }
            }
            else if (type === 'normal') {
                this.audio.src = audio.url;
            }
        }
        this.seek(0);

        if (!this.paused) {
            this.audio.play();
        }
    }

    // 播放器主题设置
    theme (color = this.list.audios[this.list.index].theme || this.options.theme, index = this.list.index, isReset = true) {
        if (isReset) {
            this.list.audios[index] && (this.list.audios[index].theme = color);
        }
        this.template.listCurs[index] && (this.template.listCurs[index].style.backgroundColor = color);
        if (index === this.list.index) {
            this.template.pic.style.backgroundColor = color;
            this.template.played.style.background = color;
            this.template.thumb.style.background = color;
            this.template.volume.style.background = color;
        }
    }

    // 跳转到指定时间播放
    seek (time) {
        time = Math.max(time, 0);
        time = Math.min(time, this.duration);
        this.audio.currentTime = time;
        this.bar.set('played', time / this.duration, 'width');
        this.template.ptime.innerHTML = utils.secondToTime(time);
    }

    get duration () {
        return isNaN(this.audio.duration) ? 0 : this.audio.duration;
    }

    // 控制ui的播放
    setUIPlaying () {
        if (this.paused) {
            this.paused = false;
            this.template.button.classList.remove('aplayer-play');
            this.template.button.classList.add('aplayer-pause');
            this.template.button.innerHTML = '';
            setTimeout(() => {
                this.template.button.innerHTML = Icons.pause;
            }, 100);
            this.template.skipPlayButton.innerHTML = Icons.pause;
        }

        this.timer.enable('loading');

        if (this.options.mutex) {
            for (let i = 0; i < instances.length; i++) {
                if (this !== instances[i]) {
                    instances[i].pause();
                }
            }
        }
    }

    // 播放
    play () {
        this.setUIPlaying();

        const playPromise = this.audio.play();
        if (playPromise) {
            playPromise.catch((e) => {
                console.warn(e);
                if (e.name === 'NotAllowedError') {
                    this.setUIPaused();
                }
            });
        }
    }

    // ui paused
    setUIPaused () {
        if (!this.paused) {
            this.paused = true;

            this.template.button.classList.remove('aplayer-pause');
            this.template.button.classList.add('aplayer-play');
            this.template.button.innerHTML = '';
            setTimeout(() => {
                this.template.button.innerHTML = Icons.play;
            }, 100);
            this.template.skipPlayButton.innerHTML = Icons.play;
        }

        this.container.classList.remove('aplayer-loading');
        this.timer.disable('loading');
    }

    pause () {
        this.setUIPaused();
        this.audio.pause();
    }

    // 音量图标
    switchVolumeIcon () {
        if (this.volume() >= 0.95) {
            this.template.volumeButton.innerHTML = Icons.volumeUp;
        }
        else if (this.volume() > 0) {
            this.template.volumeButton.innerHTML = Icons.volumeDown;
        }
        else {
            this.template.volumeButton.innerHTML = Icons.volumeOff;
        }
    }

    /**
     * Set volume
     * 不传值的时候，是获取音量，禁音则是 0
     */
    volume (percentage, nostorage) {
        percentage = parseFloat(percentage);
        if (!isNaN(percentage)) {
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.bar.set('volume', percentage, 'height');
            if (!nostorage) {
                this.storage.set('volume', percentage);
            }

            this.audio.volume = percentage;
            if (this.audio.muted) {
                this.audio.muted = false;
            }

            this.switchVolumeIcon();
        }

        return this.audio.muted ? 0 : this.audio.volume;
    }

    /**
     * bind events
     */
    on (name, callback) {
        this.events.on(name, callback);
    }

    /**
     * toggle between play and pause
     */
    toggle () {
        if (this.template.button.classList.contains('aplayer-play')) {
            this.play();
        }
        else if (this.template.button.classList.contains('aplayer-pause')) {
            this.pause();
        }
    }

    // abandoned
    switchAudio (index) {
        this.list.switch(index);
    }

    // abandoned
    addAudio (audios) {
        this.list.add(audios);
    }

    // abandoned
    removeAudio (index) {
        this.list.remove(index);
    }

    /**
     * destroy this player
     */
    destroy () {
        instances.splice(instances.indexOf(this), 1);
        this.pause();
        this.container.innerHTML = '';
        this.audio.src = '';
        this.timer.destroy();
        this.events.trigger('destroy');
    }

    // 改变 mode 的 api
    setMode (mode = 'normal') {
        this.mode = mode;
        if (mode === 'mini') {
            this.container.classList.add('aplayer-narrow');
        }
        else if (mode === 'normal') {
            this.container.classList.remove('aplayer-narrow');
        }
    }

    // 弹框提示
    notice (text, time = 2000, opacity = 0.8) {
        this.template.notice.innerHTML = text;
        this.template.notice.style.opacity = opacity;
        if (this.noticeTime) {
            clearTimeout(this.noticeTime);
        }
        this.events.trigger('noticeshow', {
            text: text,
        });
        if (time) {
            this.noticeTime = setTimeout(() => {
                this.template.notice.style.opacity = 0;
                this.events.trigger('noticehide');
            }, time);
        }
    }

    // 获取上一首的index
    prevIndex () {
        if (this.list.audios.length > 1) {
            if (this.options.order === 'list') {
                return this.list.index - 1 < 0 ? this.list.audios.length - 1 : this.list.index - 1;
            }
            else if (this.options.order === 'random') {
                const index = this.randomOrder.indexOf(this.list.index);
                if (index === 0) {
                    return this.randomOrder[this.randomOrder.length - 1];
                }
                else {
                    return this.randomOrder[index - 1];
                }
            }
        }
        else {
            return 0;
        }
    }

    // 获取下一首的index
    nextIndex () {
        if (this.list.audios.length > 1) {
            if (this.options.order === 'list') {
                return (this.list.index + 1) % this.list.audios.length;
            }
            else if (this.options.order === 'random') {
                const index = this.randomOrder.indexOf(this.list.index);
                if (index === this.randomOrder.length - 1) {
                    return this.randomOrder[0];
                }
                else {
                    return this.randomOrder[index + 1];
                }
            }
        }
        else {
            return 0;
        }
    }

    // 封装的上一首下一首api
    skipBack () {
        this.list.switch(this.prevIndex());
    }

    skipForward () {
        this.list.switch(this.nextIndex());
    }

    // 版本
    static get version () {
        /* global APLAYER_VERSION */
        return APLAYER_VERSION;
    }
}

export default APlayer;

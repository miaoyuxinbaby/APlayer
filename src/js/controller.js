import utils from './utils';
import Icons from './icons';

class Controller {
    constructor (player) {
        this.player = player;

        this.initPlayButton();
        this.initPlayBar();
        this.initOrderButton();
        this.initLoopButton();
        this.initMenuButton();
        if (!utils.isMobile) {
            this.initVolumeButton();
        }
        this.initMiniSwitcher();
        this.initSkipButton();
        this.initLrcButton();
    }

    // 初始化播放按钮的 click 事件
    initPlayButton () {
        this.player.template.pic.addEventListener('click', () => {
            this.player.toggle();
        });
    }

    // 初始化
    initPlayBar () {

        // move 的回调
        const thumbMove = (e) => {
            // 调整滚动条位置
            let percentage = ((e.clientX || e.changedTouches[0].clientX) - this.player.template.barWrap.getBoundingClientRect().left) / this.player.template.barWrap.clientWidth;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.player.bar.set('played', percentage, 'width');

            // 调整歌词位置
            this.player.lrc && this.player.lrc.update(percentage * this.player.duration);
            // 修改剩余时间
            this.player.template.ptime.innerHTML = utils.secondToTime(percentage * this.player.duration);
        };

        // 拖拽结束的回调
        const thumbUp = (e) => {
            // 删除触摸结束事件
            document.removeEventListener(utils.nameMap.dragEnd, thumbUp);
            document.removeEventListener(utils.nameMap.dragMove, thumbMove);
            // 调整滚动条位置
            let percentage = ((e.clientX || e.changedTouches[0].clientX) - this.player.template.barWrap.getBoundingClientRect().left) / this.player.template.barWrap.clientWidth;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.player.bar.set('played', percentage, 'width');

            // 跳转到歌曲对应的 百分比位置
            this.player.seek(percentage * this.player.duration);
            // 打开阀门
            this.player.disableTimeupdate = false;
        };

        // 注册 dragStart -> 鼠标按下 和 触摸开始 的回调，在开始后，注册，移动 和 结束 事件，当 移动 和 结束事件回调时，取消事件绑定
        this.player.template.barWrap.addEventListener(utils.nameMap.dragStart, () => {
            this.player.disableTimeupdate = true;
            document.addEventListener(utils.nameMap.dragMove, thumbMove);
            document.addEventListener(utils.nameMap.dragEnd, thumbUp);
        });
    }

    // 初始化 音量调整按钮
    initVolumeButton () {
        // 注册点击事件
        this.player.template.volumeButton.addEventListener('click', () => {

            // audio 的 muted 属性，设置音频是否应该被禁音
            // 手动设置了静音状态
            if (this.player.audio.muted) {
                // 初始化的时候，在这之前尚未有手动设置音量，故为最高音量。
                // 其实这一步完全没有用，因为 initAudio 是在 new Controller 之后执行的
                this.player.volume(this.player.audio.volume, true);
            }
            // 没有设置的话
            else {
                // 默认禁音
                this.player.audio.muted = true;
                this.player.switchVolumeIcon();
                this.player.bar.set('volume', 0, 'height');
            }
        });

        // 跟播放进度一样
        const thumbMove = (e) => {
            let percentage = 1 - ((e.clientY || e.changedTouches[0].clientY) - this.player.template.volumeBar.getBoundingClientRect().top) / this.player.template.volumeBar.clientHeight;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.player.volume(percentage);
        };

        const thumbUp = (e) => {
            this.player.template.volumeBarWrap.classList.remove('aplayer-volume-bar-wrap-active');
            document.removeEventListener(utils.nameMap.dragEnd, thumbUp);
            document.removeEventListener(utils.nameMap.dragMove, thumbMove);
            let percentage = 1 - ((e.clientY || e.changedTouches[0].clientY) - this.player.template.volumeBar.getBoundingClientRect().top) / this.player.template.volumeBar.clientHeight;
            percentage = Math.max(percentage, 0);
            percentage = Math.min(percentage, 1);
            this.player.volume(percentage);
        };

        this.player.template.volumeBarWrap.addEventListener(utils.nameMap.dragStart, () => {
            this.player.template.volumeBarWrap.classList.add('aplayer-volume-bar-wrap-active');
            document.addEventListener(utils.nameMap.dragMove, thumbMove);
            document.addEventListener(utils.nameMap.dragEnd, thumbUp);
        });
    }

    // 播放状态按钮
    initOrderButton () {
        this.player.template.order.addEventListener('click', () => {
            if (this.player.options.order === 'list') {
                this.player.options.order = 'random';
                this.player.template.order.innerHTML = Icons.orderRandom;
            }
            else if (this.player.options.order === 'random') {
                this.player.options.order = 'list';
                this.player.template.order.innerHTML = Icons.orderList;
            }
        });
    }

    // 播放模式按钮
    initLoopButton () {
        this.player.template.loop.addEventListener('click', () => {
            if (this.player.list.audios.length > 1) {
                if (this.player.options.loop === 'one') {
                    this.player.options.loop = 'none';
                    this.player.template.loop.innerHTML = Icons.loopNone;
                }
                else if (this.player.options.loop === 'none') {
                    this.player.options.loop = 'all';
                    this.player.template.loop.innerHTML = Icons.loopAll;
                }
                else if (this.player.options.loop === 'all') {
                    this.player.options.loop = 'one';
                    this.player.template.loop.innerHTML = Icons.loopOne;
                }
            }
            else {
                if (this.player.options.loop === 'one' || this.player.options.loop === 'all') {
                    this.player.options.loop = 'none';
                    this.player.template.loop.innerHTML = Icons.loopNone;
                }
                else if (this.player.options.loop === 'none') {
                    this.player.options.loop = 'all';
                    this.player.template.loop.innerHTML = Icons.loopAll;
                }
            }
        });
    }

    // 菜单按钮
    initMenuButton () {
        this.player.template.menu.addEventListener('click', () => {
            this.player.list.toggle();
        });
    }

    // mini模式切换按钮
    initMiniSwitcher () {
        this.player.template.miniSwitcher.addEventListener('click', () => {
            this.player.setMode(this.player.mode === 'mini' ? 'normal' : 'mini');
        });
    }

    // 切歌按钮
    initSkipButton () {
        this.player.template.skipBackButton.addEventListener('click', () => {
            this.player.skipBack();
        });
        this.player.template.skipForwardButton.addEventListener('click', () => {
            this.player.skipForward();
        });
        this.player.template.skipPlayButton.addEventListener('click', () => {
            this.player.toggle();
        });
    }

    // 歌词按钮
    initLrcButton () {
        this.player.template.lrcButton.addEventListener('click', () => {
            if (this.player.template.lrcButton.classList.contains('aplayer-icon-lrc-inactivity')) {
                this.player.template.lrcButton.classList.remove('aplayer-icon-lrc-inactivity');
                this.player.lrc && this.player.lrc.show();
            }
            else {
                this.player.template.lrcButton.classList.add('aplayer-icon-lrc-inactivity');
                this.player.lrc && this.player.lrc.hide();
            }
        });
    }
}

export default Controller;
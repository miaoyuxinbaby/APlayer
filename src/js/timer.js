
class Timer {
    constructor (player) {
        this.player = player;

        // 重写 requestAnimationFrame 兼容性处理
        window.requestAnimationFrame = (() =>
            window.requestAnimationFrame ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame ||
            window.oRequestAnimationFrame ||
            window.msRequestAnimationFrame ||
            function (callback) {
                window.setTimeout(callback, 1000 / 60);
            }
        )();

        this.types = ['loading'];

        this.init();
    }

    init () {
        this.types.forEach((item) => {
            this[`init${item}Checker`]();
        });
    }

    // 缓冲检测
    initloadingChecker () {
        let lastPlayPos = 0;
        let currentPlayPos = 0;
        // 是否检测到缓冲
        let bufferingDetected = false;
        this.loadingChecker = setInterval(() => {
            // 允许缓冲检测
            if (this.enableloadingChecker) {
                // whether the audio is buffering
                currentPlayPos = this.player.audio.currentTime;
                // 未检测到缓冲 && 当前播放进度 === 之前播放进度 && 不是暂停状态
                if (
                    !bufferingDetected
                    && currentPlayPos === lastPlayPos
                    && !this.player.audio.paused
                ) {
                    // 显示loading，进入缓冲状态
                    this.player.container.classList.add('aplayer-loading');
                    bufferingDetected = true;
                }
                // 检测到缓冲 && 当前播放进度 > 之前进度 && 不是暂停状态
                if (bufferingDetected
                    && currentPlayPos > lastPlayPos
                    && !this.player.audio.paused) {
                    // 隐藏loading，退出缓冲状态
                    this.player.container.classList.remove('aplayer-loading');
                    bufferingDetected = false;
                }
                lastPlayPos = currentPlayPos;
            }
        }, 100);
    }

    // 允许 | 禁止检测 type 类型
    enable (type) {
        this[`enable${type}Checker`] = true;

        // 应该是某个胎死腹中的功能
        if (type === 'fps') {
            this.initfpsChecker();
        }
    }

    disable (type) {
        this[`enable${type}Checker`] = false;
    }

    // 停止检测
    destroy () {
        this.types.forEach((item) => {
            this[`enable${item}Checker`] = false;
            this[`${item}Checker`] && clearInterval(this[`${item}Checker`]);
        });
    }
}

export default Timer;
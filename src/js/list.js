import tplListItem from '../template/list-item.art';
import utils from './utils';
import smoothScroll from 'smoothscroll';

class List {
    constructor (player) {
        this.player = player;
        this.index = 0;
        this.audios = this.player.options.audio;
        this.showing = true;
        this.player.template.list.style.height = `${Math.min(this.player.template.list.scrollHeight, this.player.options.listMaxHeight)}px`;

        this.bindEvents();
    }

    // 绑定点击事件
    bindEvents () {
        this.player.template.list.addEventListener('click', (e) => {
            // 根据点击内容，动态改变 target
            let target;
            if (e.target.tagName.toUpperCase() === 'LI') {
                target = e.target;
            }
            else {
                target = e.target.parentElement;
            }
            // 根据歌曲在dom中的索引，切换歌曲或者开关歌曲
            const audioIndex = parseInt(target.getElementsByClassName('aplayer-list-index')[0].innerHTML) - 1;
            if (audioIndex !== this.index) {
                // 切换后播放
                this.switch(audioIndex);
                this.player.play();
            }
            else {
                this.player.toggle();
            }
        });
    }

    // 显示隐藏
    show () {
        this.showing = true;
        this.player.template.list.scrollTop = this.index * 33;
        this.player.template.list.style.height = `${Math.min(this.player.template.list.scrollHeight, this.player.options.listMaxHeight)}px`;
        this.player.events.trigger('listshow');
    }

    hide () {
        this.showing = false;
        this.player.template.list.style.height = `${Math.min(this.player.template.list.scrollHeight, this.player.options.listMaxHeight)}px`;
        setTimeout(() => {
            this.player.template.list.style.height = '0px';
            this.player.events.trigger('listhide');
        }, 0);
    }

    toggle () {
        if (this.showing) {
            this.hide();
        }
        else {
            this.show();
        }
    }

    // 添加audios
    add (audios) {
        // 触发自定义事件 listadd
        this.player.events.trigger('listadd', {
            audios: audios,
        });

        // audios必须是一个数组
        if (Object.prototype.toString.call(audios) !== '[object Array]') {
            audios = [audios];
        }
        // 格式化数据
        audios.map((item) => {
            item.name = item.name || item.title || 'Audio name';
            item.artist = item.artist || item.author || 'Audio artist';
            item.cover = item.cover || item.pic;
            item.type = item.type || 'normal';
            return item;
        });

        // 单个歌曲 和 无歌曲标志
        const wasSingle = !(this.audios.length > 1);
        const wasEmpty = this.audios.length === 0;

        // 将新增的audio更新到页面上
        this.player.template.list.innerHTML += tplListItem({
            theme: this.player.options.theme,
            audio: audios,
            index: this.audios.length + 1
        });

        // 将原 audios和 新增的 audios合并
        this.audios = this.audios.concat(audios);

        // 新增的是单个 && 原来的不是0
        if (wasSingle && this.audios.length > 1) {
            this.player.container.classList.add('aplayer-withlist');
        }

        // 重洗一次随机播放列表
        this.player.randomOrder = utils.randomOrder(this.audios.length);
        this.player.template.listCurs = this.player.container.querySelectorAll('.aplayer-list-cur');

        // 这个应该是，新增的对应的背景
        this.player.template.listCurs[this.audios.length - 1].style.backgroundColor = audios.theme || this.player.options.theme;

        // 如果新增的是 audios 是 空的，直接切换到当前播放列表的第一首歌
        if (wasEmpty) {
            if (this.player.options.order === 'random') {
                this.switch(this.player.randomOrder[0]);
            }
            else {
                this.switch(0);
            }
        }
    }

    remove (index) {
        // 触发钩子 listremove
        this.player.events.trigger('listremove', {
            index: index,
        });
        // 删除的对象存在
        if (this.audios[index]) {
            // 若只有一个则调用清空
            if (this.audios.length > 1) {
                // 删除对应的audio，并更新list和切换歌曲，
                const list = this.player.container.querySelectorAll('.aplayer-list li');
                list[index].remove();

                this.audios.splice(index, 1);
                this.player.lrc && this.player.lrc.remove(index);

                // 有下一首就播放下一首，否则播放上一首
                if (index === this.index) {
                    if (this.audios[index]) {
                        this.switch(index);
                    }
                    else {
                        this.switch(index - 1);
                    }
                }
                if (this.index > index) {
                    this.index--;
                }

                for (let i = index; i < list.length; i++) {
                    list[i].getElementsByClassName('aplayer-list-index')[0].textContent = i;
                }
                if (this.audios.length === 1) {
                    this.player.container.classList.remove('aplayer-withlist');
                }

                this.player.template.listCurs = this.player.container.querySelectorAll('.aplayer-list-cur');
            }
            else {
                this.clear();
            }
        }
    }

    // 切歌
    switch (index) {
        // 触发自定义事件 listswitch
        this.player.events.trigger('listswitch', {
            index: index,
        });

        if (typeof index !== 'undefined' && this.audios[index]) {
            this.index = index;

            const audio = this.audios[this.index];

            // set html
            this.player.template.pic.style.backgroundImage = audio.cover ? `url('${audio.cover}')` : '';
            this.player.theme(this.audios[this.index].theme || this.player.options.theme, this.index, false);
            this.player.template.title.innerHTML = audio.name;
            this.player.template.author.innerHTML = audio.artist ? ' - ' + audio.artist : '';

            const light = this.player.container.getElementsByClassName('aplayer-list-light')[0];
            if (light) {
                light.classList.remove('aplayer-list-light');
            }
            this.player.container.querySelectorAll('.aplayer-list li')[this.index].classList.add('aplayer-list-light');

            // 滚动到指定的高度
            smoothScroll(this.index * 33, 500, null, this.player.template.list);

            this.player.setAudio(audio);

            // 更新歌词
            this.player.lrc && this.player.lrc.switch(this.index);
            this.player.lrc && this.player.lrc.update(0);

            // set duration time
            if (this.player.duration !== 1) {           // compatibility: Android browsers will output 1 at first
                this.player.template.dtime.innerHTML = utils.secondToTime(this.player.duration);
            }
        }
    }

    // 清空
    clear () {
        this.player.events.trigger('listclear');
        this.index = 0;
        this.player.container.classList.remove('aplayer-withlist');
        this.player.pause();
        this.audios = [];
        this.player.lrc && this.player.lrc.clear();
        this.player.audio.src = '';
        this.player.template.list.innerHTML = '';
        this.player.template.pic.style.backgroundImage = '';
        this.player.theme(this.player.options.theme, this.index, false);
        this.player.template.title.innerHTML = 'No audio';
        this.player.template.author.innerHTML = '';
        this.player.bar.set('loaded', 0, 'width');
        this.player.template.dtime.innerHTML = utils.secondToTime(0);
    }
}

export default List;
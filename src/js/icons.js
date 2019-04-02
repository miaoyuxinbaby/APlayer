import play from '../assets/play.svg';
import pause from '../assets/pause.svg';
import volumeUp from '../assets/volume-up.svg';
import volumeDown from '../assets/volume-down.svg';
import volumeOff from '../assets/volume-off.svg';
import orderRandom from '../assets/order-random.svg';
import orderList from '../assets/order-list.svg';
import menu from '../assets/menu.svg';
import loopAll from '../assets/loop-all.svg';
import loopOne from '../assets/loop-one.svg';
import loopNone from '../assets/loop-none.svg';
import loading from '../assets/loading.svg';
import right from '../assets/right.svg';
import skip from '../assets/skip.svg';
import lrc from '../assets/lrc.svg';

// 利用svg-inline-loader 引入svg文件 这个我考虑一下，用这个loader替换svg-sprite-loader
const Icons = {
    play: play,
    pause: pause,
    volumeUp: volumeUp,
    volumeDown: volumeDown,
    volumeOff: volumeOff,
    orderRandom: orderRandom,
    orderList: orderList,
    menu: menu,
    loopAll: loopAll,
    loopOne: loopOne,
    loopNone: loopNone,
    loading: loading,
    right: right,
    skip: skip,
    lrc: lrc,
};

export default Icons;

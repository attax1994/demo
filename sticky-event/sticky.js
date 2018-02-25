; (function () {
    'use strict';

    let DEBUG = false;

    /**
     * 判断元素的position是否为sticky
     * @param {!Element} el
     * @return {boolean}
     */
    function isSticky(el) {
        // getComputedStyle能获取元素当前的所有style属性
        return getComputedStyle(el).position.match('sticky') !== null;
    }

    /**
     * 对指定的目标(target)触发'sticky-change'事件
     * 特别注意这里的事件由document发布，监听也应当由document监听
     * @param {boolean} stuck
     * @param {!Element} target Target element of event.
     */
    function fire(stuck, target) {
        const evt = new CustomEvent('sticky-change', { detail: { stuck, target } });
        document.dispatchEvent(evt);
    }

    /**
     * 初始化页面
     * @param {!Element} container
     */
    function generatePage(container) {
        // 定义各个栏目标题
        const MSGS = [
            'First',
            'No',
            'JavaScript',
            'scroll events',
            'were',
            'used',
            'on',
            'this',
            'page!'
        ];

        const t = container.querySelector('template');
        const toc = document.querySelector('#toc > ul');
        // t2是#toc下的template
        const t2 = toc.querySelector('template');

        // msg即currentValue，i即index
        MSGS.forEach((msg, i) => {
            // 正文内容部分
            // 深度复制文章内容节点
            const clone = t.content.cloneNode(true);
            const h2 = clone.querySelector('h2');
            // 更改sticky框的标题
            h2.textContent = msg;
            // 修正id（其实就是将空白符和感叹号，替换为'-'的标题）
            h2.id = normalizeTitle(msg);
            // 插入到正文的父容器中去
            container.appendChild(clone);

            // 侧边菜单部分
            // 深度复制侧边菜单节点
            const tocClone = t2.content.cloneNode(true);
            const a = tocClone.querySelector('a');
            // 设置anchor的文本标题
            a.textContent = msg;
            // 设置anchor的链接地址（替换掉一些符号）
            a.href = `#${normalizeTitle(msg)}`;
            // 插入到侧边菜单的父容器中去
            toc.appendChild(tocClone);
        });
    }

    /**
     * 添加检测区块到目标元素的sticky块旁边
     * @param {!Element} container
     * @param {string} className
     */
    function addSentinels(container, className) {
        return Array.from(container.querySelectorAll('.sticky')).map(el => {
            // 针对每个sticky块，创建sentinel检测区块，添加在其旁边（成为sibling）
            const sentinel = document.createElement('div');
            sentinel.classList.add('sticky_sentinel', className);
            // 将元素附着在sticky旁边，然后作为返回值，在高阶函数中去注册observer
            return el.parentElement.appendChild(sentinel);
        });
    }

    /**
     * 设置IntersectionObserver，从而确认文章容器顶部
     * class为`.section_sentinel--top`的元素是否可视
     * @param {!Element} container #container容器
     */
    function observeHeaders(container) {
        // 注册observer
        const observer = new IntersectionObserver(
            // records每一项为可视的IntersectionObserverEntry实例
            // observer为IntersectionObserver实例，包括其options
            (records, observer) => {
                // 对每一个可视的元素进行处理
                for (const record of records) {
                    // 获取元素在页面的位置信息
                    const targetInfo = record.boundingClientRect;
                    // 获取该元素下的sticky框
                    const stickyTarget = record.target.parentElement.querySelector('.sticky');
                    // 获取父元素#container的位置信息
                    const rootBoundsInfo = record.rootBounds;

                    // 如果元素的底部低于#container顶部（升高到一定程度），触发sticky效果
                    if (targetInfo.bottom < rootBoundsInfo.top) {
                        fire(true, stickyTarget);
                    }

                    // 如果元素底部高于#container顶部，
                    // 并且低于其底部（在#container的可视范围内），取消sticky效果
                    if (targetInfo.bottom >= rootBoundsInfo.top &&
                        targetInfo.bottom < rootBoundsInfo.bottom) {
                        fire(false, stickyTarget);
                    }
                }
            }, {
                // rootMargin: '-16px',
                // 顶部几乎不可见时候触发
                threshold: [0],
                root: container
            }
        );

        // 对每个区域，添加顶部的探测区块，并让上面注册的observer去监测它
        const sentinels = addSentinels(container, 'sticky_sentinel--top');
        sentinels.forEach(el => observer.observe(el));
    }

    /**
     * 设置IntersectionObserver，从而确认文章容器底部
     * class为`.section_sentinel--bottom`的元素是否可视
     * @param {!Element} container #container容器
     */
    function observeFooters(container) {
        // records每一项为可视的IntersectionObserverEntry实例
        // observer为IntersectionObserver实例，包括其options
        const observer = new IntersectionObserver((records, observer) => {
            for (const record of records) {
                // 获取元素在页面的位置信息
                const targetInfo = record.boundingClientRect;
                // 获取该元素下的sticky框
                const stickyTarget = record.target.parentElement.querySelector('.sticky');
                // 获取父元素#container的位置信息
                const rootBoundsInfo = record.rootBounds;
                // 获取该元素的可视区所占比例
                const ratio = record.intersectionRatio;

                // 在顶部上方，且全部全部可视的情况下，触发sticky
                if (targetInfo.bottom > rootBoundsInfo.top && ratio === 1) {
                    fire(true, stickyTarget);
                }

                // 嵌入bottom框内后，取消sticky
                if (targetInfo.top < rootBoundsInfo.top &&
                    targetInfo.bottom < rootBoundsInfo.bottom) {
                    fire(false, stickyTarget);
                }
            }
        }, {
                // rootMargin: '16px',
                // 底部刚刚开始不可见时候触发
                threshold: [1],
                root: container
            });

        // 对每个区域，添加底部的探测区块，并让上面注册的observer去监测它
        const sentinels = addSentinels(container, 'sticky_sentinel--bottom');
        sentinels.forEach(el => observer.observe(el));
    }

    /**
     * 当`.sticky`的元素需要进入或取消sticky的时候触发通知事件
     * 需要注意的是，处理的都是#container的子元素
     */
    function notifyWhenStickyHeadersChange(container) {
        observeHeaders(container);
        observeFooters(container);
    }

    /**
     * 将空白符（空格，制表符，换行符等）和感叹号，替换为'-'
     * @param {string} title 
     */
    function normalizeTitle(title) {
        return title.replace(/[\s!]/g, '-');
    }

    function scrollToHeader(el) {
        event.preventDefault();
        const target = document.querySelector(`#${normalizeTitle(el.textContent)}`);
        const parent = target.parentElement.parentElement;
        // Slight px offset so IntersectionObserver triggers.
        // Note: Smooth scroll is taken care of. Container has scroll-behavior: smooth.
        container.scrollTo({ left: 0, top: parent.offsetTop + 2 });
    }

    /** 
     * 切换debug模式，其实就是改下body的class名称和sentinel文本内容
    */
    function toggleDebugMode() {
        DEBUG = !DEBUG;
        document.body.classList.toggle('debug', DEBUG);
        const sentinels = Array.from(document.querySelectorAll('.sticky_sentinel'));
        sentinels.forEach(el => {
            el.textContent = el.className;
        });
    }


    /******************
           开始执行
     ******************/
    /**
     * 1. 初始化页面
     */
    const container = document.querySelector('#container');
    generatePage(container);

    /**
     * 2. 注册事件和监听器，添加监测区域
     */
    // 页面内容初始化完成后，检测是否支持该特性（IntersectionObserver）
    if (!isSticky(document.querySelector('.sticky')) || !window.IntersectionObserver) {
        // 如果不支持所需要的特性，就显示不支持页面
        document.querySelector('.nosupport').style.display = 'block';
    } else {
        // 如果支持该特性，就注册通知事件
        notifyWhenStickyHeadersChange(container);
    }


    /**
     * 3. 注册事件监听器
     */
    // who_is_sticky框，container左上方的指示框
    const whoIsSticky = document.querySelector('.who_is_sticky label');
    // 所有的侧边栏菜单项目
    const allTocsItems = Array.from(document.querySelectorAll('#toc .toc-item'));

    // 由document监听`sticky-change`事件，相关参数在e.detail中
    document.addEventListener('sticky-change', e => {
        const { target: header, stuck } = e.detail;
        // 切换阴影
        header.classList.toggle('shadow', stuck);
        // 更新指示框的内容
        const str = stuck ? header.textContent : '--';
        whoIsSticky.textContent = str;

        // 更新侧边栏展开的栏目
        allTocsItems.map(el => {
            const match = (el.firstElementChild.getAttribute('href').slice(1) ==
                header.firstElementChild.id);
            el.classList.toggle('active', match);
        });
    });

    // 内嵌模式，queryParams中加入embed项
    if (location.search.includes('embed')) {
        document.body.classList.add('embed');
    }

    window.toggleDebugMode = toggleDebugMode;
    window.scrollToHeader = scrollToHeader;

    // // TODO: benchmark against checking position using scroll events.
    // const stickyHeaders = Array.from(document.querySelectorAll('.sticky'));
    // const containerTop = container.getBoundingClientRect().top;
    // containers.onscroll = function(e) {
    //   const visibleHeaders = stickyHeaders.filter(header => {
    //     const headerTop = header.getBoundingClientRect().top;
    //     console.log(headerTop, containerTop)
    //   });
    // };
})();
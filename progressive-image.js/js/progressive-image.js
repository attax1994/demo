if (window.addEventListener && window.requestAnimationFrame && document.getElementsByClassName) {
  window.addEventListener('load', function () {

    // start
    var pItem = document.getElementsByClassName('progressive replace'),
      pCount,
      timer;

    // scroll and resize events
    window.addEventListener('scroll', scroller, false);
    window.addEventListener('resize', scroller, false);

    // DOM mutation observer
    if (MutationObserver) {

      var observer = new MutationObserver(function () {
        if (pItem.length !== pCount) inView();
      });
      observer.observe(document.body, { subtree: true, childList: true, attributes: true, characterData: true });

    }

    // initial check, later ones will be triggered by scroll and resize
    inView();

    // throttled scroll/resize
    // if timer has not expired, the previous timer will continue
    function scroller() {

      timer = timer || setTimeout(function () {
        timer = null;
        inView();
      }, 300);

    }


    // image in view?
    function inView() {
      
      console.log('inview after throttling');

      if (pItem.length) requestAnimationFrame(function () {

        // wT is window top(currently)
        var wT = window.pageYOffset,
          // wB is window bottom(currently) 
          wB = wT + window.innerHeight,
          // cRect is the position, height, width and scroll status of element  
          cRect,
          // pT is the picture top of each picture 
          pT,
          // pB is the picture bottom of each picture
          pB,
          // p is the iterator
          p = 0;

        // check each img
        while (p < pItem.length) {

          cRect = pItem[p].getBoundingClientRect();
          pT = wT + cRect.top;
          pB = pT + cRect.height;

          if (wT < pB && wB > pT) {
            // if picture is in view
            loadFullImage(pItem[p]);
            pItem[p].classList.remove('replace');
          }
          else p++;

        }

        pCount = pItem.length;

      });

    }


    // replace with full image
    function loadFullImage(item) {

      // get href from data-href(if set) or href(if data-href not set) attribute
      var href = item && (item.getAttribute('data-href') || item.href);
      if (!href) return;

      // load image
      var img = new Image();
      // set dataset, src and class
      if (item.dataset) {
        img.srcset = item.dataset.srcset || '';
        img.sizes = item.dataset.sizes || '';
      }
      img.src = href;
      img.className = 'reveal';
      // Add immediately if image has been already loaded, otherwise load image in onload event
      if (img.complete) addImg();
      else img.onload = addImg;

      // replace image
      function addImg() {

        requestAnimationFrame(function () {

          // disable click
          if (href === item.href) {
            // if already loaded
            // reset cursor
            item.style.cursor = 'default';
            item.addEventListener('click', function (e) { e.preventDefault(); }, false);
          }

          // add full image
          item.appendChild(img).addEventListener('animationend', function (e) {

            // remove preview image
            var pImg = item.querySelector && item.querySelector('img.preview');
            if (pImg) {
              e.target.alt = pImg.alt || '';
              item.removeChild(pImg);
              e.target.classList.remove('reveal');
            }

          });

        });

      }

    }

  }, false);
}
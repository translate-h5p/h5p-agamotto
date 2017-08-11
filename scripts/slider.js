(function (Agamotto) {
  'use strict';

  /**
   * Slider object.
   *
   * @param {Object} options - Options for the slider.
   * @param {boolean} options.snap - If true, slider will snap to fixed positions.
   * @param {boolean} options.ticks - If true, slider container will display ticks.
   * @param {boolean} options.labels - If true, slider container will display tick labels.
   * @param {Object} options.label_texts - Tick labels.
   * @param {string} options.label_texts.text - Tick label.
   * @param {number} options.size - Number of positions/ticks.
   * @param {string} selector - CSS class name of parent node.
   * @param {string} parent - Parent class Agamotto.
   */
  Agamotto.Slider = function (options, selector, parent) {
    var that = this;

    if (options.snap === undefined) {
      options.snap = true;
    }
    if (options.ticks === undefined) {
      options.ticks = false;
    }
    if (options.labels === undefined) {
      options.labels = false;
    }

    this.options = options;
    this.selector = selector;
    this.parent = parent;

    this.trackWidth = 0;
    this.thumbPosition = 0;
    this.ratio = 0;

    this.ticks = [];
    this.labels = [];

    this.mousedown = false;
    this.keydown = false;
    this.interactionstarted = false;

    this.track = document.createElement('div');
    this.track.classList.add('h5p-agamotto-slider-track');

    this.thumb = document.createElement('div');
    this.thumb.classList.add('h5p-agamotto-slider-thumb');
    this.thumb.setAttribute('tabindex', 0);

    this.container = document.createElement('div');
    this.container.classList.add('h5p-agamotto-slider-container');
    this.container.setAttribute('role', 'slider');
    this.container.setAttribute('aria-valuenow', 0);
    this.container.setAttribute('aria-valuemin', 0);
    this.container.setAttribute('aria-valuemax', 100);
    this.container.appendChild(this.track);
    this.container.appendChild(this.thumb);

    /*
     * We could put the next two blocks in one loop and check for ticks/labels
     * within the loop, but then we would always loop all images even without
     * ticks and labels. Would be slower (with many images).
     */
    var i = 0;
    // Place ticks
    if (this.options.ticks === true) {
      // Function used here to avoid creating it in the upcoming loop
      var placeTicks = function() {
        that.setPosition(parseInt(this.style.left) - Agamotto.Slider.TRACK_OFFSET, true);
      };
      for (i = 0; i <= this.options.size; i++) {
        this.ticks[i] = document.createElement('div');
        this.ticks[i].classList.add('h5p-agamotto-tick');
        this.ticks[i].addEventListener('click', placeTicks);
        this.container.appendChild(this.ticks[i]);
      }
    }

    // Place labels
    if (this.options.labels === true) {
      for (i = 0; i <= this.options.size; i++) {
        this.labels[i] = document.createElement('div');
        this.labels[i].classList.add('h5p-agamotto-tick-label');
        this.labels[i].innerHTML = this.options.label_texts[i];
        this.container.appendChild(this.labels[i]);
      }
    }

    // Event Listeners for Mouse Interface
    document.addEventListener('mousemove', function(e) {
      that.setPosition(e, false);
    });
    document.addEventListener('mouseup', function() {
      that.mousedown = false;
      that.snap();
    });
    this.track.addEventListener('mousedown', function (e) {
      e = e || window.event;
      that.mousedown = true;
      that.sliderdown = true;
      that.setPosition(e, false);
    });
    this.thumb.addEventListener('mousedown', function (e) {
      e = e || window.event;
      that.mousedown = true;
      that.sliderdown = true;
      that.setPosition(e, false);
    });

    /*
     * Event Listeners for Touch Interface
     * Using preventDefault here causes Chrome to throw a "violation". Blocking
     * the default behavior for touch is said to cause performance issues.
     * However, if you don't use preventDefault, people will also slide the
     * screen when using the slider which would be weird.
     */
    this.container.addEventListener('touchstart', function (e) {
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      that.setPosition(e, false);

      this.addEventListener('touchmove', function (e) {
        e = e || window.event;
        e.preventDefault();
        e.stopPropagation();
        that.setPosition(e, false);
      });
    });
    this.container.addEventListener('touchend', function (e) {
      e = e || window.event;
      e.preventDefault();
      e.stopPropagation();
      that.snap();
    });

    // Event Listeners for Keyboard on handle to move in percentage steps
    this.thumb.addEventListener('keydown', function (e) {
      e = e || window.event;
      var key = e.which || e.keyCode;
      // handler left
      if (key === 37 && (that.keydown === false || that.keydown === 37)) {
        that.keydown = 37;
        that.setPosition(that.getPosition() - 0.01 * parseInt(that.getWidth()), false);
      }
      // handler right
      if (key === 39 && (that.keydown === false || that.keydown === 39)) {
        that.keydown = 39;
        that.setPosition(that.getPosition() + 0.01 * parseInt(that.getWidth()), false);
      }
    });

    // Event Listeners for Keyboard to stop moving
    this.thumb.addEventListener('keyup', function (e) {
      e = e || window.event;
      that.snap();
      that.keydown = false;
    });

    // Initialize event inheritance
    H5P.EventDispatcher.call(this);

    // Slider Layout
    /** @constant {number} */
    Agamotto.Slider.CONTAINER_DEFAULT_HEIGHT = 36;
    /** @constant {number} */
    Agamotto.Slider.TRACK_OFFSET = 16;
    /** @constant {number} */
    Agamotto.Slider.THUMB_OFFSET = 8;
  };

  // Extends the event dispatcher
  Agamotto.Slider.prototype = Object.create(H5P.EventDispatcher.prototype);
  Agamotto.Slider.prototype.constructor = Agamotto.Slider;

  Agamotto.Slider.prototype = {
    getDOM: function getDOM () {
      return this.container;
    },
    disable: function disable () {
      this.track.classList.add('h5p-agamotto-disabled');
      this.thumb.classList.add('h5p-agamotto-disabled');
    },
    enable: function enable () {
      this.track.classList.remove('h5p-agamotto-disabled');
      this.thumb.classList.remove('h5p-agamotto-disabled');
    },
    setWidth: function setWidth(value) {
      this.trackWidth = value;
      this.track.style.width = value + 'px';
    },
    getWidth: function getWidth() {
      return this.trackWidth;
    },
    /**
     * Will set the position of the thumb on the slider track.
     *
     * @param {number} position - Position on the slider track from 0 to max.
     * @param {boolean} animate - If true, slide instead of jumping.
     * @param {boolean} resize - If true, won't recompute position/width ratio.
     */
    setPosition: function setPosition (position, animate, resize) {
      if (this.thumb.classList.contains('h5p-agamotto-disabled')) {
        return;
      }

      // Compute position from string (e.g. 1px), from number (e.g. 1), or from event
      if ((typeof position === 'string') || (typeof position === 'number')) {
        position = parseInt(position);
      }
      else if (typeof position === 'object') {
        if ((this.mousedown === false) && (position.type === 'mousemove')) {
          return;
        }

        position = this.getPointerX(position) -
          Agamotto.Slider.TRACK_OFFSET -
          parseInt(window.getComputedStyle(this.container).marginLeft) -
          parseInt(window.getComputedStyle(document.querySelector(this.selector)).paddingLeft) -
          parseInt(window.getComputedStyle(document.querySelector(this.selector)).marginLeft);
      }
      else {
        position = 0;
      }
      position = Agamotto.constrain(position, 0, this.getWidth());

      // Transition control
      if (animate === true) {
        this.thumb.classList.add('h5p-agamotto-transition');
      } else {
        this.thumb.classList.remove('h5p-agamotto-transition');
      }

      // We need to keep a fixed ratio not influenced by resizing
      if (!resize) {
        this.ratio = position / this.getWidth();
      }

      // Update DOM
      this.thumb.style.left = position + Agamotto.Slider.THUMB_OFFSET + 'px';
      var percentage = Math.round(position / this.getWidth() * 100);
      this.container.setAttribute('aria-valuenow', percentage);

      // Inform parent node
      this.trigger('update', {
        position: position,
        percentage: percentage
      });
    },
    getPosition: function getPosition() {
      return (this.thumb.style.left) ? parseInt(this.thumb.style.left) - Agamotto.Slider.THUMB_OFFSET : 0;
    },
    /**
     * Snap slider to closest tick position.
     */
    snap: function snap () {
      if (this.options.snap === true) {
        var snapIndex = Math.round(Agamotto.map(this.ratio, 0, 1, 0, this.options.size));
        this.setPosition(snapIndex * this.getWidth() / this.options.size, true);
      }
      // Only trigger on mouseup that was started by mousedown over slider
      if (this.sliderdown === true) {
        // Won't pass object and context if invoked by Agamotto.prototype.xAPI...()
        // Trigger xAPI when interacted with content
        this.parent.xAPIInteracted();
        // Will check if interaction was completed before triggering
        this.parent.xAPICompleted();
        // release interaction trigger
        this.sliderdown = false;
      }
    },
    getPointerX: function getPointerX (e) {
      var pointerX = 0;
      if (e.touches) {
        pointerX = e.touches[0].pageX;
      }
      else {
        pointerX = e.clientX;
      }
      return pointerX;
    },
    // Resize the slider.
    resize: function resize() {
      this.setWidth(parseInt(this.container.offsetWidth) - 2 * Agamotto.Slider.TRACK_OFFSET);
      this.setPosition(this.getWidth() * this.ratio, false, true);

      var i = 0;
      // Update ticks
      if (this.options.ticks === true) {
        for (i = 0; i < this.ticks.length; i++) {
          this.ticks[i].style.left = Agamotto.Slider.TRACK_OFFSET + i * this.getWidth() / (this.ticks.length - 1) + 'px';
        }
      }
      // Height to enlarge the slider container
      var maxLabelHeight = 0;

      // Update labels
      if (this.options.labels === true) {
        for (i = 0; i < this.labels.length; i++) {
          maxLabelHeight = Math.max(maxLabelHeight, parseInt(window.getComputedStyle(this.labels[i]).height));

          // Align the first and the last label left/right instead of centered
          switch(i) {
              case (0):
                // First label
                this.labels[i].style.left = (Agamotto.Slider.TRACK_OFFSET / 2) + 'px';
                break;
              case (this.labels.length - 1):
                // Last label
                this.labels[i].style.right = (Agamotto.Slider.TRACK_OFFSET / 2) + 'px';
                break;
              default:
                // Centered over tick mark position
                var offset = Math.ceil(parseInt(window.getComputedStyle(this.labels[i]).width)) / 2;
                this.labels[i].style.left = Agamotto.Slider.TRACK_OFFSET + i * this.getWidth() / (this.labels.length - 1) - offset + 'px';
          }
        }
        // If there are no ticks, put the labels a little closer to the track
        var buffer = (this.options.ticks === true) ? 0 : -7;

        // Update slider height
        // We only need this once right now, but possible more often if we make the label height dynamic
        this.container.style.height = (Agamotto.Slider.CONTAINER_DEFAULT_HEIGHT + maxLabelHeight + buffer) + 'px';      }
    }
  };

})(H5P.Agamotto);

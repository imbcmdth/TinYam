(function (root, factory) {
		"use strict";

		if (typeof exports === 'object') {
			module.exports = factory();
		} else if (typeof define === 'function' && define.amd) {
			define(factory);
		} else {
			root.TinYam = factory();
		}
	}(this, function () {
		"use strict";

		// local rAF and cAF shim
		var requestAnimFrame = 
			window.requestAnimationFrame       ||
			window.webkitRequestAnimationFrame || 
			window.mozRequestAnimationFrame    || 
			window.oRequestAnimationFrame      || 
			window.msRequestAnimationFrame     || 
			function(callback, element) {
				return window.setTimeout(function() {
					callback(+new Date());
				}, 1000 / 60);
			};

		var cancelAnimFrame = 
			window.cancelAnimationFrame       ||
			window.webkitCancelAnimationFrame || 
			window.mozCancelAnimationFrame    || 
			window.oCancelAnimationFrame      || 
			window.msCancelAnimationFrame     || 
			function(timerId) {
				return window.clearTimeout(timerId);
			};

		if( !Array.prototype.forEach ) {
			Array.prototype.forEach = function(fn, scope) {
				for(var i = 0, len = this.length; i < len; ++i) {
					fn.call(scope || this, this[i], i, this);
				}
			}
		}

		var defaults = {
			duration: 1000,
			from: [0],
			to: [1],
			easing: "easeLinear",
			using: window,
			paused: false,  // if true, the animation doesn't start immediately but must be started
			onfinish: null, // called when the animation has completed (reached end-values)
			onstop: null,   // called if the animation has stopped for any reason
			onplay: null,
			maxFPS: 120
		};

		function copyDefaults(target) {
			for(var key in defaults) {
				if(defaults.hasOwnProperty(key) && !(key in target)) target[key] = defaults[key];
			}
		}

		// Interpolate between from and to values over duration
		// calling onFrame with the current value.
		var anim = function _anim(options, callback) {
			copyDefaults(options);

			if(options.from.length !== options.to.length) return;

			var controlObj = {
			    	finish: finishAnimation,
			    	stop: stopAnimation,
			    	play: playAnimation,
			    	reset: resetAnimation
			    },
			    minInterval = 1000 / options.maxFPS,
			    startTime = 0,
			    elapsedTime = 0,
			    lastFrame = 0,
			    timerId = -1,
			    easingFunction = (typeof options.easing === "function") ? options.easing : anim[options.easing];

			// resetAnimation sets an animation back to the starting values
			function resetAnimation() {
				elapsedTime = 0;
				return options.paused ? controlObj : playAnimation();
			}

			// playAnimation starts (or continues) an animation
			function playAnimation() {
				options.paused = false;
				cancelAnimFrame(timerId);
				startTime = (new Date()) - elapsedTime;
				timerId = requestAnimFrame( tickAnimation );
				if(typeof options.onplay === "function")
					options.onplay.call(options.using, elapsedTime / options.duration, options);
				return controlObj;
			}

			// stopAnimation stops (or pauses) an animation
			function stopAnimation() {
				options.paused = true;
				cancelAnimFrame(timerId);
				elapsedTime = (new Date()) - startTime;
				if(typeof options.onstop === "function")
					options.onstop.call(options.using, elapsedTime / options.duration, options);
				return controlObj;
			}

			// finishAnimation stops an animation and calls callback with the end values
			function finishAnimation() {
				stopAnimation();
				callback.call(options.using, options.to, options);
				if(typeof options.onfinish === "function")
					options.onfinish.call(options.using, options);
				return controlObj;
			}

			// tickAnimation is called to evaluate each "frame" of an animation
			function tickAnimation(frameTime) {
				elapsedTime = frameTime - startTime;

				var frameInterval = frameTime - lastFrame;

				// Handle end-of-animation
				if (elapsedTime >= options.duration)
					return finishAnimation();

				if(frameInterval < minInterval) return timerId = requestAnimFrame( tickAnimation );

				lastFrame = frameTime;

				// interpolate values using provided easing function
				var currentValues = [];
				options.from.forEach(function(from, i, a){
					currentValues.push(easingFunction.call(options.using, elapsedTime / options.duration, from, options.to[i] - from, options));
				});
				callback.call(options.using, currentValues, options);

				// Let's get the next frame
				timerId = requestAnimFrame( tickAnimation );
			}

			return resetAnimation();
		}

		anim.easeLinear = function _linear(x, b, c) {
			return b + c * x;
		};
		anim.easeInQuad = function _inQuad(x, b, c) {
			return c * x * x + b;
		};
		anim.easeOutQuad = function _outQuad(x, b, c) {
			return -c * x * (x-2) + b;
		};
		anim.easeInOutQuad = function _inOutQuad(x, b, c) {
			if ((x*=2) < 1) return c/2 * x * x + b;
			return -c/2 * ((--x)*(x - 2) - 1) + b;
		};
		anim.easeInCubic = function _inCubic(x, b, c) {
			return c * x * x * x + b;
		};
		anim.easeOutCubic = function _outCubic(x, b, c) {
			return c*((x-=1) * x * x + 1) + b;
		};
		anim.easeInOutCubic = function _inOutCubic(x, b, c) {
			if ((x*=2) < 1) return c/2 * x * x * x + b;
			return c/2 * ((x-=2) * x * x + 2) + b;
		};
		anim.easeInQuart = function _inQuart(x, b, c) {
			return c * x * x * x * x + b;
		};
		anim.easeOutQuart = function _outQuart(x, b, c) {
			return -c * ((x-=1) * x * x * x - 1) + b;
		};
		anim.easeInOutQuart = function _inOutQuart(x, b, c) {
			if ((x*=2) < 1) return c/2 * x * x * x * x + b;
			return -c/2 * ((x-=2) * x * x * x - 2) + b;
		};
		anim.easeInQuint = function _inQuint(x, b, c) {
			return c * x * x * x * x * x + b;
		};
		anim.easeOutQuint = function _outQuint(x, b, c) {
			return c * ((x-=1) * x * x * x * x + 1) + b;
		};
		anim.easeInOutQuint = function _inOutQuint(x, b, c) {
			if ((x*=2) < 1) return c/2 * x * x * x * x * x + b;
			return c/2*((x-=2) * x * x * x * x + 2) + b;
		};
		anim.easeInSine = function _inSine(x, b, c) {
			return -c * Math.cos(x * (Math.PI/2)) + c + b;
		};
		anim.easeOutSine = function _outSine(x, b, c) {
			return c * Math.sin(x * (Math.PI/2)) + b;
		};
		anim.easeInOutSine = function _inOutSine(x, b, c) {
			return -c/2 * (Math.cos(Math.PI * x) - 1) + b;
		};
		anim.easeInExpo = function _inExpo(x, b, c) {
			return (x==0) ? b : c * Math.pow(2, 10 * (x - 1)) + b;
		};
		anim.easeOutExpo = function _outExpo(x, b, c) {
			return (x==1) ? b+c  : c * (-Math.pow(2, -10 * x) + 1) + b;
		};
		anim.easeInOutExpo = function _inOutExpo(x, b, c) {
			if (x==0) return b;
			if (x==1) return b+c;
			if ((x*=2) < 1) return c/2 * Math.pow(2, 10 * (x - 1)) + b;
			return c/2 * (-Math.pow(2, -10 * --x) + 2) + b;
		};
		anim.easeInCirc = function _inCirc(x, b, c) {
			return -c * (Math.sqrt(1 - x * x) - 1) + b;
		};
		anim.easeOutCirc = function _outCirc(x, b, c) {
			return c * Math.sqrt(1 - (x-=1)*x) + b;
		};
		anim.easeInOutCirc = function _inOutCirc(x, b, c) {
			if ((x*=2) < 1) return -c/2 * (Math.sqrt(1 - x * x) - 1) + b;
			return c/2 * (Math.sqrt(1 - (x-=2) * x) + 1) + b;
		};
		anim.easeInBounce = function _inBounce(x, b, c) {
			return c - _outBounce(1 - x, 0, c) + b;
		};
		anim.easeOutBounce = function _outBounce(x, b, c) {
			if (x < (1/2.75)) {
				return c*(7.5625*x*x) + b;
			} else if (x < (2/2.75)) {
				return c*(7.5625*(x-=(1.5/2.75))*x + .75) + b;
			} else if (x < (2.5/2.75)) {
				return c*(7.5625*(x-=(2.25/2.75))*x + .9375) + b;
			} else {
				return c*(7.5625*(x-=(2.625/2.75))*x + .984375) + b;
			}
		};
		anim.easeInOutBounce = function _inOutBounce(x, b, c) {
			if (x < 0.5) return _inBounce(x * 2, 0, c) * .5 + b;
			return _outBounce(x * 2 - 1, 0, c) * .5 + c * .5 + b;
		};

		return anim;
}));

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

		// local rAF and cAF shim
		var requestAnimFrame = 
			this.requestAnimationFrame       ||
			this.webkitRequestAnimationFrame ||
			this.mozRequestAnimationFrame    ||
			this.oRequestAnimationFrame      ||
			this.msRequestAnimationFrame     ||
			function(fn, thisArg) {
				return setTimeout(function() {
					fn.call(thisArg, +new Date());
				}, 1000 / 60);
			};

		var cancelAnimFrame = 
			this.cancelAnimationFrame       ||
			this.webkitCancelAnimationFrame ||
			this.mozCancelAnimationFrame    ||
			this.oCancelAnimationFrame      ||
			this.msCancelAnimationFrame     ||
			function(timerId) {
				return clearTimeout(timerId);
			};

		// local version of Array.map for IE compatibility
		var arrayMap = Array.prototype.map;

		if( !arrayMap ) {
			arrayMap = function(fn, thisArg) {
				"use strict";

				var len = this.length >>> 0;
				var newArray = Array(len);

				for(var i = 0; i < len; i++) {
					newArray[i] = fn.call(thisArg, this[i], i, this);
				}

				return newArray;
			}
		}

		var isArray = Array.isArray;
		if(!isArray) {
			isArray = function (vArg) {
				return Object.prototype.toString.call(vArg) === "[object Array]";
			};
		}

		var defaults = {
			duration: 1000,
			keyframes : {
				"0%" : [0],
				"100%" : [1]
			},
			callbacks : {},
			easing: "easeLinear",
			using: window,
			paused: false,  // if true, the animation doesn't start immediately but must be started
			onfinish: null, // called when the animation has completed
			onstop: null,   // called if the animation has stopped for any reason
			onplay: null,
			maxFPS: 120,
			loop: false
		};

		function copyDefaults(target) {
			"use strict";

			for(var key in defaults) {
				if(defaults.hasOwnProperty(key) && !(key in target)) target[key] = defaults[key];
			}
		}

		function convertKeyframes(obj, time, sortFn) {
			"use strict";

			var newObj = [],
			    newKey,
			    newBase = (time || 1) / 100;

			for(var key in obj) {
				if(obj.hasOwnProperty(key)) {
					newKey = parseFloat(key);

					if(key.indexOf('%') > -1) {
						newKey *= newBase;
					}

					if(newKey >= 0) {
						// We copy the values array so it can't be changed
						// on us once TinYam has been called.
						newObj.push({time: newKey, values: obj[key].slice()});
					}
				}
			}

			if(typeof sortFn === "function")
				newObj.sort(sortFn);

			return newObj;
		}

		function convertCallbacks(obj, time, sortFn) {
			"use strict";

			var newObj = [],
			    newKey,
			    newBase = (time || 1) / 100;

			for(var key in obj) {
				if(obj.hasOwnProperty(key)) {
					newKey = parseFloat(key);

					if(key.indexOf('%') > -1) {
						newKey *= newBase;
					}

					if(newKey >= 0) {
						newObj.push({time: newKey, fn: obj[key].slice()});
					}
				}
			}

			if(typeof sortFn === "function") {
				newObj.sort(sortFn);
			}

			return newObj;
		}

		function sortByTime(a, b) {
			return a.time - b.time;
		}

		function fixNumberOfSegments(keyframes, totalDuration) {
			if ( keyframes[0].time > 0 ) {
				keyframes.unshift({time: 0, values: null});
			}

			if ( keyframes[keyframes.length - 1].time < totalDuration ) {
				keyframes.push({time: totalDuration, values: null});
			}

			return keyframes.length;
		}

		function getFirstSegmentValue(keyframes) {
			var segmentNum = 0,
			    keyframesLen = keyframes.length;

			while(segmentNum < keyframesLen && keyframes[segmentNum].values == null) {
				segmentNum++;
			}

			if(segmentNum < keyframesLen)
				return keyframes[segmentNum].values;
			else
				return null;
		}

		function getLastSegmentValue(keyframes) {
			var segmentNum = keyframes.length - 1;

			while(segmentNum >= 0 && keyframes[segmentNum].values == null) {
				segmentNum--;
			}

			if(segmentNum > 0)
				return keyframes[segmentNum].values;
			else
				return null;
		}

		// Interpolate between from and to values over duration
		// calling onFrame with the current value.
		var anim = function _anim(options, frameCallback) {
			"use strict";

			copyDefaults(options);

//			if(options.from.length !== options.to.length) return;

			var controlObj = {
			    	start: startAnimation,
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
			    easingFunction = (typeof options.easing === "function") 
			    	? options.easing
			    	: anim[options.easing],
			    totalDuration = options.duration,
			    onstop = options.onstop,
			    onstart = options.onstart,
			    onplay = options.onplay,
			    using = options.using,
			    onend = options.onend,
			    isPaused = options.paused,
			    loopAnim = options.loop,
			    currentSegment = 0,
			    currentCallback = 0,
			    segmentStart,
			    segmentEnd,
			    segmentDuration;

			var keyframes = convertKeyframes(options.keyframes, options.duration, sortByTime);
			var callbacks = convertCallbacks(options.callbacks, options.duration, sortByTime);

			if(keyframes.length < 2) return;

			var numSegments = fixNumberOfSegments(keyframes, totalDuration);
			var numCallbacks = callbacks.length;

			// startAnimation sets an animation back to the starting values
			function startAnimation() {
				var startValues = getFirstSegmentValue(keyframes);

				if(startValues != null)
					frameCallback.call(using, startValues.slice(), options);

				if(typeof onstart === "function")
					onstart.call(using, elapsedTime / totalDuration, options);

				return resetAnimation();
			}

			// resetAnimation sets an animation back to the starting values
			// without triggering the frameCallback
			function resetAnimation() {
				elapsedTime = 0;
				currentSegment = 0;
				currentCallback = 0;

				segmentStart = keyframes[currentSegment++];
				segmentEnd = keyframes[currentSegment];
				segmentDuration = segmentEnd.time - segmentStart.time;

				lastFrame = +(new Date());
				return isPaused ? controlObj : playAnimation();
			}

			// playAnimation starts (or continues) an animation
			function playAnimation() {
				isPaused = false;
				cancelAnimFrame(timerId);
				startTime = (new Date()) - elapsedTime;
				timerId = requestAnimFrame( tickAnimation );
				if(typeof onplay === "function")
					onplay.call(using, elapsedTime / totalDuration, options);
				return controlObj;
			}

			// stopAnimation stops (or pauses) an animation
			function stopAnimation() {
				if(isPaused) return controlObj;
				isPaused = true;
				cancelAnimFrame(timerId);
				elapsedTime = (new Date()) - startTime;
				if(typeof onstop === "function")
					onstop.call(using, elapsedTime / totalDuration, options);
				return controlObj;
			}

			// finishAnimation stops an animation and calls frameCallback with the end values
			function finishAnimation() {
				stopAnimation();
				elapsedTime = totalDuration;

				var endValues = getLastSegmentValue(keyframes);

				if(endValues != null)
					frameCallback.call(using, endValues.slice(), options);

				if(typeof onend === "function")
					onend.call(using, elapsedTime / totalDuration, options);

				return controlObj;
			}

			// tickAnimation is called to evaluate each "frame" of an animation
			function tickAnimation(frameTime) {
				elapsedTime = frameTime - startTime;

				var frameInterval = frameTime - lastFrame;

				// animation time is the easing modified location in the animation
				var animationTime = totalDuration * easingFunction.call(using, elapsedTime / totalDuration, 0, 1, options);

				var segmentTime = animationTime - segmentStart.time;

				// fast foward through segments if necessary
				while(animationTime > segmentEnd.time && currentSegment < numSegments - 1) {
					// trigger any valid callbacks in the last segment that we
					// may have passed during this last frame interval
					while(currentCallback < numCallbacks && segmentStart.time >= callbacks[currentCallback].time) {
						var localCallbacks = callbacks[currentCallback++].fn;
						var numLocalCallbacks = localCallbacks.length;
						if(segmentStart.values != null) {
							for(var i = 0; i < numLocalCallbacks; i++) {
								localCallbacks[i].call(using, animationTime / totalDuration, options);
							}
						}
					}

					segmentStart = keyframes[currentSegment++];
					segmentEnd = keyframes[currentSegment];
					segmentTime = animationTime - segmentStart.time;
					segmentDuration = segmentEnd.time - segmentStart.time;
				}

				// trigger any valid callbacks remaining this last frame interval
				while(currentCallback < numCallbacks && animationTime >= callbacks[currentCallback].time) {
					var localCallbacks = callbacks[currentCallback++].fn;
					var numLocalCallbacks = localCallbacks.length;
					if(segmentStart.values != null && segmentEnd.values != null) {
						for(var i = 0; i < numLocalCallbacks; i++) {
							localCallbacks[i].call(using, animationTime / totalDuration, options);
						}
					}
				}

				// Handle end-of-animation
				if (elapsedTime >= totalDuration) {
					if (!loopAnim) finishAnimation();
					else resetAnimation();
				} else {

					// Skip this frame if the minimal interval hasn't been reached
					if(frameInterval < minInterval) return timerId = requestAnimFrame( tickAnimation );

					lastFrame = frameTime;

					// rewind through segments if necessary (for easing
					// functions that "go in reverse" like bounce) this 
					// is probably a bad idea
/*					while(animationTime < segmentStart.time && currentSegment >= 0) {
						segmentEnd = keyframes[currentSegment--];
						segmentStart = keyframes[currentSegment];
						segmentTime = animationTime - segmentStart.time;
						segmentDuration = segmentEnd.time - segmentStart.time;
					}
*/

					if(segmentStart.values != null && segmentEnd.values != null) {
						// interpolate values using provided interpolation function
						var currentValues = arrayMap.call(segmentStart.values, function(from, i, a){
							return anim.easeLinear.call(using, segmentTime / segmentDuration, from, this[i] - from, options);
						}, segmentEnd.values);
						frameCallback.call(using, currentValues, options);
					}

					// Let's get the next frame
					timerId = requestAnimFrame( tickAnimation );
				}

			}

			return startAnimation();
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

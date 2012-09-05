# TinYam
A tiny JavaScript library for animating pretty much anything.

Technically, TinYam is a library that gives you the ability to  interpolate any set of values over a period of time using any interpolation function.

## Installation

### Node.js

For *Node.js*, use `npm`:

````console
npm install tinyam
````

..then `require` TinYam:

````javascript
var TinYam = require('tinyam');
````

### In the browser, traditional

For the *browser*, add the following to your pages:

````html
<script src="tinyam.js"></script>
````

### In the browser, using AMD (require.js)

...Or using AMD in the browser:

````javascript
require(["tinyam"], function(TinYam) {
	// ...
});
````

## Usage

`TinYam` is one function that can be used to animate between two arrays of numbers.

### Basic

`TinYam` is one simple function and it takes just two parameters. The first is an options object and the second parameter is a function that will be called by `TinYam` for every frame.

````javascript
var animationControl = TinYam({ /* options */ }, frameCallback);

function frameCallback(frameValues) {
    /* do frame */
}

````

## Options

TinYam's default options are:

````javascript
defaults = {
    duration: 1000,
    from: [0],
    to: [1],
    easing: "easeLinear",
    using: window,
    paused: false,
    onfinish: null,
    onstop: null,
    onplay: null,
    maxFPS: 120
}
````

`duration` The number of milliseconds the animation is to run for.

`from` An array of starting values. At the beginning of the animation, your `frameCallback` function will be called with these values.

`to` An array of ending values. At the end of the animation, your `frameCallback` function will be called with these values.

`easing` A function used as the algorithm to interpolate the values in `from` to the values in `to`.

`using` An object that will be used as the `frameCallback`s `this`.

`paused` A boolean. If true, the animation starts in the `paused` state and must be started manually using the `animationControl` object returned by `TinYam`.

`onfinish` A function to call once the animation has reached the end.

`onstop` A function to call whenever the animation is stopped whether it has reached the end or not.

`onplay` A function to call whenever the animation has been started or restarted.

`maxFPS` A number that is the maximum number of times per second the `frameCallback` is to be called.

## Control

The `animationControl` object returned by `TinYam` has four functions used to control the progress of an animation. None of the functions take any parameters and all of the functions return the `animationControl` object allowing for convenient chaining of control commands.

`finish` Fast forwards the animation to the end values and stops.

`stop` Stops an animation where it is.

`play` Start or continues a stopped animation.

`reset` Rewinds the animation to the start values. If the animation was already playing it continues to play from the beginning but if the animation was stopped it remains stopped.

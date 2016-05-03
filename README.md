SpotThePlane
============

SpotThePlane is a user script for [flightradar24](http://flightradar24.com/) which make it easy to spot the actual plane you've selected in the sky. Just enter your coordinates, zoom to where you are and select a plane. On the left overlay containing information about the plane, a row is named *SpotThePlane* and contains the coordinates of the plane relative to *you*:

![Screenshot](screenshot.png)

 1. Enter your coordinates into the inputs at the top-left of the map
 2. Select a plane to see its details in the left panel
 3. The last row indicates the plane's coordinates relative to yours


## Installation

 1. Install a user script manager for your browser. Here are the most popular:
 
   * For **Firefox**: [Greasemonkey](https://addons.mozilla.org/en-US/firefox/addon/greasemonkey/)
 
   * For **Chrome** and **Safari**: [Tampermonkey](https://tampermonkey.net/)
 
   * For **Opera**: [Violent Monkey](https://openuserjs.org/about/Violentmonkey-for-Opera)

 2. [Click Here](https://raw.githubusercontent.com/foobuzz/SpotThePlane/master/SpotThePlane.user.js) to install the user script


## Reading the plane coordinates

The plane coordinates are written in the following format: `<azimuth> <elevation>° <distance>km`

 - `<azimuth>` indicates where the plane is in reference to the cardinal directions. `N` means North, `WNW` means West-North-West and so on.

 - `<elevation>` indicates where the plane is on the vertical axis. The value is the angle in degrees relative to the horizon. The horizon is at 0° and the zenith is at 90°. A good rule of thumb is that when you hold your fist at arm's length, then your fist spans 10° on the sky.

 - `<distance>` is the distance between you and the plane, in kilometers. It's useful to know if you need to search for a tiny dot or for a relatively big shape.

Note: if the plane's altitude is too low to allow for condensation trails to form, then the string `No trails` is appended to the coordinates. However, there might be planes leaving no trails even if the string is not present.
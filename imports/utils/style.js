
/**
 * Parse an HTML colour into its RGB components as integers.
 * 
 * @param {*HTML colour, for example "#ffaabb"} string 
 */
function rgb(string) {
    return string.match(/\w\w/g).map(function (b) { return parseInt(b, 16) })
}

/**
 * Get a unique HTML colour code derived from the provided string, and based on a set of 
 * palette colours.
 */
export const stringToColour = (str) => {
    // Determine a simple numeric hash of the string.
    let hash = 0;

    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // We need an absolute integer as input to the colour choosing algorithm.
    hash = Math.abs(hash);

    // Our colour palette. We choose two of these colours as our range, then pick a colour from that range.
    // TODO: move to a config file.
    // let colours = ["#F49814", "#FBC100", "#DB5461", "#686963", "#78C7C8"];
    let colours = ["#F49814", "#FBC100", "#DB5461", "#78C7C8"];
    // Bright red and blue for testing purposes
    // let colours = ["#ff0000", "#0000ff"];

    // Get the two colours that determine our range. In the comments we assume a palette of 5 colours.

    // Colour 1: the remainder of our hash divided by 5 to get an integer in 0..4
    let cIndex1 = hash % colours.length;

    // Colour 2: [index of colour 1 (0..4)] + [a deterministic value in 0..3 plus 1], again taking
    // the remainder of that to end up with 0..4 (but a different value than colour 1)
    let cIndex2 = ((hash * 7) % (colours.length - 1) + 1 + cIndex1) % colours.length;

    let colour1 = colours[cIndex1];
    let colour2 = colours[cIndex2];

    // console.log("Picking a color between:");
    // console.log("%c" + colour1, "color: " + colour1);
    // console.log("%c" + colour2, "color: " + colour2);

    let rgb1 = rgb(colour1);
    let rgb2 = rgb(colour2);

    var newRgb = [];

    // Adapted from: http://stackoverflow.com/a/23277879/81949
    // for (var i = 0; i < 3; i++) {
    //     // For example if colour 1 has an R value of 240 and colour 2 has an R value of 100,
    //     // we want to get a deterministic value in 100..240.

    //     // Get the absolute difference between the colour component in color 1 and 2.
    //     let diff = Math.abs(rgb2[i] - rgb1[i]);

    //     if (diff == 0) {
    //         newRgb[i] = rgb1[i];
    //         continue;
    //     }

    //     // Get the divide remainder from our hash code to determine, for example 50.
    //     let hashRemainder = hash % diff;

    //     // Now find the new value for the colour component by adding the remainder to
    //     // the lowest of the two values.
    //     newRgb[i] = Math.min(rgb1[i], rgb2[i]) + hashRemainder | 0;
    // }

    // Pure gradient variant: calculate a deterministic int in 0..255, then take that as the
    // relative point for all three colour components.
    let hashRemainder = hash % 256;

    for (var i = 0; i < 3; i++) {
        // Get the absolute difference between the colour component in color 1 and 2.
        let diff = rgb2[i] - rgb1[i];

        if (diff == 0) {
            newRgb[i] = rgb1[i];
            continue;
        }

        // Compute the relative difference. For example if colour 1 has an R value of 
        // 240 and colour 2 has an R value of 100, our diff is 140 and we want to get 
        // a value in 0..140 to add to 100.
        let relDiff = Math.round( diff * hashRemainder / 256 );

        // Now find the new value for the colour component by adding the remainder to
        // the colour 1 component.
        newRgb[i] = rgb1[i] + relDiff | 0;
    }

    // Convert back to HTML colour format and return.
    let newColour = '#' + newRgb
        .map(function (n) { return n.toString(16) })
        .map(function (s) { return "00".slice(s.length) + s }).join('');

    // console.log("Result:");
    // console.log("%c" + newHtmlColor, "color: " + newHtmlColor);

    return newColour;
}
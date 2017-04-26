
function rgb(string){
    return string.match(/\w\w/g).map(function(b){ return parseInt(b,16) })
}
/**
 * Get a unique HTML colour code derived from the provided string.
 */
export const stringToColour = (str) => {
    // Determine a simple numeric hash of the string.
    let hash = 0;        

    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }

    // We need an absolute integer as input to the colour choosing algorithm.
    hash = Math.abs(hash);

    console.log("Hash", hash);

    // The ranges are chosen from these colours.            
    let colours = ["#F49814", "#FBC100", "#DB5461", "#686963", "#78C7C8"];

    // Get the two colours that determine our range.           

    // Colour 1: the remainder of our hash divided by 5 to get an integer in 0..4
    let cIndex1 = hash % colours.length;

    // Colour 2: [index of colour 1 (0..4)] + [a deterministic value between 0 and 3 plus 1], again taking
    // the remainder to end up with 0..4 (but a different value than colour 1)
    let cIndex2 = ((hash * 7) % (colours.length - 1) + 1 + cIndex1) % colours.length;

    let colour1 = colours[cIndex1];
    let colour2 = colours[cIndex2];

    console.log("Picking a color between:");
    console.log("%c" + colour1, "color: " + colour1);
    console.log("%c" + colour2, "color: " + colour2);
    let rgb1 = rgb(colour1);
    let rgb2 = rgb(colour2);

    var newRgb = [];
    
    // Adapted from: http://stackoverflow.com/a/23277879/81949
    for (var i=0; i<3; i++) {
        let diff = Math.abs(rgb2[i]-rgb1[i]);

        if (diff == 0)
        {
            newRgb[i] = rgb1[i];
            continue;
        }

        let hashRemainder = hash % diff;

        if(rgb2[i] > rgb1[i])
            newRgb[i] = rgb1[i] + hashRemainder | 0;
        else
            newRgb[i] = rgb2[i] + hashRemainder | 0;
    }

    let newHtmlColor = '#' + newRgb
        .map(function(n){ return n.toString(16) })
        .map(function(s){ return "00".slice(s.length)+s}).join(''); 

    console.log("Result:");
    console.log("%c" + newHtmlColor, "color: " + newHtmlColor);

    return newHtmlColor;
}
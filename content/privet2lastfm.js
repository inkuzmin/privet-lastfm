var privet2lastfm = {
    init: function () {
        // The event can be DOMContentLoaded, pageshow, pagehide, load or unload.
        if (gBrowser) gBrowser.addEventListener('DOMContentLoaded', this.onPageLoad, false);
    },
    onPageLoad: function (aEvent) {
        var d = aEvent.originalTarget; // doc is document that triggered the event
        var w = d.defaultView; // win is the window for the doc
        // test desired conditions and do something
        // if (d.nodeName == "#document") return; // only documents
        // if (w != w.top) return; //only top window.
        // if (w.frameElement) return; // skip iframes/frames

        if (d.location.href.match('privet.ru')) {
            var style = d.createElement("link");
            style.type = 'text/css';
            style.rel = 'stylesheet';
            style.href = 'chrome://privet2lastfm/skin/ascii-player.css';
            d.head.appendChild(style);

            var A = ASCIIPlayer(d);
            var flashPlayers = Array.prototype.slice.call(d.getElementsByTagName('embed'),0);
            var len = flashPlayers.length,
                i;

            console.log(flashPlayers.length);
            for (i = 0; i < len; i += 1) {
                var flashPlayer = flashPlayers[i];
                var flashVars = flashPlayer.getAttribute('flashvars');
                var fileURL = getFileURL(flashVars);
//                console.log(fileURL);
//                if (fileURL !== -1) {
//                    flashPlayer.setAttribute('data-url', fileURL);
//                    var a = new A(flashPlayer, {
//                        title: '',
//                        format: ''
//                    });
//                    var a = d.createElement('a');
//                    a.href = fileURL;
//                    a.innerHTML = fileURL;
//                    flashPlayer.insertBefore(a);

//                }
            }
        }
    }
}
window.addEventListener('load', function load(event) {
    window.removeEventListener('load', load, false); //remove listener, no longer needed
    privet2lastfm.init();
}, false);


function getFileURL(flashVars) {
    flashVars = flashVars.split('&');
    var len = flashVars.length,
        j;
    for (j = 0; j < len; j += 1) {
        var flashVarPair = flashVars[j].split('=');
        if (flashVarPair[0] === 'file') return flashVarPair[1];
    }
    return -1;
}

// content dictionarytip	jar:chrome/dictionarytip.jar!/content/dictionarytip/ contentaccessible=yes
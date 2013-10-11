function LastFM(sess) {
    this.sess = sess;
    this._init();
}

LastFM.prototype = {
    constructor: LastFM,
    _init: function() {
        this.key = LastFM.KEY;
        this.secret = LastFM.SECRET;
        this.url = 'http://ws.audioscrobbler.com/2.0/';

    },
    _sendXMLRequest: function(url, params, callback, method) {

        var self = this;
        var xhr = new XMLHttpRequest();
        xhr.onreadystatechange = function() {
            (xhr.readyState == 4) ? (xhr.status == 200) ? callback.call(self, xhr.response) : null : null;
        }
        if (method) {
            xhr.open("POST", url +  params, true);
            xhr.send();
        } else {
            xhr.open("GET", url + params, true);
            xhr.send(null);
        }
    },
    getToken: function(fn) {
        this._sendXMLRequest(this.url, '?method=auth.gettoken&api_key='+this.key+'&format=json', fn);
    },
    getSession: function(token, fn) {
        var params = {
            'method': 'auth.getSession',
            'api_key': this.key,
            'token':  token
        }

        var str = '';
        for (param in params)
            str += param + '=' +  encodeURIComponent(params[param]) + '&';

        this._sendXMLRequest(this.url, '?' + str + 'format=json&api_sig=' + this._generateSigKey(params), fn);
    },

    getURL: function (token) {
        var url = 'http://www.last.fm/api/auth/?api_key='+this.key+'&token='+token;
        return url;
    },

    updateNowPlaying: function(a) {

        var params = {
            'method': 'track.updateNowPlaying',
            'duration': a[2],
            'artist': a[0].replace(/\&amp;/g,"and"),
            'track':  a[1].replace(/\&amp;/g,"and"),
            'api_key': this.key,
            'sk': this.sess
        }

        var str = ''
        for (param in params)
            str += param + '=' +  encodeURIComponent(params[param]) + '&';
//
//        console.log(params.artist);
//        console.log(params.track);

        this._sendXMLRequest(this.url, '?' + str + 'format=json&api_sig=' + this._generateSigKey(params), this._test, 1);

    },
    scrobble: function(a) {
        var params = {
            'method': 'track.scrobble',
            'artist': a[0].replace(/\&amp;/g,"and"),
            'track':  a[1].replace(/\&amp;/g,"and"),
            'api_key': this.key,
            'sk': this.sess,
            'timestamp': Math.round(+new Date()/1000)
        }

        var str = ''
        for (param in params)
            str += param + '=' +  encodeURIComponent(params[param]) + '&';

        this._sendXMLRequest(this.url, '?' + str + 'format=json&api_sig=' + this._generateSigKey(params), this._test, 1);


    },
    // lol: function(user, message) {
    //     var params = {
    //         'method': 'user.shout',
    //         'user': user,
    //         'message':  message,
    //         'api_key': this.key,
    //         'sk': this.sess
    //     };
    //     var str = '';
    //     for (param in params) {
    //         str += param + '=' +  encodeURIComponent(params[param]) + '&';
    //             }
    //     this._sendXMLRequest(this.url, '?' + str + 'format=json&api_sig=' + this._generateSigKey(params), this._test, 1);


    // },
    _test: function(a) {
        console.log(a);
    },
    _generateSigKey: function(params) {
        var sortedKeys = Object.keys(params).sort(function(a, b){return a.localeCompare(b);})

        var str = ''
        for (var key in sortedKeys)
            str += sortedKeys[key] + params[sortedKeys[key]]

        var sigObject = new MD5Sum(str + this.secret);

        return sigObject.hexdigest();
    }

}

LastFM.KEY = '';
LastFM.SECRET = '';
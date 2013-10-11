(function () {

var  Cc = Components.classes;
var  Ci = Components.interfaces;
var NS_SEEK_SET = Ci.nsISeekableStream.NS_SEEK_SET;
var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);


var httpRequestObserver = {
    observe: function(aSubject, aTopic, aData) {
        if (aTopic == "http-on-examine-response") {
            var newListener = new TracingListener();
            aSubject.QueryInterface(Ci.nsITraceableChannel);
            newListener.originalListener = aSubject.setNewListener(newListener);
        }
    },
    QueryInterface : function (aIID) {
        if (aIID.equals(Ci.nsIObserver) || aIID.equals(Ci.nsISupports)) {
            return this;
        }

        throw Components.results.NS_NOINTERFACE;

    }
};


function TracingListener() {
    this.originalListener = null;
}
TracingListener.prototype = {
    broadcast:function (eventType, data) {
        var self = this;
        data = data || null;
        Observer.broadcast(eventType, data);
    },
    onDataAvailable: function(request, context, inputStream, offset, count) {
        this.originalListener.onDataAvailable(request, context, inputStream, offset, count);

    },

    onStartRequest: function(request, context) {
        this.originalListener.onStartRequest(request, context);

        if (request && request.name === 'http://music.privet.ru/callback.php') {
//            try {
                var text = this.readPostTextFromRequest(request, context);
//                console.log(text);
                var pairs = text.split('&');
                var i, len = pairs.length;
                var start = false;
                var id = null;
                for (i = 0; i < len; i += 1) {
                    var pair = pairs[i].split('=');
                    if (pair[0] === 'state' && pair[1] === 'start') {
                        start = true;
                    }
                    if (pair[0] === 'id') {
                        id = pair[1];
                    }

                }

                if (start && id) {
                    this.broadcast('PLAY', id);
                }
//            }
//            catch (err) {
//                console.log(err)
//            }
        }

    },

    onStopRequest: function(request, context, statusCode) {
        this.originalListener.onStopRequest(request, context, statusCode);

    },

    QueryInterface: function (aIID) {
        if (aIID.equals(Ci.nsIStreamListener) ||
            aIID.equals(Ci.nsISupports)) {
            return this;
        }
        throw Components.results.NS_NOINTERFACE;
    },

    readPostTextFromRequest: function(request, context)
    {
            var is = request.QueryInterface(Ci.nsIUploadChannel).uploadStream;
            if (is)
            {
                var ss = is.QueryInterface(Ci.nsISeekableStream);
                var prevOffset;
                if (ss)
                {
                    prevOffset = ss.tell();
                    ss.seek(NS_SEEK_SET, 0);
                }

                // Read data from the stream..
                var charset = (context && context.window) ? context.window.document.characterSet : null;
                var text = this.readFromStream(is, charset, true);

                // Seek locks the file so, seek to the beginning only if necko hasn't read it yet,
                // since necko doesn't seek to 0 before reading (at lest not till 459384 is fixed).
                if (ss && prevOffset == 0)
                    ss.seek(NS_SEEK_SET, 0);

                return text;
            }

        return null;
    },
    readFromStream: function(stream, charset, noClose)
    {
        var sis = Cc["@mozilla.org/binaryinputstream;1"].getService(Ci.nsIBinaryInputStream);
        sis.setInputStream(stream);

        var segments = [];
        for (var count = stream.available(); count; count = stream.available())
            segments.push(sis.readBytes(count));

        if (!noClose)
            sis.close();

        var text = segments.join("");

        return text;
    }
}


observerService.addObserver(httpRequestObserver, "http-on-examine-response", false);
})();
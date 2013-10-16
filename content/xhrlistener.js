(function () {
    var Cc = Components.classes;
    var Ci = Components.interfaces;
    var NS_SEEK_SET = Ci.nsISeekableStream.NS_SEEK_SET;
    var observerService = Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);


    var httpRequestObserver = {
        observe: function (aSubject, aTopic, aData) {
            if (aTopic == "http-on-examine-response") {
                var newListener2 = new TracingListener();
                aSubject.QueryInterface(Ci.nsITraceableChannel);
                newListener2.originalListener = aSubject.setNewListener(newListener2);
            }
        },
        QueryInterface: function (aIID) {
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
        broadcast: function (eventType, data) {
            data = data || null;
            Observer.broadcast(eventType, data);
        },
        onDataAvailable: function (request, context, inputStream, offset, count) {
            this.originalListener.onDataAvailable(request, context, inputStream, offset, count);

        },

        onStartRequest: function (request, context) {
            this.originalListener.onStartRequest(request, context);

            if (request && request.name === 'http://music.privet.ru/callback.php') {
//            try {

                var text = this.readPostTextFromRequest(request, context);
                var header = (request && request.getRequestHeader && request.getRequestHeader('X-Privet')) || null;

                var pairs = text.split('&');
                var i, len = pairs.length;
                var type, id, duration;
                for (i = 0; i < len; i += 1) {
                    var pair = pairs[i].split('=');
                    switch (pair[0]) {
                        case 'state':
                            type = pair[1];
                            break;
                        case 'id':
                            id = pair[1];
                            break;
                        default:
                            if (pair[0].indexOf('duration') > -1)
                                duration = pair[1];
                    }
                }


                if (type && id && header) {
                    this.broadcast('CALLBACK', {
                        id: id,
                        type: type,
                        from: header,
                        duration: duration
                    });
                }
            }

        },

        onStopRequest: function (request, context, statusCode) {
            this.originalListener.onStopRequest(request, context, statusCode);

        },

        QueryInterface: function (aIID) {
            if (aIID.equals(Ci.nsIStreamListener) ||
                aIID.equals(Ci.nsISupports)) {
                return this;
            }
            throw Components.results.NS_NOINTERFACE;
        },

        readPostTextFromRequest: function (request, context) {
            var is = request.QueryInterface(Ci.nsIUploadChannel).uploadStream;
            if (is) {
                var ss = is.QueryInterface(Ci.nsISeekableStream);
                var prevOffset;
                if (ss) {
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
        readFromStream: function (stream, charset, noClose) {
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

var HTTPRequestObserver = {
    observe: function (subject, topic, data) {
        if (topic == "http-on-modify-request") {
            var httpChannel = subject.QueryInterface(Ci.nsIHttpChannel);
            var url = subject.URI.spec;
            if (url === 'http://music.privet.ru/callback.php') {
                httpChannel.setRequestHeader("X-Privet", this.header, false);
            }

        }
    },

    get observerService() {
        return Cc["@mozilla.org/observer-service;1"].getService(Ci.nsIObserverService);
    },

    register: function (header) {
        this.observerService.addObserver(this, "http-on-modify-request", false);
        this.header = header;
        return this;
    },

    unregister: function (that) {
        this.observerService.removeObserver(that, "http-on-modify-request");
    }
}
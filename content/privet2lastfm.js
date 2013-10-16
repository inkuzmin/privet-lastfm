var privet2lastfm = function () {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var scrobblingPercent = prefManager.getIntPref('extensions.privet2lastfm.scrobblingPercent');

    var xmlSlot = {};
    var lastFMslot;
    var privetUser = '';
    var playlists = [];


    function TrackList() {
        this.list = [];
        this.id = Math.random();
    }

    TrackList.prototype = {
        constructor: TrackList,
        add: function (track) {
            return this.list.push(track);
        },
        getTop: function () {
            return this.list[this.list.length - 1];
        },
        topToBottom: function () {
            this.list.unshift(this.list.pop());
        },
        toTop: function (track) {
            var track = this.removeTrack(track);
            this.list.push(track);
        },
        toBottom: function (track) {
            var track = this.removeTrack(track);
            this.list.unshift(track);
        },
        reach: function (fn) {
            for (var i = this.list.length; --i;) {
                if (fn(this.list[i])) return;
            }
        },
        each: function (fn) {
            var i, len = this.list.length;
            for (i = 0; i < len; i += 1) {
                if (fn(this.list[i])) return;
            }
        },
        getById: function (id) {
            var i, len = this.list.length;
            for (i = 0; i < len; i += 1) {
                var track = this.list[i];
                if (track.id === id) {
                    return track;
                }
            }
            return false;
        },
        removeById: function (id) {
            var i, len = this.list.length;
            for (i = 0; i < len; i += 1) {
                var track = this.list[i];
                if (track.id === id) {
                    return this.list.splice(i, 1)[0];
                }
            }
        },
        removeTrack: function (track) {
            return this.removeById(track.id);
        }


    }
    var tracks = new TrackList();


    function Page(doc) {
        this.d = doc;
        this.init();
    }

    Page.prototype = {
        constructor: Page,
        init: function () {
            this.initSlots();
            this.bindCommonHandlers();
            this.bindPrivetHandlers();

        },
        initSlots: function () {
            this.tracks = new TrackList();
            this.w = this.d.defaultView;
            this.location = this.d.location.href;
            this.additionalHeaderAdder = null;
        },
        addEventHandler: function (eventType, eventHandler) {
            var self = this;
            Observer.subscribe(eventType, eventHandler, self);
        },
        removeEventHandler: function (eventType, eventHandler) {
            var self = this;
            Observer.unsubscribe(eventType, eventHandler, self);
        },

        broadcast: function (eventType, data) {
            data = data || null;
            Observer.broadcast(eventType, data);
        },
        bindCommonHandlers: function () {
            var self = this;
            self.additionalHeaderAdder = HTTPRequestObserver.register(self.location);

            function playEventPath(data) {
                console.log(self.location, data.from);
                if (self.location === data.from) {
                    console.log(data);
                    self.playEventPath(data);
                }
            }

            self.addEventHandler('CALLBACK', playEventPath);

            self.w.addEventListener('unload', function (e) { // Close tab or change location
                HTTPRequestObserver.unregister(self.additionalHeaderAdder);
                self.removeEventHandler('CALLBACK', playEventPath);
                self.leavePagePath(e);
            }, false);

        },
        bindPrivetHandlers: function () {
            var self = this;
            main();
            this.w.addEventListener('load', main, false); // one more for lacked players

            function main() {
                if (self.location.match('music.privet.ru')) {

                    var urlArray = self.location.split('/');
                    var j, l = urlArray.length;
                    for (j = 0; j < l; j += 1) {
                        if (urlArray[j] === 'user') {
                            privetUser = urlArray[j + 1];
                            break;
                        }
                    }
                    var flashPlayers = self.d.getElementsByTagName('embed');

                    var len = flashPlayers.length,
                        i;

                    for (i = 0; i < len; i += 1) {
                        var flashPlayer = flashPlayers[i];

                        if (flashPlayer.getAttribute('wmode') !== 'transparent') {
                            var id = flashPlayer.id;

                            flashPlayer.setAttribute('wmode', 'transparent');


                            var temp = flashPlayer.parentNode.innerHTML;
                            flashPlayer.parentNode.innerHTML = temp + '•';

                            flashPlayer = self.d.getElementById(id);


                            flashPlayer.parentNode.addEventListener('mousedown', function (e) {
                                self.embedClickPath(e);
                            }, false);

                            flashPlayer.parentNode.addEventListener('keydown', function (e) {
                                self.embedSpacePressPath(e);
                            }, false);
                        }
                    }
                }

            }
        },
        _getPlayerByClickedNode: function (node) {
            var self = this;

            var id = getTrackId(node);
            var i, len = self.tracks.length;
            for (i = 0; i < len; i += 1) {
                var track = self.tracks[i];
                if (track.id === id) {
                    return track;
                }
            }
            var track = new Track(id, node);
            return track;
        },
        _getPlayerById: function (id) {
            var self = this;

            var i, len = self.tracks.length;
            for (i = 0; i < len; i += 1) {
                var track = self.tracks[i];
                if (track.id === id) {
                    return track;
                }
            }
            return false;
        },
        _isEqualizer: function (flashVars) {
            flashVars = flashVars.split('&');
            var len = flashVars.length,
                j;
            for (j = 0; j < len; j += 1) {
                var flashVarPair = flashVars[j].split('=');
                if (flashVarPair[0] === 'showeq') return flashVarPair[1];
            }
            return false;
        },

        _clickWasUnderTheZone: function (e) {
            var node = e.target;
            var flashVars = node.getAttribute('flashvars');
            var rectObject = node.getBoundingClientRect();
            var clickX = e.clientX;
            var clickY = e.clientY;
            if (this._isEqualizer(flashVars)) {
                if (clickX > rectObject.left + 1 && clickX < rectObject.left + rectObject.width &&
                    clickY > rectObject.top && clickY < rectObject.top + 61) {
                    return true;
                }
                else if (clickX > rectObject.left + 1 && clickX < rectObject.left + 18 &&
                    clickY > rectObject.top + 61 && clickY < rectObject.top + 81) {
                    return true;
                }
            }
            else {
                if (clickX > rectObject.left && clickX < rectObject.left + 18 &&
                    clickY > rectObject.top && clickY < rectObject.top + 20) {
                    return true;
                }
            }
            return false;
        },
        _getTrackIdByNode: function (node) {
            var id = node.id.substr(3);
            return id;
        },
        _getNodeByTrackId: function (id) {
            var node = this.d.getElementById('mj_' + id);
            return node;
        },
        _getFileURL: function (flashVars) {
            flashVars = flashVars.split('&');
            var len = flashVars.length,
                j;
            for (j = 0; j < len; j += 1) {
                var flashVarPair = flashVars[j].split('=');
                if (flashVarPair[0] === 'file') return flashVarPair[1];
            }
            return -1;
        },
        _isPlayerMono: function (node) {
            var flashVars = node.getAttribute('flashvars');
            var fileName = getFileURL(flashVars);
            if (fileName.substr(-3, 3) === 'xml') {
                return false;
            }
            return true;
        },

        toggle: function (track) {
            var self = this;
            if (track.play) {
                self.play(track);
            } else {
                self.pause(track);
            }

        },
        play: function (track) {
            track.play = false;
            track.addTimeStop();
            tracks.toBottom(track);
            tracks.reach(function (track) {
                console.log(track.title + ' = ' + track.play)
                if (track.play) {
                    track.updateNowPlaying();
                    return true;
                }
                return false;
            })
        },
        pause: function (track) {
            var self = this;
            track.play = true;
            track.addTimeStart();
            self.tracks.each(function (track) {
                track.toScrobbleOrNotToScrobble();
            });
            tracks.toTop(track);
            track.updateNowPlaying();
        },
        stop: function (track) {
            var self = this;
            track.listenTime = data.duration;
            track.toScrobbleOrNotToScrobble();
            tracks.removeTrack(track);
            self.tracks.removeTrack(track);
        },
        embedPath: function (node) {
            var self = this;
            var id = self._getTrackIdByNode(node);
            var track = self.tracks.getById(id);


            if (track) {
                self.toggle(track);
            }
            else {
                var nodeById = self._getNodeByTrackId(id);
                if (node === nodeById) {
                    console.log('PATH #1');
                    track = new Track(id, node);
                    if (self.location.match('playlist')) {
                        var urlArray = self.location.split('/');
                        var j, l = urlArray.length;
                        for (j = 0; j < l; j += 1) {
                            if (urlArray[j] === 'playlist') {
                                var playlistid = urlArray[j + 1];
                                break;
                            }
                        }
                        track.setPlaylistID(playlistid);
                    }
                    track.init();
                    self.play(track);
                } else {
                    console.log('PATH #2');
                    track = new Track(0, node); // tracks with 0 as id are the mocks
                }
                self.tracks.add(track);
                tracks.add(track);
            }
        },

        embedClickPath: function (e) {
            var self = this;

            if (self._clickWasUnderTheZone(e)) {
                self.embedPath(e.target);
            }
        },
        embedSpacePressPath: function (e) {
            this.embedPath(e.target);
        },
        playEventPath: function (data) {
            var self = this;
            var id = data.id;
            var track = self.tracks.getById(data.id);

            if (data.type === 'start') {
                if (track === false) {
                    track = self.tracks.getById(0);
                    if (track) {
                        track.setId(id);
                        if (self.location.match('playlist')) {
                            var urlArray = self.location.split('/');
                            var j, l = urlArray.length;
                            for (j = 0; j < l; j += 1) {
                                if (urlArray[j] === 'playlist') {
                                    var playlistid = urlArray[j + 1];
                                    break;
                                }
                            }
                            track.setPlaylistID(playlistid);
                        }
                        track.init();
                    }
                    else {
                        var node = self._getNodeByTrackId(id);
                        track = new Track(id, node);
                        if (self.location.match('playlist')) {
                            var urlArray = self.location.split('/');
                            var j, l = urlArray.length;
                            for (j = 0; j < l; j += 1) {
                                if (urlArray[j] === 'playlist') {
                                    var playlistid = urlArray[j + 1];
                                    break;
                                }
                            }
                            track.setPlaylistID(playlistid);
                        }
                        track.init();
                        self.tracks.add(track);
                        tracks.add(track);
                    }
                }
                if (track && track.play === undefined) {
                    self.toggle(track);
                }
                else {
                    console.log('Do nothing...');
//                    track.updateNowPlaying();
                }

            }
            else if (data.type === 'stop') {
                if (track) {
                    self.stop(track);
                }

            }
        },
        leavePagePath: function (e) {
            var self = this;
            self.tracks.each(function (track) {
                track.toScrobbleOrNotToScrobble();
                tracks.removeTrack(track);
            });
            tracks.reach(function (track) {
                if (track.play) {
                    track.updateNowPlaying();
                    return true;
                }
                return false;
            })
            self.tracks = undefined;
        }

    }


    function Track(id, target) {
        this.id = id;
        this.target = target;
        this.initSlots();
    }

    Track.prototype = {
        constructor: Track,
        init: function () {
            this.addTimeStart();
            this.getOtherFromNode();
        },
        setId: function (id) {
            this.id = id;
        },
        setPlaylistID: function (plid) {
            this.playlist = plid;
        },
        initSlots: function () {
            this.timestart = [];
            this.timestop = [];
            this.play;
            this.duration = 0;
            this.listenTime = null;
            this.title = '';
            this.artist = '';
            this.playlist;
        },
        addEventHandler: function (eventType, eventHandler) {
            var self = this;
            Observer.subscribe(eventType, eventHandler, self);
        },

        broadcast: function (eventType, data) {
            data = data || null;
            Observer.broadcast(eventType, data);
        },
        addTimeStart: function () {
            var timestamp = new Date().getTime();
            this.timestart.push(timestamp);

        },
        addTimeStop: function () {
            var timestamp = new Date().getTime();
            this.timestop.push(timestamp);
        },
        getOtherFromNode: function () {
            var self = this;
            var node;

            if (self.playlist) {
                getXML(self.playlist, function (xmlData) {
                    node = self.getNode(xmlData);
                    if (node) {
                        self.getOther(node);
                    }
                }, true);
            }
            else {

                node = self.getNode();
                if (node) {
                    self.getOther(node);
                }
                else {
                    getXML(privetUser, function (xmlData) {
                        node = self.getNode(xmlData);
                        if (node) {
                            self.getOther(node);
                        }
                    })
                }
            }
        },
        getOther: function (node) {
            var self = this;
            self.title = self.getTitle(node);
            self.artist = self.getArtist(node);
            self.getDuration(node, function (duration) {
                var a = [];
                a[0] = self.artist;
                a[1] = self.title;
                a[2] = duration;
                lastFMslot.updateNowPlaying(a);
            });
        },
        getNode: function (xmlDB) {
            var self = this;


            function getNodeById(ids) {
                var i, len = ids.length;
                for (i = 0; i < len; i += 1) {
                    var id = ids[i];
                    if (id.firstChild.nodeValue === self.id) {
                        return id.parentNode;
                    }
                }
                return false;
            }

            xmlDB = xmlDB || xmlSlot;

            var doc = xmlDB.documentElement;
            var ids = doc.getElementsByTagName('identifier');
            var node = getNodeById(ids);
            return node;

        },
        getTitle: function (node) {
            return node.firstChild.firstChild.nodeValue;
        },
        getArtist: function (node) {
            return node.lastChild.firstChild.nodeValue;
        },
        getDuration: function (node, fn) {
            var self = this;
            var url = node.children[1].firstChild.nodeValue;
            var xhr = new XMLHttpRequest();
            xhr.onreadystatechange = function () {
                if (xhr.readyState === 4) {
                    if (xhr.status === 200)
                        var duration = xhr.getResponseHeader('Content-Length');
                    var sec = Math.floor((duration / 8 / 128000) * 60);
                    self.duration = sec;
                    fn(sec);
                }
            };
            xhr.open('HEAD', url, true);
            xhr.send(null);
        },
        toScrobbleOrNotToScrobble: function () {
            var self = this;
            var realDuration;

            if (self.listenTime) {
                realDuration = self.listenTime * 1000;
            } else {
                var i, len = this.timestop.length;
                var timestops = 0;
                for (i = 0; i < len; i += 1) {
                    timestops += this.timestop[i];
                }
                var len = this.timestart.length;
                var timestarts = 0;
                for (i = 0; i < len; i += 1) {
                    timestarts += this.timestart[i];
                }
                realDuration = timestops - timestarts;
            }

            if (realDuration > (scrobblingPercent * this.duration * 1000 / 100) && this.duration) {
                console.log('SCROBBLE')
                var a = [];
                a[0] = this.artist;
                a[1] = this.title;
                lastFMslot.scrobble(a);
            }
            else {
                console.log('DO NOT SCROBBLE')
            }
        },
        updateNowPlaying: function () {
            console.log('UPDATE LISTENING');
            var a = [];
            a[0] = this.artist;
            a[1] = this.title;
            a[2] = this.duration;
            lastFMslot.updateNowPlaying(a);
        },
        drop: function () {
            if (this.play) {
                this.play = false;
                this.addTimeStop();
            }
            this.toScrobbleOrNotToScrobble();
        }
    }


    function getXML(username, fn, playlistp) {

        if (playlistp) {
            var url = 'http://music.privet.ru/music-play-playlist/XSPF/' + username + '.xml';
            var xhr = new XMLHttpRequest();
            xhr.onload = function () {
                xml = this.responseXML;
                fn(xml);
            }
            xhr.open('GET', url, true);
            xhr.send();
        }
        else {
            function getId(d) {
                var pNodes = d.getElementsByTagName('p');
                var i, len = pNodes.length;
                for (i = 0; i < len; i += 1) {
                    var id = pNodes[i].id;
                    if (id) return id;
                }
                return -1;
            }

            var xml, url, xhr = new XMLHttpRequest();
            xhr.onload = function () {
                var responseDoc = this.responseXML;
                var pid = getId(responseDoc);

                if (pid !== -1) {
                    url = 'http://music.privet.ru/music-play-service/XSPF/' + pid.substr(3) + '.xml';

                    var xhr = new XMLHttpRequest();
                    xhr.onload = function () {
                        xml = this.responseXML;
                        fn(xml);
                    }
                    xhr.open('GET', url, true);
                    xhr.send();
                }
            }

            xhr.open('GET', 'http://music.privet.ru/user/' + username + '/play', true);
            xhr.responseType = 'document';
            xhr.send();
        }
    }

    return {
        init: function () {
            var self = this;
            gBrowser.addEventListener('DOMContentLoaded', function (aEvent) {
                self.onPageLoad(aEvent);
            }, false);
        },

        tryLastFMsess: function () {
//            prefManager.setCharPref('extensions.privet2lastfm.lastfmSess', '');
        },
        loadXML: function (username) {
            username = username || prefManager.getCharPref('extensions.privet2lastfm.username');
            if (username) {
                getXML(username, function (xml) {
                    xmlSlot = xml;
                    console.log('xml loaded');
                });
            }
        },
        addScrobbling: function () {
            var self = this;

            var lastfmSess = prefManager.getCharPref('extensions.privet2lastfm.lastfmSess');
            var scrobbling = prefManager.getBoolPref('extensions.privet2lastfm.scrobbling');

            if (scrobbling) {
                if (lastfmSess) {
                    lastFMslot = new LastFM(lastfmSess);
                    lastFMslot.touch(function (r) {
                        if (JSON.parse(r).error) {
                            prefManager.setCharPref('extensions.privet2lastfm.lastfmSess', '');
                            self.addScrobbling();
                        }
                    });
                }
                else {
                    self.authorize();

                }
            }
        },
        authorize: function () {
            var self = this;
            var lastFM = new LastFM('');
            lastFM.getToken(function (r) {
                var token = JSON.parse(r).token;
                var url = this.getURL(token);
                var actualTab = gBrowser.addTab(url);
                gBrowser.selectedTab = actualTab;
                var newTabBrowser = gBrowser.getBrowserForTab(actualTab);
                newTabBrowser.addEventListener('DOMContentLoaded', function () {
                    var doc = newTabBrowser.contentDocument;
                    var forms = doc.getElementsByTagName('form');
                    var i, len = forms.length;
                    for (i = 0; i < len; i += 1) {
                        var form = forms[i];
                        if (form.action.indexOf('/api/grantaccess') !== -1) {
                            console.log(3);
                            form.addEventListener('submit', function () {
                                console.log(4);
                                var getSess = function (r) {
                                    setTimeout(function () {
                                        var sess = (JSON.parse(r).session && JSON.parse(r).session['key']) || null;
                                        console.log(r);
                                        if (sess) {
                                            prefManager.setCharPref('extensions.privet2lastfm.lastfmSess', sess);
                                            alert('Access granted, thank you!\nNow go to privet.ru and listen your music.\nTracks will scrobble in automatic way.');
                                            self.addScrobbling();
                                        }
                                        else {
                                            lastFM.getSession(token, getSess);
                                        }
                                    }, 1000);
                                };
                                lastFM.getSession(token, getSess);
                            }, false);
                        }
                    }
                }, true);

            });
        },
        changeScrobblingPercent: function () {
            scrobblingPercent = prefManager.getIntPref('extensions.privet2lastfm.scrobblingPercent');
        },
        onPageLoad: function (aEvent) {
            var page = new Page(aEvent.originalTarget);
        }
    }
}();

window.addEventListener('load', function load() {
    window.removeEventListener('load', load, false);
    privet2lastfm.init();
}, false);

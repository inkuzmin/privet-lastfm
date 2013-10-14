var privet2lastfm = function () {
    var prefManager = Components.classes["@mozilla.org/preferences-service;1"].getService(Components.interfaces.nsIPrefBranch);
    var xmlSlot = {};
    var lastFMslot;
    var scrobblingPercent = prefManager.getIntPref('extensions.privet2lastfm.scrobblingPercent');
    var browser;

    var lastActivePlayer = null;
    var privetUser = '';

    var tracks = [];

//    function getFileURL(flashVars) {
//        //  var flashVars = flashPlayer.getAttribute('flashvars');
//        flashVars = flashVars.split('&');
//        var len = flashVars.length,
//            j;
//        for (j = 0; j < len; j += 1) {
//            var flashVarPair = flashVars[j].split('=');
//            if (flashVarPair[0] === 'file') return flashVarPair[1];
//        }
//        return -1;
//    }

//    function appendStyles(d) {
//        var style = d.createElement("link");
//        style.type = 'text/css';
//        style.rel = 'stylesheet';
//        style.href = 'chrome://privet2lastfm/skin/skin.css';
//        d.head.appendChild(style);
//    }


    function Track(id, target) {
        this.id = id;
        this.target = target;
        this.init();

    }

    Track.prototype = {
        constructor: Track,
        init: function () {
            this.initSlots();
            this.addTimeStart();
            this.play = true;
            this.getOtherFromNode();
        },
        initSlots: function () {
            this.timestart = [];
            this.timestop = [];
            this.play = false;
            this.duration = 0;
            this.title = '';
            this.artist = '';
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
            // если первый таймстарт -- послать ласту запрос на обновление текущего трека
            var timestamp = new Date().getTime();
            this.timestop.push(timestamp);
        },
        getOtherFromNode: function () {
            var self = this;
            var node = self.getNode();
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
            // поискать в xmlSlot
            // если нет, проверить адрес
            //   если адрес соответствует юзернейму -- перезагрузить xmlSlot
            //   если нет -- взять xmlSlot нового адреса
            //     поискать в нем
            //     если нет - увы
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
            // из getNode
            return node.firstChild.firstChild.nodeValue;
        },
        getArtist: function (node) {
            // из getNode
            return node.lastChild.firstChild.nodeValue;
        },
        getDuration: function (node, fn) {
            // взять путь из getNode
            // получить заголовок, вычислить размер, как-то так:
            /*
             req.onreadystatechange = function() {
             if (req.readyState === 4) {
             if (req.status === 200)
             req.getResponseHeader('Content-Length')
             }
             };
             req.open('HEAD', url, true);
             req.send(null);
             */
            // поделить на битрейт (128)
            // получились секунды, записать.
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
            var realDuration = timestops - timestarts;

            console.log(realDuration)
            console.log((scrobblingPercent * this.duration / 100))

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

            // все таймстопы минус все таймстарты > scrobblingPercent * duration / 100, то скроблить, если нет, то увы
        },
        drop: function () {
            // если состояние плей --
            //   перевести в состояние стоп,
            //   добавить таймстоп
            //   вызвать тускроблорноттускробл
            //   обнулить поля
            // иначе
            //   вызвать тускроблорноттускробл
            //   обнулить поля

            if (this.play) {
                this.play = false;
                this.addTimeStop();
            }
            this.toScrobbleOrNotToScrobble();
        }
    }


    var currentTrack = {
        id: null, // *
        tab: null,
        target: null, // *
        timestart: [],
        timestop: [],
        play: false,
        duration: 0,
        title: '',
        artist: '',
        mono: false,
        url: null,

        _node: null,

        addTimeStart: function () {
            var timestamp = new Date().getTime();
            this.timestart.push(timestamp);

        },

        addTimeStop: function () {
            // если первый таймстарт -- послать ласту запрос на обновление текущего трека
            var timestamp = new Date().getTime();
            this.timestop.push(timestamp);
        },
        clearFileds: function () {
            this.id = null;
            this.tab = null;
            this.target = null;
            this.timestart = [];
            this.timestop = [];
            this.play = false;
            this.duration = 0;
            this.title = '';
            this.artist = '';
            this.mono = false;
            this.url = null;
        },
        drop: function () {
            // если состояние плей --
            //   перевести в состояние стоп,
            //   добавить таймстоп
            //   вызвать тускроблорноттускробл
            //   обнулить поля
            // иначе
            //   вызвать тускроблорноттускробл
            //   обнулить поля

            if (this.play) {
                this.play = false;
                this.addTimeStop();
                this.toScrobbleOrNotToScrobble();
                this.clearFileds()
            }
            else {
                this.toScrobbleOrNotToScrobble();
                this.clearFileds()
            }

//            console.log(this);
        },

        toScrobbleOrNotToScrobble: function () {
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

//            console.log(this.timestop);
//            console.log(this.timestart);

            var realDuration = timestops - timestarts;

            console.log(realDuration)
            console.log((scrobblingPercent * this.duration / 100))

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

            // все таймстопы минус все таймстарты > scrobblingPercent * duration / 100, то скроблить, если нет, то увы
        },
        getOther: function () {
            var self = this;
            var node = self.getNode();
            if (node) {
                self.title = self.getTitle(node);
                self.artist = self.getArtist(node);
                self.getDuration(node, function (duration) {
                    var a = [];
                    a[0] = self.artist;
                    a[1] = self.title;
                    a[2] = duration;
                    lastFMslot.updateNowPlaying(a);
                });
            }
            else {
                getXML(privetUser, function (xmlData) {
                    node = self.getNode(xmlData);
                    if (node) {

                        self.title = self.getTitle(node);
                        self.artist = self.getArtist(node);
                        self.getDuration(node, function (duration) {
                            var a = [];
                            a[0] = self.artist;
                            a[1] = self.title;
                            a[2] = duration;
                            lastFMslot.updateNowPlaying(a);
                        });
                    }
                })
            }
        },
        getNode: function (xmlDB) {
            // поискать в xmlSlot
            // если нет, проверить адрес
            //   если адрес соответствует юзернейму -- перезагрузить xmlSlot
            //   если нет -- взять xmlSlot нового адреса
            //     поискать в нем
            //     если нет - увы
            var self = this;

            function getNodeById(ids) {
                var i, len = ids.length;
                for (i = 0; i < len; i += 1) {
                    var id = ids[i];
                    if (id.firstChild.nodeValue === self.id) {
//                        console.log(self.id, id.firstChild.nodeValue);
                        return id.parentNode;
                    }
                }
                return false;
            }

            xmlDB = xmlDB || xmlSlot;

            var doc = xmlDB.documentElement;
            var ids = null;
            ids = doc.getElementsByTagName('identifier');
            var node = null;
            node = getNodeById(ids);
//            console.log(node);
            return node;

        },
        getTitle: function (node) {
            // из getNode
            return node.firstChild.firstChild.nodeValue;
        },
        getArtist: function (node) {
            // из getNode
            return node.lastChild.firstChild.nodeValue;
        },
        getDuration: function (node, fn) {
            // взять путь из getNode
            // получить заголовок, вычислить размер, как-то так:
            /*
             req.onreadystatechange = function() {
             if (req.readyState === 4) {
             if (req.status === 200)
             req.getResponseHeader('Content-Length')
             }
             };
             req.open('HEAD', url, true);
             req.send(null);
             */
            // поделить на битрейт (128)
            // получились секунды, записать.
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

        addEventHandler: function (eventType, eventHandler) {
            var self = this;
            Observer.subscribe(eventType, eventHandler, self);
        },

        broadcast: function (eventType, data) {
            data = data || null;
            Observer.broadcast(eventType, data);
        },
        add: function (id, target) {
            this.id = id;
            this.target = target;
            this.addTimeStart();
            this.play = true;
            // послать ласту запрос на обновление текущего трека

            console.log('TRACK CREATED WITH ID', id);
            this.getOther();


        }
    };

    function getXML(username, fn) {
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

    function getId(d) {
        var pNodes = d.getElementsByTagName('p');
        var i, len = pNodes.length;
        for (i = 0; i < len; i += 1) {
            var id = pNodes[i].id;
            if (id) return id;
        }
        return -1;
    }

    return {
        init: function () {
            var self = this;
//            self.loadXML();
//            self.tryLastFMsess();

            gBrowser.addEventListener('DOMContentLoaded', function (aEvent) {
                self.onPageLoad(aEvent);
            }, false);

        },

        addEventHandler: function (eventType, eventHandler) {
            var self = this;
            Observer.subscribe(eventType, eventHandler, self);
        },

        broadcast: function (eventType, data) {
            data = data || null;
            Observer.broadcast(eventType, data);
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
            var self = this;

            var d = aEvent.originalTarget; // doc is document that triggered the event
            var w = d.defaultView; // win is the window for the doc
            // test desired conditions and do something
            // if (d.nodeName == "#document") return; // only documents
            // if (w != w.top) return; //only top window.
            // if (w.frameElement) return; // skip iframes/frames
            main();
            w.addEventListener('load', main, false);

            function main() {
                if (d.location.href.match('privet.ru')) {

                    var urlArray = d.location.href.split('/');
                    var j, l = urlArray.length;
                    for (j = 0; j < l; j += 1) {
                        if (urlArray[j] === 'user') {
                            privetUser = urlArray[j + 1];
                            break;
                        }
                    }

                    //                appendStyles(d);


                    var flashPlayers = d.getElementsByTagName('embed');

                    var len = flashPlayers.length,
                        i;

                    for (i = 0; i < len; i += 1) {
                        var flashPlayer = flashPlayers[i];

                        if (flashPlayer.getAttribute('wmode') !== 'transparent') {
                            var id = flashPlayer.id;

                            flashPlayer.setAttribute('wmode', 'transparent');


                            var temp = flashPlayer.parentNode.innerHTML;
                            flashPlayer.parentNode.innerHTML = temp + '•';

                            flashPlayer = d.getElementById(id);


                            flashPlayer.parentNode.addEventListener('mousedown', function (e) {
                                self.embedClickPath(e);
                            }, false);

                            //                        flashPlayer.addEventListener('mousedown', function (e) {
                            //                            console.log('TEST');
                            //                            self.embedClickPath(e);
                            //                        }, false);
                            flashPlayer.parentNode.addEventListener('keydown', function (e) {
//                                console.log('LULLULLUL');
//                                console.log(e);
                                self.embedSpacePressPath(e);
                            }, false);
                        }
                    }
                    self.addEventHandler('PLAY', function (e) {
//                        console.log(e);
                        self.playEventPath(e);
                    });
                    w.addEventListener('unload', function (e) { // Close tab or change location
                        self.leavePagePath(e);
                    }, false);
                }

            }

        },
        embedClickPath: function (e) {
            // В зоне или нет, если да, то
            //   тот же плеер или нет
            //     если да -
            //       плей - тру или фолс
            //         если тру: +таймстоп
            //         если фолс: + таймстарт
            //     если нет -
            //         дроп старого ид
            //         добавление нового ид (с первым таймстартом) -- для моноплеера
            var self = this;

            function isEqualizer(flashVars) {
                //  var flashVars = flashPlayer.getAttribute('flashvars');
                flashVars = flashVars.split('&');
                var len = flashVars.length,
                    j;
                for (j = 0; j < len; j += 1) {
                    var flashVarPair = flashVars[j].split('=');
                    if (flashVarPair[0] === 'showeq') return flashVarPair[1];
                }
                return false;
            }

//            function exceptionClick(e) {
//               // Тут не обрабатывается один случай с нажатием на название в мультиплеере
//                var node = e.target;
//                var flashVars = node.getAttribute('flashvars');
//                var rectObject = node.getBoundingClientRect();
//                var clickX = e.clientX;
//                var clickY = e.clientY;
//                if (isEqualizer(flashVars)) {
//                    if ((clickX > rectObject.left  &&
//                        clickX < rectObject.left + rectObject.width - 32) &&
//                        clickY > rectObject.top + 80 && clickY < rectObject.top + 101) {
//                        console.log('STRANGECLICK!!!!')
//                    }
//                }
//            }

            function clickWasUnderTheZone(e) {
                var node = e.target;
                var flashVars = node.getAttribute('flashvars');
                var rectObject = node.getBoundingClientRect();
                var clickX = e.clientX;
                var clickY = e.clientY;
                if (isEqualizer(flashVars)) {
                    if (clickX > rectObject.left + 1 && clickX < rectObject.left + rectObject.width &&
                        clickY > rectObject.top && clickY < rectObject.top + 61) {
//                        console.log('CLICK EQ');
                        return true;
                    }
                    else if (clickX > rectObject.left + 1 && clickX < rectObject.left + 18 &&
                        clickY > rectObject.top + 61 && clickY < rectObject.top + 81) {
//                        console.log('CLICK EQ');
                        return true;
                    }
                }
                else {
                    if (clickX > rectObject.left && clickX < rectObject.left + 18 &&
                        clickY > rectObject.top && clickY < rectObject.top + 20) {
//                        console.log('CLICK NOEQ');
                        return true;
                    }
                }
//                console.log('NOCLICK');
                return false;
            }

            function isTheSamePlayerClicked(e) {
                if (currentTrack.target === e.target) {
//                    console.log('SAMEEEEEEE PLAYER');
                    return true;
                }
//                console.log('DIFFERENT PLAYER');
                return false;
            }


            function getFileURL(flashVars) {
                //  var flashVars = flashPlayer.getAttribute('flashvars');
                flashVars = flashVars.split('&');
                var len = flashVars.length,
                    j;
                for (j = 0; j < len; j += 1) {
                    var flashVarPair = flashVars[j].split('=');
                    if (flashVarPair[0] === 'file') return flashVarPair[1];
                }
                return -1;
            }

            function newIsMono(el) {
                var node = el;
                var flashVars = node.getAttribute('flashvars');
                var fileName = getFileURL(flashVars);
                if (fileName.substr(-3, 3) === 'xml') {
//                    console.log('POLYYYY');
                    return false;
                }
//                console.log('MONOOO');
                return true;
            }

            function getId(el) {
                var id = el.id.substr(3);
                console.log(id);
                return id;

            }

//            exceptionClick(e);
            if (clickWasUnderTheZone(e)) {
                lastActivePlayer = e.target;
                if (isTheSamePlayerClicked(e)) {
                    if (currentTrack.play) {
                        currentTrack.addTimeStop();
                        currentTrack.play = false;
                    }
                    else {
                        currentTrack.addTimeStart();
                        currentTrack.play = true;
                    }
                }
                else {
                    currentTrack.drop();
                    if (newIsMono(e.target)) {
                        var id = getId(e.target);
                        currentTrack.add(id, e.target);
                    }

                }
            }
        },
        embedSpacePressPath: function (e) {
            // тот же плеер или нет
            //   если да -
            //     плей - тру или фолс
            //       если тру: +таймстоп
            //       если фолс: + таймстарт
            //   если нет -
            //     дроп старого ид
            //     добавление нового ид (с первым таймстартом) -- для моноплеера

            var self = this;

            function isEqualizer(flashVars) {
                //  var flashVars = flashPlayer.getAttribute('flashvars');
                flashVars = flashVars.split('&');
                var len = flashVars.length,
                    j;
                for (j = 0; j < len; j += 1) {
                    var flashVarPair = flashVars[j].split('=');
                    if (flashVarPair[0] === 'showeq') return flashVarPair[1];
                }
                return false;
            }

//            function exceptionClick(e) {
//               // Тут не обрабатывается один случай с нажатием на название в мультиплеере
//                var node = e.target;
//                var flashVars = node.getAttribute('flashvars');
//                var rectObject = node.getBoundingClientRect();
//                var clickX = e.clientX;
//                var clickY = e.clientY;
//                if (isEqualizer(flashVars)) {
//                    if ((clickX > rectObject.left  &&
//                        clickX < rectObject.left + rectObject.width - 32) &&
//                        clickY > rectObject.top + 80 && clickY < rectObject.top + 101) {
//                        console.log('STRANGECLICK!!!!')
//                    }
//                }
//            }

            function isTheSamePlayerClicked(e) {
                if (currentTrack.target === e.target) {
//                    console.log('SAMEEEEEEE PLAYER');
                    return true;
                }
//                console.log('DIFFERENT PLAYER');
                return false;
            }


            function getFileURL(flashVars) {
                //  var flashVars = flashPlayer.getAttribute('flashvars');
                flashVars = flashVars.split('&');
                var len = flashVars.length,
                    j;
                for (j = 0; j < len; j += 1) {
                    var flashVarPair = flashVars[j].split('=');
                    if (flashVarPair[0] === 'file') return flashVarPair[1];
                }
                return -1;
            }

            function newIsMono(el) {
                var node = el;
                var flashVars = node.getAttribute('flashvars');
                var fileName = getFileURL(flashVars);
                if (fileName.substr(-3, 3) === 'xml') {
//                    console.log('POLYYYY');
                    return false;
                }
//                console.log('MONOOO');
                return true;
            }

            function getId(el) {
                var id = el.id.substr(3);
                console.log(id);
                return id;

            }

//            exceptionClick(e);

            if (isTheSamePlayerClicked(e)) {
                if (currentTrack.play) {
                    currentTrack.addTimeStop();
                    currentTrack.play = false;
                }
                else {
                    currentTrack.addTimeStart();
                    currentTrack.play = true;
                }
            }
            else {
                currentTrack.drop();
                if (newIsMono(e.target)) {
                    var id = getId(e.target);
                    currentTrack.add(id, e.target);
                }

            }


        },
        playEventPath: function (e) {
            // другой ай ди?
            //   дроп старого ид
            //   добавление нового ид (с первым таймстартом)

            function isIdTheSame(e) {
                if (e === currentTrack.id) {
                    return true;
                }
                return false;
            }

            if (!isIdTheSame(e)) {
                currentTrack.drop();
                currentTrack.add(e, lastActivePlayer);
            }

        },
        leavePagePath: function (e) {
            // дроп старого ид

            currentTrack.drop();
        }
    }

}();

window.addEventListener('load', function load(event) {
    window.removeEventListener('load', load, false); //remove listener, no longer needed
    privet2lastfm.init();
}, false);

//

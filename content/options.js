/**
 * @constructor
 *
 * @param {string} branch_name
 * @param {Function} callback must have the following arguments:
 *   branch, pref_leaf_name
 */
function PrefListener(branch_name, callback) {
  // Keeping a reference to the observed preference branch or it will get
  // garbage collected.
  var prefService = Components.classes["@mozilla.org/preferences-service;1"]
    .getService(Components.interfaces.nsIPrefService);
  this._branch = prefService.getBranch(branch_name);
  this._branch.QueryInterface(Components.interfaces.nsIPrefBranch2);
  this._callback = callback;
}

PrefListener.prototype.observe = function(subject, topic, data) {
  if (topic == 'nsPref:changed')
    this._callback(this._branch, data);
};

/**
 * @param {boolean=} trigger if true triggers the registered function
 *   on registration, that is, when this method is called.
 */
PrefListener.prototype.register = function(trigger) {
  this._branch.addObserver('', this, false);
  if (trigger) {
    var that = this;
    this._branch.getChildList('', {}).
      forEach(function (pref_leaf_name)
        { that._callback(that._branch, pref_leaf_name); });
  }
};

PrefListener.prototype.unregister = function() {
  if (this._branch)
    this._branch.removeObserver('', this);
};

var myListener = new PrefListener(
  "extensions.privet2lastfm.",
  function(branch, name) {
    switch (name) {
      case "username":
        // extensions.myextension.pref1 was changed
//        privet2lastfm.loadXML();
          privet2lastfm.loadXML.call(privet2lastfm);
        break;
      case "scrobbling":
        // extensions.myextension.pref2 was changed
//          privet2lastfm.addScrobbling();
          console.log(2222222)
          privet2lastfm.addScrobbling.call(privet2lastfm);
        break;
      case "lastfmSess":
          console.log(111111111)
          // extensions.myextension.pref2 was changed
//          privet2lastfm.addScrobbling.call(privet2lastfm);
          break;
      case "scrobblingPercent":
          // extensions.myextension.pref2 was changed
          privet2lastfm.changeScrobblingPercent.call(privet2lastfm);
//            privet2lastfm.changeScrobblingPercent();
        break;
    }
  }
);

myListener.register(true);
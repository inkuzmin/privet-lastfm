/**
 * Created by JetBrains PhpStorm.
 * User: inkuzmin
 * Date: 10/11/13
 * Time: 2:08 AM
 */
var Observer = {
       subscribers:{
           any:[]
       },

       subscribe: function (type, handler, context) {
           handler = typeof handler === 'function' ? handler : context[handler];
           if (typeof this.subscribers[type] === 'undefined') {
               this.subscribers[type] = [];
           }
           this.subscribers[type].push({
               handler:handler,
               context:context || this
           });
       },
       unsubscribe:function (type, handler, context) {
           context = context || this;
           this._perform('unsubscribe', type, handler, context);
       },
       broadcast:function (type, notification) {
           this._perform('broadcast', type, notification);
       },

       _perform:function (action, type, arg, context) {
           var subscribers = this.subscribers[type];
           if (subscribers) {
               var i,
                   length = subscribers.length;
               for (i = 0; i < subscribers.length; i += 1) {
                   var subscriber = subscribers[i];
                   switch (action) {
                       case 'broadcast':
                           subscriber.handler.call(subscriber.context, arg);
                           break;
                       case 'unsubscribe':
                           if (subscriber.handler === arg &&
                               subscriber.context === context) {
                               subscribers.splice(i, 1);
                           }
                           break;
                   }
               }
           }
       }
   };
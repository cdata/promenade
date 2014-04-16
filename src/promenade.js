(function() {
  'use strict';

  define(['promenade/view', 'promenade/view/collection', 'promenade/view/form',
          'promenade/model', 'promenade/controller', 'promenade/application',
          'promenade/region', 'promenade/object', 'promenade/collection',
          'promenade/delegation', 'promenade/sync', 'promenade/queue',
          'promenade/inflector', 'promenade/state', 'promise'],
         function(View, CollectionView, FormView, Model,  Controller,
                  Application, Region, PromenadeObject, Collection,
                  DelegationApi, SyncApi, QueueApi, InflectorApi, StateMachineApi, Promise) {
    return {
      Model: Model,
      Collection: Collection,
      View: View,
      CollectionView: CollectionView,
      FormView: FormView,
      Controller: Controller,
      Application: Application,
      Region: Region,
      Delegation: DelegationApi,
      Sync: SyncApi,
      Queue: QueueApi,
      Inflector: InflectorApi,
      'Object': PromenadeObject,
      StateMachine: StateMachineApi,
      Promise: Promise
    };
  });
})();

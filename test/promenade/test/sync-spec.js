define(['promenade', 'promenade/sync'],
       function(Promenade, SyncApi) {

  describe('Promenade.Sync', function() {
    var server;
    var AModel;
    var ACollection;
    var aModel;
    var aCollection;

    beforeEach(function() {
      server = sinon.fakeServer.create();
      server.respondWith('GET', '/api/foo',
                         [200, {}, '{"foo":{},"bar":{}}']);
      server.respondWith('POST', '/api/foo',
                         [200, {}, '{"id": 1, "foo":{},"bar":{}}']);
      server.respondWith('GET', '/api/paginated',
                         [200, {
                           'X-Upper-Index': '5',
                           'X-Lower-Index': '0'
                         }, '[0, 1, 2, 3, 4, 5]']);
      AModel = Promenade.Model.extend({
        url: '/api/foo'
      });

      ACollection = Promenade.Collection.extend({
        url: '/api/paginated'
      });

      aModel = new AModel();
      aCollection = new ACollection();
    });

    afterEach(function() {
      server.restore();
    });

    it('is defined', function() {
      expect(Promenade.Sync).to.be.ok();
      expect(SyncApi).to.be.ok();
    });

    describe('for the purposes of tracking sync', function() {
      it('it exposes syncs a promise', function() {
        expect(aModel.syncs()).to.be.an(Object);
        expect(aModel.syncs().then).to.be.a(Function);
      });

      describe('when a network operation is in flight', function() {
        it('resolves the sync promise eventually', function() {
          var resolvedCount = 0;

          aModel.fetch();
          aModel.syncs().then(function() {
            resolvedCount++;
          });

          server.respond();

          expect(resolvedCount).to.be(1);
        });

        describe('that involves creating a model from a collection', function() {
          it('resolves the sync promise after the created model is saved', function() {
            var aCollection = new ACollection();
            var aModel = aCollection.create({ foo: 'bar' }, {
              url: '/api/foo'
            });
            var syncCount = 0;

            aModel.syncs().then(function() {
              ++syncCount;
            });

            expect(syncCount).to.be(0);

            server.respond();

            expect(syncCount).to.be(1);
          });
        });
      });

      describe('when no network operation is in flight', function() {
        it('waits for the first sync to complete before resolving', function() {
          var resolvedCount = 0;

          aModel.syncs().then(function() {
            resolvedCount++;
          });

          expect(resolvedCount).to.be(0);

          aModel.fetch();
          server.respond();

          expect(resolvedCount).to.be(1);
        });

        describe('and the model does not need to sync', function() {
          beforeEach(function() {
            AModel.prototype.isSparse = function() {
              return false;
            };
            aModel = new AModel({ id: 1 });
          });

          afterEach(function() {
            AModel.prototype.isSparse = Promenade.Model.prototype.isSparse;
            aModel = new AModel();
          });

          it('resolves the sync promise immediately', function() {
            var resolvedCount = 0;

            aModel.syncs().then(function() {
              resolvedCount++;
            });

            expect(resolvedCount).to.be(1);
          });
        });
      });
    });

    describe('if sync is impossible', function() {
      beforeEach(function() {
        aModel.url = null;
      });
      it('tells you that it cannot happen', function() {
        expect(aModel.canSync()).to.be(false);
      });
    });

    describe('if a sync has not happen', function() {
      it('tells you that you need to sync', function() {
        expect(aModel.needsSync()).to.be(true);
      });
    });

    describe('if it is in the progress of syncing', function() {
      it('tells you that it does not need to sync', function() {
        aModel.fetch();
        expect(aModel.needsSync()).to.be(false);
      });
    });

    describe('when a network resource supports pagination', function() {
      beforeEach(function() {
        aCollection.fetch({ requestMore: true, requestUpdates: true });
        server.respond();
      });

      it('lets you query if pagination is supported', function() {
        expect(aCollection.canRequestMore()).to.be(true);
      });

      describe('and you request more data', function() {
        it('expresses the desire in a header', function() {
          aCollection.fetch({ requestMore: true });
          expect(server.requests[1].requestHeaders["X-Beyond-Index"]).to.be("5");
        });
      });

      describe('and you request updates for data you have', function() {
        it('expresses the desire in a header', function() {
          aCollection.fetch({ requestUpdates: true });
          expect(server.requests[1].requestHeaders["X-Within-Index"]).to.be("0");
        });
      });
    });
  });
});

define(['backbone', 'promenade', 'promenade/controller', 'promenade/application'],
       function(Backbone, Promenade, Controller, Application) {

  describe('Promenade.Controller', function() {

    var MyController;
    var MyModel;
    var MyCollection;
    var MyApplication;
    var app;

    beforeEach(function() {
      MyController = Promenade.Controller.extend({
        defineRoutes: function() {
          this.handle('foo', 'foo');
          this.handle('bar', 'bar', function() {
            this.show('baz', 'barBaz');
          });
          this.show('foo', 'receivesBar', function() {
            this.show('lur', 'receivesBarAndModel');
          });
          this.show('lur', 'receivesModel');
          this.show('lur', function() {
            this.show('bing', 'receivesModelAndModel', { type: 'lur' });
          });

          this.index('lur', 'receivesCollection', function() {
            this.show('bing', 'receivesCollectionAndModel', { type: 'lur' });
          });
        },
        foo: function() {},
        bar: function() {},
        barBaz: function(baz) {},
        receivesBar: function(bar) {},
        receivesModel: function(model) {},
        receivesBarAndModel: function(bar, model) {},
        receivesModelAndModel: function(modelOne, modelTwo) {},
        receivesCollection: function(collection) {},
        receivesCollectionAndModel: function(collection, model) {}
      });
      MyModel = Promenade.Model.extend({
        namespace: 'foo',
        type: 'foo',
        defaults: {
          bar: 'baz'
        }
      });
      MyCollection = Promenade.Collection.extend({
        namespace: 'lur',
        type: 'lur'
      });
      MyApplication = Application.extend({
        controllers: [
          MyController,
          Controller.extend({
            defineRoutes: function() {
              this.handle('grog', 'onGrog');
            },
            onGrog: function() {}
          })
        ],
        models: [
          MyModel,
          MyCollection
        ]
      });
      app = new MyApplication();
      Backbone.history.start();
    });

    afterEach(function() {
      Backbone.history.stop();
      Backbone.history.handlers = [];
    });

    it('is defined', function() {
      expect(Promenade.Controller).to.be.ok();
      expect(Controller).to.be.ok();
    });

    describe('when instantiated', function() {

      var myController;

      beforeEach(function() {
        myController = new MyController({ app: app });
      });

      it('defines a series of routes', function() {
        var count = 0;
        for (var routeString in myController.routes) {
          ++count;
        }
        expect(count).to.be.eql(9);
      });
    });

    describe('when a navigation event occurs', function() {
      describe('for a resourceful route', function() {
        beforeEach(function() {
          sinon.spy(app.controllers[0], 'receivesBar');
          sinon.spy(app.controllers[0], 'receivesModel');
          sinon.spy(app.controllers[0], 'receivesBarAndModel');
          sinon.spy(app.controllers[0], 'receivesModelAndModel');
          sinon.spy(app.controllers[0], 'activate');
          sinon.spy(app.controllers[0], 'deactivate');
          sinon.spy(app.controllers[1], 'activate');
          sinon.spy(app.controllers[1], 'deactivate');
          sinon.spy(app.controllers[0], 'receivesCollection');
          sinon.spy(app.controllers[0], 'receivesCollectionAndModel');

          app.lurCollection.reset([{
            id: '1'
          }]);
        });

        afterEach(function() {
          app.controllers[0].receivesBar.restore();
          app.controllers[0].receivesModel.restore();
          app.controllers[0].receivesBarAndModel.restore();
          app.controllers[0].receivesModelAndModel.restore();
          app.controllers[0].activate.restore();
          app.controllers[0].deactivate.restore();
          app.controllers[1].activate.restore();
          app.controllers[1].deactivate.restore();
          app.controllers[0].receivesCollection.restore();
          app.controllers[0].receivesCollectionAndModel.restore();
          app.navigate('');
        });

        it('calls its own activate method when the route first matches', function() {
          expect(app.controllers[0].activate.callCount).to.be(0);
          app.navigate('foo/bar', { trigger: true });
          expect(app.controllers[0].activate.callCount).to.be(1);
          app.navigate('lur/1', { trigger: true });
          expect(app.controllers[0].activate.callCount).to.be(1);
        });

        it('calls its own deactivate method when the route no longer matches', function() {
          expect(app.controllers[0].deactivate.callCount).to.be(0);
          app.navigate('foo/bar', { trigger: true });
          expect(app.controllers[0].deactivate.callCount).to.be(0);
          app.navigate('grog', { trigger: true });
          expect(app.controllers[0].deactivate.callCount).to.be(1);
        });

        it('always deactivates old controllers before activating new ones', function() {
          app.navigate('foo/bar', { trigger: true });
          app.navigate('grog', { trigger: true });

          expect(app.controllers[0].deactivate.calledBefore(
              app.controllers[1].activate)).to.be(true);

          app.controllers[0].activate.reset();
          app.controllers[0].deactivate.reset();
          app.controllers[1].activate.reset();
          app.controllers[1].deactivate.reset();

          app.navigate('foo/bar', { trigger: true });

          expect(app.controllers[1].deactivate.calledBefore(
              app.controllers[0].activate)).to.be(true);
        });

        describe('with an index route', function() {
          beforeEach(function() {
            app.lurCollection.fetch = function() {
              this.isReady = (new $.Deferred()).resolve(this).promise();
            };
          });

          it('yields a whole collection as an argument', function() {
            app.navigate('lur', { trigger: true });

            expect(app.controllers[0].receivesCollection.callCount).to.be(1);
            expect(app.controllers[0].receivesCollection.getCall(0).calledWith(app.lurCollection))
                .to.be(true);
          });

          describe('and a nested show route', function() {
            it('yields a collection and a model', function() {
              app.navigate('lur/bing/1', { trigger: true });

              expect(app.controllers[0].receivesCollectionAndModel.callCount).to.be(1);
              expect(app.controllers[0].receivesCollectionAndModel.calledWith(
                  app.lurCollection, app.lurCollection.at(0))).to.be(true);
            });
          });
        });

        describe('with an associated model', function() {
          it('passes the model-key value to the handler', function() {
            app.navigate('foo/bar', { trigger: true });
            expect(app.controllers[0].receivesBar.getCall(0).calledWith('baz'))
                .to.be(true);
          });
        });

        describe('with an associated collection', function() {
          it('passes a model with the given id to the handler', function() {
            app.navigate('lur/1', { trigger: true });
            expect(app.controllers[0].receivesModel.getCall(0).calledWith(
                app.lurCollection.get('1'))).to.be(true);
          });

          describe('that yields a syncing model', function() {
            var server;

            beforeEach(function() {
              server = sinon.fakeServer.create();
              server.respondWith('GET', '/api/lur/2',
                                 [ 200,
                                 { 'Content-Type': 'application/json' },
                                 '{ "id": 2, "type": "lur", "remote": true }' ]);
              app.lurCollection.url = '/api/lur';
            });

            afterEach(function() {
              server.restore();
            });

            it('calls the controller handler when the model is ready', function() {
              app.navigate('lur/2', { trigger: true });
              expect(app.controllers[0].receivesModel.callCount).to.be(0);
              server.respond();
              expect(app.controllers[0].receivesModel.callCount).to.be(1);
              expect(app.controllers[0].receivesModel.calledWith(app.lurCollection.get(2))).to.be(true);
            });
          });
        });

        describe('with compound associations', function() {
          it('passes a model-key value and a model', function() {
            app.navigate('foo/bar/lur/1', { trigger: true });
            expect(app.controllers[0].receivesBarAndModel.getCall(0).calledWith(
                'baz', app.lurCollection.get('1'))).to.be(true);
          });
        });

        describe('when an optional type is specified', function() {
          it('uses that type to resolve the resource instead of the fragment',
             function() {
            app.navigate('lur/1/bing/1', { trigger: true });
            var model = app.lurCollection.get('1');
            var call = app.controllers[0].receivesModelAndModel.getCall(0);

            expect(call.calledWith(model, model)).to.be(true);
          });
        });
      });
    });
  });
});

define(['backbone', 'promenade', 'promenade/controller', 'promenade/application'],
       function(Backbone, Promenade, Controller, Application) {

  describe('Promenade.Controller', function() {

    var NUMBER_OF_CONTROLLER_ROUTES;
    var MyController;
    var MyModel;
    var MyCollection;
    var MyApplication;
    var controllerOne;
    var controllerTwo;
    var app;
    var server;

    var fixtureApiShowRoute = function (type, id, response) {
      server.respondWith('GET', '/api/' + type + '/' + id, [
        200,
        {
          'Content-Type': 'application/json'
        },
        JSON.stringify(response)
      ]);
    };

    var fixtureApiIndexRoute = function (type, response) {
      server.respondWith('GET', '/api/' + type, [
        200,
        {
          'Content-Type': 'application/json'
        },
        JSON.stringify(response)
      ]);
    };

    beforeEach(function() {
      NUMBER_OF_CONTROLLER_ROUTES = 12;

      server = sinon.fakeServer.create();
      server.autoRespond = true;
      fixtureApiIndexRoute('lur', []);
      fixtureApiShowRoute('lur', 1, { type: 'lur', id: 1 });
      fixtureApiShowRoute('lur', 2, { type: 'lur', id: 2 });
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

          this.index('lur', 'neverCalled');

          this.handle('query', 'handleQuery', function() {
            this.query('bar');
            this.query('lur');

            this.show('lur', 'lurWithQuery');
          });
        },
        foo: function() {},
        bar: function() {},
        barBaz: function(baz) {},
        handleQuery: function(query) {},
        lurWithQuery: function(lur, query) {},
        receivesBar: function(bar) {},
        receivesModel: function(model) {},
        receivesBarAndModel: function(bar, model) {},
        receivesModelAndModel: function(modelOne, modelTwo) {},
        receivesCollection: function(collection) {},
        receivesCollectionAndModel: function(collection, model) {},
        neverCalled: function() {}
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
      controllerOne = app.controllers[0];
      controllerTwo = app.controllers[1];
      Backbone.history.start();
    });

    afterEach(function() {
      Backbone.history.stop();
      Backbone.history.handlers = [];
      server.restore();
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
        expect(count).to.be.eql(NUMBER_OF_CONTROLLER_ROUTES);
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
          sinon.spy(app.controllers[0], 'neverCalled');
          sinon.spy(app.controllers[0], 'handleQuery');
          sinon.spy(app.controllers[0], 'lurWithQuery');

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
          app.controllers[0].handleQuery.restore();
          app.controllers[0].lurWithQuery.restore();
          app.navigate('');
        });

        it('calls its own activate method when the route first matches', function(done) {
          var doneNavigating = false;

          controllerOne.on('after:route', function () {
            try {
              expect(controllerOne.activate.callCount).to.be(1);

              if (!doneNavigating) {
                doneNavigating = true;
                app.navigate('lur/1', { trigger: true });
              } else {
                done();
              }
            } catch (e) {
              done(e);
            }
          });

          expect(controllerOne.activate.callCount).to.be(0);
          app.navigate('foo/bar', { trigger: true });
        });

        it('calls its own deactivate method when the route no longer matches', function() {
          expect(app.controllers[0].deactivate.callCount).to.be(0);
          app.navigate('foo/bar', { trigger: true });
          expect(app.controllers[0].deactivate.callCount).to.be(0);
          app.navigate('grog', { trigger: true });
          expect(app.controllers[0].deactivate.callCount).to.be(1);
        });

        it('only calls the first matched route', function(done) {
          app.controllers[0].on('after:route', function () {
            try {
              expect(app.controllers[0].neverCalled.callCount).to.be(0);
              expect(app.controllers[0].receivesCollection.callCount).to.be(1);
              done();
            } catch(e) {
              done(e);
            }
          });

          expect(app.controllers[0].neverCalled.callCount).to.be(0);
          expect(app.controllers[0].receivesCollection.callCount).to.be(0);

          app.navigate('lur', { trigger: true });
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

        describe('with a query route modifier', function() {

          it('passes a final argument which is a hash of query keys to values', function(done) {
            var controller = app.controllers[0];

            controller.on('after:route', function () {
              var args = controller.handleQuery.firstCall.args;

              try {
                expect(controller.handleQuery.callCount).to.be(1);
                expect(args[0]).to.be.eql({ bar: '1' });
                done();
              } catch (e) {
                done(e);
              }
            });

            app.navigate('/query?bar=1', { trigger: true });
          });

          it('converts query values to models and collections when a type is known', function(done) {
            var controller = app.controllers[0];

            fixtureApiShowRoute('lur', 1, { type: 'lur', id: 1 });

            controller.on('after:route', function() {
              try {
                var args = controller.handleQuery.firstCall.args;

                expect(controller.handleQuery.callCount).to.be(1);
                expect(args[0]).to.be.eql({ bar: 1, lur: this.app.lurCollection.get(1) });

                done();
              } catch(e) {
                done(e);
              }
            });

            app.navigate('/query?bar=1&lur=1', { trigger: true });
          });

          it('allows query keys to be optional', function(done) {
            var controller = app.controllers[0];

            controller.on('after:route', function() {
              try {
                expect(controller.handleQuery.callCount).to.be(1);
                expect(controller.handleQuery.getCall(0).calledWith({})).to.be(true);
                done();
              } catch(e) {
                done(e);
              }
            });

            app.navigate('/query', { trigger: true });
          });

          describe('when handling a nested route', function() {
            it('applies the parent route\'s query settings to the nested route', function(done) {
              var controller = app.controllers[0];

              controller.on('after:route', function() {
                try {
                  var args = controller.lurWithQuery.firstCall.args;

                  expect(controller.lurWithQuery.callCount).to.be(1);
                  expect(args[1]).to.be.eql({ bar: 1 });
                  done();
                } catch(e) {
                  done(e);
                }
              });

              app.navigate('/query/lur/1?bar=1', { trigger: true });
            });
          });
        });

        describe('with an index route', function() {
          beforeEach(function() {
            fixtureApiIndexRoute('lur', []);
            fixtureApiShowRoute('lur', 1, { type: 'lur', id: 1 });
          });

          it('yields a whole collection as an argument', function(done) {
            app.controllers[0].on('after:route', function() {
              try {
                var args = app.controllers[0].receivesCollection.firstCall.args;

                expect(app.controllers[0].receivesCollection.callCount).to.be(1);
                expect(app.controllers[0].receivesCollection.getCall(0).calledWith(app.lurCollection))
                    .to.be(true);
                done();
              } catch(e) {
                done(e);
              }
            });

            app.navigate('lur', { trigger: true });
          });

          describe('and a nested show route', function() {
            it('yields a collection and a model', function(done) {
              app.controllers[0].on('after:route', function() {
                try {
                  expect(app.controllers[0].receivesCollectionAndModel.callCount).to.be(1);
                  expect(app.controllers[0].receivesCollectionAndModel.calledWith(
                      app.lurCollection, app.lurCollection.at(0))).to.be(true);
                  done();
                } catch(e) {
                  done(e);
                }
              });
              app.navigate('lur/bing/1', { trigger: true });
            });
          });
        });

        describe('with an associated model', function() {
          it('passes the model-key value to the handler', function(done) {
            app.controllers[0].on('after:route', function () {
              try {
                expect(app.controllers[0].receivesBar.getCall(0).calledWith('baz'))
                    .to.be(true);
                done();
              } catch (e) {
                done(e);
              }
            });
            app.navigate('foo/bar', { trigger: true });
          });
        });

        describe('with an associated collection', function() {
          it('passes a model with the given id to the handler', function(done) {
            app.controllers[0].on('after:route', function() {
              try {
                expect(app.controllers[0].receivesModel.getCall(0).calledWith(
                    app.lurCollection.get('1'))).to.be(true);
                done();
              } catch(e) {
                done(e);
              }
            });

            app.navigate('lur/1', { trigger: true });
          });

          describe('that yields a syncing model', function() {
            beforeEach(function() {
              app.lurCollection.url = '/api/lur';
            });

            it('calls the controller handler when the model is ready', function(done) {
              app.controllers[0].on('after:route', function() {
                try {
                  expect(app.controllers[0].receivesModel.callCount).to.be(1);
                  expect(app.controllers[0].receivesModel.calledWith(app.lurCollection.get(2))).to.be(true);
                  done();
                } catch(e) {
                  done(e);
                }
              });

              app.navigate('lur/2', { trigger: true });
              expect(app.controllers[0].receivesModel.callCount).to.be(0);
            });
          });
        });

        describe('with compound associations', function() {
          it('passes a model-key value and a model', function(done) {
            app.controllers[0].on('after:route', function() {
              try {
                expect(app.controllers[0].receivesBarAndModel.getCall(0).calledWith(
                  'baz', app.lurCollection.get('1'))).to.be(true);
                done();
              } catch(e) {
                done(e);
              }
            });
            app.navigate('foo/bar/lur/1', { trigger: true });
          });
        });

        describe('when an optional type is specified', function() {
          it('uses that type to resolve the resource instead of the fragment',
             function(done) {
            app.controllers[0].on('after:route', function() {
              try {
                var model = app.lurCollection.get('1');
                var call = app.controllers[0].receivesModelAndModel.getCall(0);

                expect(call.calledWith(model, model)).to.be(true);
                done();
              } catch(e) {
                done(e);
              }
            });

            app.navigate('lur/1/bing/1', { trigger: true });
          });
        });
      });
    });
  });
});

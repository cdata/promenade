define(['promenade', 'promenade/application'],
       function(Promenade, Application) {

  describe('Promenade.Application', function() {

    var MyApplication;
    var MyController;
    var MyModel;
    var BazModel;
    var VimModel;
    var LurModel;
    var app;

    beforeEach(function() {
      MyController = Promenade.Controller.extend({
        defineRoutes: function() {
          this.handle('foo', 'foobar');
          this.handle('bar', 'foobar');
        },
        foobar: function() {}
      });
      BazModel = Promenade.Model.extend({
        url: '/api/baz',
        namespace: 'baz'
      });
      VimModel = Promenade.Model.extend({
        url: '/api/vim',
        namespace: 'vim'
      });
      LurModel = Promenade.Model.extend({
        url: '/api/lur',
        namespace: 'lur'
      });
      MyApplication = Application.extend({
        controllers: [
          MyController
        ],
        models: [
          BazModel,
          VimModel,
          LurModel
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
      expect(Promenade.Application).to.be.ok();
      expect(Application).to.be.ok();
    });

    describe('when a root is specified', function() {

      it('uses it as a selector to set the rootElement', function() {
        expect(app.rootElement).to.be(document.body);
      });

    });

    describe('models', function() {


      describe('given a namespace registered with the application', function() {
        it('creates a model instance for the namespace', function() {
          expect(app.baz).to.be.ok();
          expect(app.baz).to.be.a(BazModel);
        });

        describe('syncing data', function() {

          var server;

          beforeEach(function() {
            server = sinon.fakeServer.create();
            server.respondWith('GET', '/api/baz',
                               [ 200,
                                 { 'Content-Type': 'application/json' },
                                 '{ "baz": { "some": "thing" }, "lur": { "foo": "bar" }, "notmatching": { "boom": "blam" }}' ]);
          });

          afterEach(function() {
            server.restore();
          });

          it('sets the data on the model', function() {
            app.baz.fetch();
            server.respond();

            expect(app.baz.get('some')).to.be.eql('thing');
          });

          describe('when the data is empty', function() {
            beforeEach(function() {
              sinon.spy(app.vim, 'set');
            });

            afterEach(function() {
              app.vim.set.restore();
            });

            it('does not call set', function() {
              app.baz.fetch();
              server.respond();
              expect(app.vim.set.called).to.be.eql(false);
            });
          });

          describe('given data in a different namespace', function() {
            it('sets the data on the related model', function() {
              app.baz.fetch();
              server.respond();
              expect(app.lur.get('foo')).to.be.eql('bar');
            });
          });
        });
      });
    });

    describe('with named controllers', function() {
      it('registers a route for each route declared', function() {
        var fooRouteRegExp = app._routeToRegExp('foo');
        var barRouteRegExp = app._routeToRegExp('bar');
        expect(Backbone.history.handlers[0].route).to.be.eql(fooRouteRegExp);
        expect(Backbone.history.handlers[1].route).to.be.eql(barRouteRegExp);
      });

      describe('and a navigation event happens', function() {
        beforeEach(function() {
          sinon.spy(app.controllers[0], 'foobar');
        });

        afterEach(function() {
          app.controllers[0].foobar.restore();
          app.navigate('');
        });

        it('calls a named method of the controller when specified',
           function() {
          app.navigate('foo', { trigger: true });
          expect(app.controllers[0].foobar.callCount).to.be(1);
        });
      });
    });
  });
});

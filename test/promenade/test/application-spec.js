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
        namespace: 'baz',
        type: 'baz'
      });
      VimModel = Promenade.Model.extend({
        url: '/api/vim',
        namespace: 'vim',
        type: 'vim'
      });
      LurModel = Promenade.Model.extend({
        url: '/api/lur',
        namespace: 'lur',
        type: 'lur'
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

      describe('and a view is declared', function() {


        describe('as a view instance', function() {
          var myView;
          var mySubview;

          beforeEach(function() {
            myView = new Promenade.View({
              layout: {
                self: ''
              }
            });
            mySubview = new Promenade.View({
              tagName: 'a'
            });

            mySubview.on('render', function() {
              this.$el.attr('href', 'foo');
              this.$el.addClass('route-link');
            }, mySubview);

            app.useView(myView);
            myView.selfRegion.show(mySubview.render());

            sinon.spy(app.controllers[0], 'foobar');
          });

          afterEach(function() {
            app.controllers[0].foobar.restore();
            app.navigate('');
          });

          it('sets the current view to the new instance', function() {
            app.useView(myView);
            expect(app.view).to.be(myView);
          });

          describe('and its subview dispathes a navigate event', function() {
            it('bubbles the event to the application, which navigates', function() {
              mySubview.trigger('navigate', 'foo', { trigger: true });
              expect(app.controllers[0].foobar.callCount).to.be(1);
            });
          });

          describe('and a route-link is clicked in DOM tree of the root', function() {
            it('triggers navigation to the route defined by the href', function() {
              mySubview.$el.click();
              expect(app.controllers[0].foobar.callCount).to.be(1);
            });

            it('triggers navigation to the route defined by data-href', function() {
              mySubview.$el.attr('href', '');
              mySubview.$el.data('href', 'foo');

              mySubview.$el.click();

              expect(app.controllers[0].foobar.callCount).to.be(1);
            });
          });
        });

        describe('as a view class', function() {
          it('instantiates the class uses it as a view', function() {
            sinon.spy(Backbone, 'View');

            app.useView(Backbone.View);

            expect(app.view).to.be.a(Backbone.View);
            expect(Backbone.View.calledOnce).to.be(true);

            Backbone.View.restore();
          });
        });

        describe('as a string', function() {
          it('resolves the class as an AMD module', function() {
            app.useView('promenade/view');

            expect(app.view).to.be.a(Promenade.View);
          });
        });

        describe('and a different view is set', function() {
          it('changes the root application view to the new view', function() {
            app.useView(Backbone.View);
            app.useView(Promenade.View);

            expect(app.view).to.be.a(Promenade.View);
          });
        });

        describe('and the same view is set', function() {
          it('does nothing', function() {
            var MyView = Backbone.View.extend();
            var view;

            app.useView(MyView);
            view = app.view;
            app.useView(MyView);

            expect(app.view).to.be(view);
          });
        });
      });
    });

    describe('camelize', function() {
      it('camelizes an underscore-delimited phrase', function() {
        expect(app.camelize('foo_bar_baz')).to.be('fooBarBaz');
      });
    });

    describe('wth models', function() {

      describe('given a type registered with the application', function() {
        it('creates a model instance for the type', function() {
          expect(app.bazModel).to.be.ok();
          expect(app.bazModel).to.be.a(BazModel);
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
            app.bazModel.fetch();
            server.respond();

            expect(app.bazModel.get('some')).to.be.eql('thing');
          });

          describe('when the data is empty', function() {
            beforeEach(function() {
              sinon.spy(app.vimModel, 'set');
            });

            afterEach(function() {
              app.vimModel.set.restore();
            });

            it('does not call set', function() {
              app.bazModel.fetch();
              server.respond();
              expect(app.vimModel.set.called).to.be.eql(false);
            });
          });

          describe('given data in a different namespace', function() {
            it('sets the data on the related model', function() {
              app.bazModel.fetch();
              server.respond();
              expect(app.lurModel.get('foo')).to.be.eql('bar');
            });
          });
        });
      });
    });

    describe('with controllers', function() {
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

define(['backbone', 'promenade', 'promenade/controller', 'promenade/application'],
       function(Backbone, Promenade, Controller, Application) {

  describe('Promenade.Controller', function() {

    var MyController;
    var MyApplication;
    var app;

    beforeEach(function() {
      MyController = Promenade.Controller.extend({
        defineRoutes: function() {
          this.handle('foo', 'foo');
          this.handle('bar', 'bar', function() {
            this.resource('baz', 'barBaz');
          });
        },
        foo: function() {},
        bar: function() {},
        barBaz: function(baz) {}
      });
      MyApplication = Application.extend({
        controllers: [
          MyController
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
        myController = new MyController(app);
      });

      it('defines a series of routes', function() {
        var count = 0;
        for (var routeString in myController.routes) {
          ++count;
        }
        expect(count).to.be.eql(3);
      });
    });
  });
});

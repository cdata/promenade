define(['backbone', 'promenade', 'promenade/controller'],
       function(Backbone, Promenade, Controller) {

  describe('Promenade.Controller', function() {

    var MyController;

    beforeEach(function() {
      MyController = Controller.extend({
        foobar: function() {}
      });
    });

    it('is defined', function() {
      expect(Promenade.Controller).to.be.ok();
      expect(Controller).to.be.ok();
    });

    describe('when registered with an application', function() {
      var Application;
      var app;
      var controller;

      beforeEach(function() {
        controller = new MyController();
        Application = Promenade.Application.extend({
          routes: {
            'foo/:bar': 'controller#foobar'
          },
          controllers: {
            'controller': controller
          }
        });

        sinon.spy(controller, 'foobar');

        app = new Application();
        app.navigate('foo/bar', { trigger: true });
      });

      afterEach(function() {
        app.navigate('');
        Backbone.history.stop();
        controller.foobar.restore();
      });

      it('calls the appropriate handler on the controller', function() {
        expect(controller.foobar.called).to.be(true);
      });

      it('receives a reference to the application as its first argument', function() {
        expect(controller.foobar.args[0][0]).to.be(app);
      });

      it('receives any route parameters as arguments', function() {
        expect(controller.foobar.args[0][1]).to.be.eql('bar');
      });
    });
  });
});

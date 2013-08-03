define(['promenade', 'promenade/region'],
       function(Promenade, Region) {

  describe('Promenade.Region', function() {

    var MyView;
    var myView;

    beforeEach(function() {
      MyView = Promenade.View.extend({
        template: 'list',
        layout: {
          foo: '.foo',
          bar: '.bar'
        },
        modelEvents: {
          'change:foo': 'onChangeFoo'
        },
        onChangeFoo: function() {}
      });
      myView = new MyView({
        model: new Promenade.Model({
          foo: 'foo',
          bar: 'bar'
        })
      });
    });

    it('is defined', function() {
      expect(Promenade.Region).to.be.ok();
      expect(Region).to.be.ok();
    });

    describe('when declared as part of a view\'s layout', function() {

      it('is created as a property on that view', function() {
        expect(myView.fooRegion).to.be.ok();
        expect(myView.barRegion).to.be.ok();
      });

      it('has an appropriate selector property', function() {
        expect(myView.fooRegion.selector).to.be.eql('.foo');
      });

      describe('before render', function() {

        it('does not have a $container element', function() {
          expect(myView.fooRegion.$container.length).to.be.eql(0);
        });

      });

      describe('when a view is added', function() {
        it('is appended to the $container element');
      });

      describe('when a view is removed', function() {
        it('is removed from the $container element');
      });

      describe('when a view is inserted', function() {
        it('is added at the provided index');
      });

      describe('when a view is shown', function() {
        it('replaces all current views in the region');
      });

      describe('after render', function() {
        beforeEach(function() {
          myView.render();
        });

        it('has a $container element', function() {
          expect(myView.fooRegion.$container).to.be.ok();
          expect(myView.fooRegion.$container.length).to.be.eql(1);
        });
      });
    });
  });
});

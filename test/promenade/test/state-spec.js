define(['promenade', 'promenade/state', 'jquery'],
       function(Promenade, StateMachineApi, $) {

  describe('Promenade.StateMachine', function() {

    it('is defined', function () {
      expect(StateMachineApi).to.be.ok();
    });

    describe('when mixed in with an object', function () {
      var MyClass;
      var instance;

      beforeEach(function () {
        MyClass = Promenade.Object.extend(StateMachineApi).extend({
          initialize: function () {
            this._ensureState();
          },

          states: {
            initial: {
              transitionTo: ['foo']
            },
            foo: {}
          },

          onEnterStateFoo: $.noop,
          onEnterStateInitial: $.noop
        });

        sinon.spy(MyClass.prototype, 'onEnterStateFoo');
        sinon.spy(MyClass.prototype, 'onEnterStateInitial');

        instance = new MyClass();
      });

      afterEach(function () {
        MyClass.prototype.onEnterStateFoo.restore();
        MyClass.prototype.onEnterStateInitial.restore();

        instance.stopListening(instance);
      });

      it('has a current state', function () {
        expect(instance.getCurrentState()).to.be.ok();
      });

      it('has a initial state', function () {
        expect(instance.getInitialState()).to.be('initial');
      });

      it('initialize with the init state', function () {
        expect(instance.getCurrentState()).to.be(instance.getInitialState());
      });

      it('start from a init state', function () {
        expect(instance.onEnterStateInitial.calledOnce).to.be(true);
      });

      describe('when state changes', function () {

        it('trigger an enter event', function () {
          instance.transitionTo('foo');
          expect(instance.onEnterStateFoo.calledOnce).to.be(true);
        });
      });

      describe('when attempts changing to invalid state', function () {

        beforeEach(function () {
          instance.transitionTo('foo');
          instance.onEnterStateInitial.reset();
        });

        it('triggers no event', function () {
          instance.transitionTo('initial');
          expect(instance.onEnterStateInitial.calledOnce).to.be(false);
        });
      });
    });


  });


});

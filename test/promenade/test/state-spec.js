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
            this.listenTo(this, 'enter:foo', this.onFooEnter);
            this.listenTo(this, 'enter:initial', this.onInitialEnter);

            this._ensureState();
          },

          states: {
            initial: {
              transitionTo: ['foo']
            },
            foo: {}
          },

          onFooEnter: $.noop,
          onInitialEnter: $.noop
        });

        sinon.spy(MyClass.prototype, 'onFooEnter');
        sinon.spy(MyClass.prototype, 'onInitialEnter');

        instance = new MyClass();
      });

      afterEach(function () {
        MyClass.prototype.onFooEnter.restore();
        MyClass.prototype.onInitialEnter.restore();

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
        expect(instance.onInitialEnter.calledOnce).to.be(true);
      });

      describe('when state changes', function () {

        it('trigger an enter event', function () {
          instance.transitionTo('foo');
          expect(instance.onFooEnter.calledOnce).to.be(true);
        });
      });

      describe('when attempts changing to invalid state', function () {

        beforeEach(function () {
          instance.transitionTo('foo');
          instance.onInitialEnter.reset();
        });

        it('triggers no event', function () {
          instance.transitionTo('initial');
          expect(instance.onInitialEnter.calledOnce).to.be(false);
        });
      });
    });


  });


});
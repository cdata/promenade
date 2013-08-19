define(['backbone', 'promenade', 'promenade/event'],
       function(Backbone, Promenade, EventApi) {

  describe('Promenade.Event', function() {

    it('is defined', function() {
      expect(Promenade.Event).to.be.ok();
      expect(EventApi).to.be.ok();
    });

    describe('an object with the event API', function() {
      var EventObject;
      var eventObject;

      beforeEach(function() {
        EventObject = Promenade.Object.extend({
          supportedEventMaps: ['self', 'other'],
          events: {
            'self foo': 'onSelfFoo',
            'self bar:baz': 'onSelfBar',
            'other foo': 'onOtherFoo',
            'foo': 'onFoo'
          },
          onSelfFoo: function() {},
          onSelfBar: function() {},
          onOtherFoo: function() {},
          initialize: function() {
            this.other = new Promenade.Object();
            this.delegateEventMaps();
          }
        }).extend(EventApi);

        eventObject = new EventObject();

        sinon.spy(eventObject, 'onSelfFoo');
        sinon.spy(eventObject, 'onOtherFoo');
      });

      afterEach(function() {
        eventObject.onSelfFoo.restore();
        eventObject.onOtherFoo.restore();
        eventObject.undelegateEventMaps();
      });

      it('adds an event map delegation and undelegation interface', function() {
        expect(EventObject.prototype.delegateEventMaps).to.be.a(Function);
        expect(EventObject.prototype.undelegateEventMaps).to.be.a(Function);
      });

      describe('when the event maps are delegated', function() {
        beforeEach(function() {
          eventObject.delegateEventMaps();
        });

        afterEach(function() {
          eventObject.undelegateEventMaps();
        });

        it('creates event maps on the object', function() {
          expect(eventObject.selfEvents).to.be.an(Object);
          expect(eventObject.otherEvents).to.be.an(Object);
        });

        it('organizes event handler declarations into their associated maps', function() {
          expect(eventObject.selfEvents.foo).to.be('onSelfFoo');
          expect(eventObject.selfEvents['bar:baz']).to.be('onSelfBar');
          expect(eventObject.otherEvents.foo).to.be('onOtherFoo');
        });

        it('keeps "unsupported" events in the default events map', function() {
          expect(eventObject.events).to.be.eql({
            foo: 'onFoo'
          });
        });

        describe('multiple times', function() {
          beforeEach(function() {
            eventObject.delegateEventMaps();
          });

          it('does not delegate handlers multiple times', function() {
            eventObject.trigger('foo');
            expect(eventObject.onSelfFoo.callCount).to.be(1);
          });
        });

        describe('and an event is triggered', function() {
          describe('on itself', function() {
            beforeEach(function() {
              eventObject.trigger('foo');
            });

            it('calls the delegated handler appropriately', function() {
              expect(eventObject.onSelfFoo.callCount).to.be(1);
            });
          });

          describe('on a third party', function() {
            beforeEach(function() {
              eventObject.other.trigger('foo');
            });

            it('calls the delegated handler appropriately', function() {
              expect(eventObject.onOtherFoo.callCount).to.be(1);
            });
          });
        });
      });
    });
  });
});


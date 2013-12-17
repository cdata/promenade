define(['backbone', 'promenade', 'promenade/delegation'],
       function(Backbone, Promenade, DelegationApi) {

  describe('Promenade.Delegation', function() {

    it('is defined', function() {
      expect(Promenade.Delegation).to.be.ok();
      expect(DelegationApi).to.be.ok();
    });

    describe('an object with the event API', function() {
      var EventObject;
      var eventObject;

      beforeEach(function() {
        EventObject = Promenade.Object.extend({
          supportedEventMaps: ['self', 'other'],
          events: {
            '#self foo': 'onSelfFoo',
            '#self bar:baz': 'onSelfBar',
            '#other foo': ['onOtherFoo', 'onOtherFoo2'],
            'foo': 'onFoo'
          },
          onSelfFoo: function() {},
          onSelfBar: function() {},
          onOtherFoo: function() {},
          onOtherFoo2: function() {},
          initialize: function() {
            this.other = new Promenade.Object();
            this.activateDelegation();
          }
        }).extend(DelegationApi);

        eventObject = new EventObject();

        sinon.spy(eventObject, 'onSelfFoo');
        sinon.spy(eventObject, 'onOtherFoo');
        sinon.spy(eventObject, 'onOtherFoo2');
      });

      afterEach(function() {
        eventObject.onSelfFoo.restore();
        eventObject.onOtherFoo.restore();
        eventObject.onOtherFoo2.restore();
        eventObject.deactivateDelegation();
      });

      it('adds an event map delegation and undelegation interface', function() {
        expect(EventObject.prototype.activateDelegation).to.be.a(Function);
        expect(EventObject.prototype.deactivateDelegation).to.be.a(Function);
      });

      describe('when the event maps are delegated', function() {
        beforeEach(function() {
          eventObject.activateDelegation();
        });

        afterEach(function() {
          eventObject.deactivateDelegation();
        });

        it('creates event maps on the object', function() {
          expect(eventObject.selfEvents).to.be.an(Object);
          expect(eventObject.otherEvents).to.be.an(Object);
        });

        it('organizes event handler declarations into their associated maps', function() {
          expect(eventObject.selfEvents.foo).to.be('onSelfFoo');
          expect(eventObject.selfEvents['bar:baz']).to.be('onSelfBar');
          expect(eventObject.otherEvents.foo).to.be.eql(['onOtherFoo', 'onOtherFoo2']);
        });

        it('keeps "unsupported" events in the default events map', function() {
          expect(eventObject.events).to.be.eql({
            foo: 'onFoo'
          });
        });

        describe('multiple times', function() {
          beforeEach(function() {
            eventObject.activateDelegation();
          });

          it('does not delegate handlers multiple times', function() {
            eventObject.trigger('foo');
            expect(eventObject.onSelfFoo.callCount).to.be(1);
          });

          describe('and then undelegated', function() {
            beforeEach(function() {
              eventObject.deactivateDelegation();
            });

            it('removes all delegated handlers', function() {
              eventObject.trigger('foo');
              eventObject.other.trigger('foo');

              expect(eventObject.onSelfFoo.callCount).to.be(0);
              expect(eventObject.onOtherFoo.callCount).to.be(0);
              expect(eventObject.onOtherFoo2.callCount).to.be(0);
            });
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

            describe('that has multiple handlers registered', function() {
              it('calls them both', function() {
                expect(eventObject.onOtherFoo.callCount).to.be(1);
                expect(eventObject.onOtherFoo2.callCount).to.be(1);
              });

              it('calls them in order', function() {
                expect(eventObject.onOtherFoo.calledBefore(eventObject.onOtherFoo2)).to.be(true);
              });
            });
          });
        });
      });
    });
  });
});


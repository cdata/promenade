define(['backbone', 'promenade', 'promenade/collection/subset'],
       function(Backbone, Promenade, SubsetApi) {

  describe('Promenade.Collection.Subset', function() {

    it('is defined', function() {
      console.log(Promenade.Collection, SubsetApi);
      expect(Promenade.Collection.Subset).to.be.ok();
      expect(SubsetApi).to.be.ok();
    });

    describe('when there is a collection', function() {
      var superset;

      beforeEach(function() {
        superset = new Promenade.Collection();
        for (var i = 0; i < 10; ++i) {
          superset.add({ id: i });
        }
      });

      describe('and a subset is requested', function() {
        var subset;

        beforeEach(function() {
          subset = superset.subset(function(model) {
            return window.parseInt(model.id, 10) > 4;
          });
        });

        it('yields an empty collection of the same type', function() {
          expect(subset).to.be.a(superset.constructor);
          expect(subset.length).to.be(0);
        });

        it('does not damage the superset', function() {
          expect(superset.length).to.be(10);
        });

        describe('and it is connected to the superset', function() {
          var connection;

          beforeEach(function() {
            connection = subset.connect();
          });

          afterEach(function() {
            connection.release();
          });

          it('is connected', function() {
            expect(subset.isConnected()).to.be(true);
          });

          it('is populated with items from the superset that match the filter', function() {
            expect(subset.length).to.be(5);
            expect(subset.iterator(subset.at(0))).to.be(true);
          });

          it('yields a connection reference', function() {
            expect(connection).to.be.ok();
          });

          describe('and a connection is released multiple times', function() {
            var otherConnection;

            beforeEach(function() {
              otherConnection = subset.connect();
            });

            afterEach(function() {
              otherConnection.release();
            });

            it('does not cause the subset to disconnect', function() {
              otherConnection.release();
              otherConnection.release();
              otherConnection.release();

              expect(subset.isConnected()).to.be(true);
            });
          });

          describe('and the last connection is released', function() {
            beforeEach(function() {
              connection.release();
            });

            it('disconnects and resets the subset', function() {
              expect(subset.isConnected()).to.be(false);
              expect(subset.length).to.be(0);
            });
          });

          describe('and an item is created on the subset', function() {
            it('creates the item on the superset');
          });

          describe('and fetch is called on the subset', function() {
            it('calls fetch on the superset instead');
          });

          describe('and items are added to the subset', function() {
            it('adds items to the superset', function() {
              subset.add({ id: 11 });

              expect(superset.length).to.be(11);
              expect(subset.length).to.be(6);
              expect(superset.get(11)).to.be(subset.get(11));
            });
          });

          describe('and items are removed from the subset', function() {
            it('removes items from the superset', function() {
              var modelFive = subset.get(5);

              expect(superset.at(5)).to.be(modelFive);
              expect(subset.at(0)).to.be(modelFive);

              subset.remove(5);

              expect(superset.at(5)).to.not.be(modelFive);
              expect(superset.length).to.be(9);
              expect(subset.at(0)).to.not.be(modelFive);
              expect(subset.length).to.be(4);
            });
          });

          describe('and items are added to the superset', function() {
            describe('that match the subset', function() {
              it('adds items to the subset', function() {
                superset.add({ id: 11 });

                expect(subset.length).to.be(6);
                expect(superset.length).to.be(11);
                expect(subset.at(5)).to.be(superset.at(10));
              });
            });

            describe('that do not match the subset', function() {
              it('does not add items to the subset', function() {
                var model;

                superset.add({ id: -1 });

                model = superset.get(-1);

                expect(subset.length).to.be(5);
                expect(superset.length).to.be(11);
                expect(subset.contains(model)).to.be(false);
                expect(superset.contains(model)).to.be(true);
              });
            });
          });

          describe('and items are removed from the superset', function() {
            describe('that match the subset', function() {
              it('removes items from the subset', function() {
                var fiveModel = superset.get(5);

                superset.remove(5);

                expect(superset.contains(fiveModel)).to.be(false);
                expect(subset.contains(fiveModel)).to.be(false);
                expect(subset.length).to.be(4);
              });
            });

            describe('that do not match the subset', function() {
              it('does not remove items from the subset', function() {
                var fourModel = superset.get(4);

                superset.remove(4);

                expect(superset.contains(fourModel)).to.be(false);
                expect(superset.length).to.be(9);
                expect(subset.length).to.be(5);
              });
            });
          });
        });
      });
    });
  });
});

define(['backbone', 'promenade', 'promenade/inflector'],
  function (Backbone, Promenade, InflectorApi) {
    'use strict';

    describe('Promenade.Inflector', function () {
      it('is defined', function () {
        expect(Promenade.Inflector).to.be.ok();
        expect(InflectorApi).to.be.ok();
      });

      describe('an object with the inflector api', function () {
        var InflectorObject;
        var inflectorObject;

        beforeEach(function () {
          InflectorObject = Promenade.Object.extend().extend(InflectorApi);
          inflectorObject = new InflectorObject();
        });

        it('adds pluralize function', function () {
          expect(InflectorObject.prototype.pluralize).to.be.a(Function);
        });

        it('adds addIrregular function', function () {
          expect(InflectorObject.prototype.addIrregular).to.be.a(Function);
        });

        it('can properly pluralize', function () {
          expect(inflectorObject.pluralize('word')).to.eql('words');
          expect(inflectorObject.pluralize('witch')).to.eql('witches');
        });

        it('can properly handle irregular pluralization', function () {
          expect(inflectorObject.pluralize('person', 2)).to.eql('people');
        });

        it('can properly handle uncountable words', function () {
          expect(inflectorObject.pluralize('sheep', 2)).to.be.eql('sheep');
        });

        it('can properly handle non-integer count', function () {
          expect(inflectorObject.pluralize('Cat', 1.1)).to.be.eql('Cats');
        });

        it('can custom plural form for a word', function () {
          inflectorObject.addIrregular('foo', 'bar');
          expect(inflectorObject.pluralize('foo')).to.be.eql('bar');
        });

        describe('when count is equal or less than 1', function () {
          it('does not pluralize', function () {
            expect(inflectorObject.pluralize('word', 1)).to.be.eql('word');
            expect(inflectorObject.pluralize('word', 0.9)).to.be.eql('word');
            expect(inflectorObject.pluralize('word', 0)).to.be.eql('word');
            expect(inflectorObject.pluralize('word', -1)).to.be.eql('word');
          });
        });

      });
    });
  }
);
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
          InflectorObject = Promenade.Object.extend(InflectorApi);
          inflectorObject = new InflectorObject();
        });

        it('adds singularize method', function () {
          expect(inflectorObject.singularize).to.be.a(Function);
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

        it('can properly singularize', function () {
          expect(inflectorObject.singularize('letters')).to.eql('letter');
          expect(inflectorObject.singularize('zombies')).to.eql('zombie');
        });

        it('can properly handle irregular singularization', function () {
          expect(inflectorObject.singularize('kine')).to.eql('cow');
        });

        it('can properly handle irregular pluralization', function () {
          expect(inflectorObject.pluralize('person', 2)).to.eql('people');
        });

        it('can properly handle uncountable words', function () {
          expect(inflectorObject.pluralize('sheep', 2)).to.be.eql('sheep');
          expect(inflectorObject.singularize('rice')).to.be.eql('rice');
        });

        it('can properly handle non-integer count', function () {
          expect(inflectorObject.pluralize('Cat', 1.1)).to.be.eql('Cats');
        });

        it('can customize the plural form of a word', function () {
          inflectorObject.addIrregular('foo', 'bar');
          expect(inflectorObject.pluralize('foo')).to.be.eql('bar');
          expect(inflectorObject.singularize('bar')).to.be.eql('foo');
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

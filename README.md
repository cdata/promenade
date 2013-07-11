# Promenade

Promenade is a Backbone++ MVC framework, intended to support the rapid development of single-page JavaScript applications. It builds upon Backbone's provided classes, while following closely to Backbone semantics and staying as minimal and declarative as possible. It is relatively more prescriptive than Backbone with the goal of establishing stronger, oft-rewritten conventions in some core areas.

## Features & characteristics

 - Built for an AMD module pipeline

### Application

 - Extends and enhances Backbone.Router
 - Named controllers are associated with an application
 - Declared routes are associated with named controllers
 - Controller construct includes basic inheritance

### View

 - Template rendering baked-in, just declare a template name
 - Declare regions via a layout map
 - Region-based subview handling
 - Subview-sensitive event delegation and re-rendering
 - Declarable model events

### CollectionView

 - Automatically handles rendering and updating of collections
 - Configurable 'collectionContainer' layout region

### Model

 - Automatic submodel / subcollection creation and serialization

## Building

Promenade's build and testing steps depend on `node`, `npm`, `bower` and `grunt`.

In order to bootstrap your environment to build Promenade, please run:

```sh
npm install
bower install
```

To build the libraries, please run:

```sh
grunt build
```

## Testing

In order to run Promenade tests, please run:

```sh
grunt test
```

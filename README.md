# Promenade

Promenade is a Backbone++ MVC framework, intended to support the rapid development of single-page JavaScript applications. It builds upon Backbone's provided classes, while following closely to Backbone semantics and staying as minimal and declarative as possible. It is relatively more prescriptive than Backbone with the goal of establishing stronger, oft-rewritten conventions in some core areas.

## Features & characteristics

 - Built for an AMD pipeline, includes deployable builds for non-AMD projects.

### Application

 - Extends and enhances Backbone.Router
 - Declared controllers define supported routes internally
 - Controllers furnished with an app reference upon instantiation
 - Automatic distribution of namespaced embedded references

### View

 - Template rendering baked-in, just declare a template name
 - Declare regions via a layout map
 - Region-based subview handling
 - Subview-, render- and attachment-sensitive event delegation
 - Declarable model events, and self events

### CollectionView

 - Automatically handles rendering and updating of collections
 - Configurable 'outlet' layout region to contain collection item views

### Model

 - Automatic submodel / subcollection creation and serialization
 - Support for embedded references when paired with an Application

## Collection

 - Adapted to always return an interstitial model when looked up by ``id``
 - Namespacing support for automatic handling of namespaced response data
 - Create 'subset' collections which reflect a strongly-linked filtered subset of the parent

## Building

Promenade's build and testing steps depend on `node`, `npm`, `bower` and `grunt`.

In order to bootstrap your environment to build Promenade and related documentation, please run:

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

# Promenade

Promenade is a Backbone++ MVC framework, intended to support the rapid development of single-page JavaScript applications. It builds upon Backbone's provided classes, while following closely to Backbone semantics and staying as minimal and declarative as possible. It is relatively more prescriptive than Backbone with the goal of establishing stronger, oft-rewritten conventions in some core areas.

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

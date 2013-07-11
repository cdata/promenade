# View

Promenade.View has all of the functionality of Backbone.View, but come with built-in conventions for handling templates, regions, model events, subviews and rendering. Promenade.View transparently supports using Backbone.View instances as subviews.

## template

If a `template` property is declared, the view will look up the template by name on whatever module is defined as `templates`. The `templates` module is expected to be a map of template names to template compilation functions.

## modelEvents

A `modelEvents` property (similar in convention to the `events` property of Backbone.View) can be declared. In the `modelEvents` map, keys are event names, and values are the string name of methods on the view to call when the associated named events are triggered.

## layout

The `layout` is a map of region names to css selectors that can be used to find the regions in the DOM. Regions defined in the layout are used when appending subviews to the view. By default, a region named `self` is defined that references the views root element.

## getModel

This method returns the canonical model of view. It will use the `model` property by default, and alternatively will attempt to use the `collection` property if no model is available.

## serializeModelData

A new method, `serializeModelData`, is available on Promenade.View. This method is called whenever the declared `template`, if any, is about to be rendered. The returned object is passed to the template function.

## setSubview

The `setSubview` method creates an association between a layout region and a subview instance. If the region already contains a view, the view is detached. If the parent view has been rendered, the subview will be rendered and inserted into the named region. If no region is specified, the region defaults to 'self'.

## deepRender

Subviews are automatically detached and re-inserted during a render step. If a recursive render is desired, the `deepRender` will re-render the view and all subviews.

If you know that your view implementation should never render its subviews more than once, you can override `deepRender` to simply call `render` with no arguments.


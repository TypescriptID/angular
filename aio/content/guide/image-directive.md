# Getting started with NgOptimizedImage

<div class="alert is-important">

The `NgOptimizedImage` directive is available for [developer preview](https://angular.io/guide/releases#developer-preview).
It's ready for you to try, but it might change before it is stable.

</div>

The `NgOptimizedImage` directive makes it easy to adopt performance best practices for loading images.

The `NgOptimizedImage` directive ensures that the loading of the [Largest Contentful Paint](http://web.dev/lcp) image is prioritized by:

*   Automatically setting the `fetchpriority` attribute on the `<img>` tag
*   Lazy loading other images by default
*   Asserting that there is a corresponding preconnect link tag in the document head

In addition to optimizing the loading of the LCP image, `NgOptimizedImage` enforces a number of image best practices:

*   Using [image URLs to apply image optimizations](https://web.dev/image-cdns/#how-image-cdns-use-urls-to-indicate-optimization-options)
*   Requires that `width` and `height` are set
*   Warns if `width` or `height` have been set incorrectly
*   Warns if the image will be visually distorted when rendered

## Prerequisites

You will need to import the directive into your application. In addition, you will need to set up an image loader. These steps are explained in the [Setting up `NgOptimizedImage`](/guide/image-directive-setup) tutorial.

## Usage in a template

### Overview

To activate the `NgOptimizedImage` directive, replace your image's `src` attribute with `ngSrc`.

<code-example format="typescript" language="typescript">

&lt;img ngSrc="cat.jpg" width="400" height="200"&gt;

</code-example>

The built-in third-party loaders prepend a shared base URL to `src`. If you're using one of these loaders (or any other loader that does this), make sure to omit the shared base URL path from `src` to prevent unnecessary duplication.

You must also set the `width` and `height` attributes. This is done to prevent [image-related layout shifts](https://web.dev/css-web-vitals/#images-and-layout-shifts).  The `width` and `height` attributes should reflect the [intrinsic size](https://developer.mozilla.org/en-US/docs/Glossary/Intrinsic_Size) of the image. During development, the `NgOptimizedImage` warns if it detects that the `width` and `height` attributes have been set incorrectly.

### Marking images as `priority`

Always mark the [LCP image](https://web.dev/lcp/#what-elements-are-considered) on your page as `priority` to prioritize its loading.

<code-example format="typescript" language="typescript">

&lt;img ngSrc="cat.jpg" width="400" height="200" priority&gt;

</code-example>

Marking an image as `priority` applies the following optimizations:

*   Sets `fetchpriority=high` (read more about priority hints [here](https://web.dev/priority-hints))
*   Sets `loading=eager` (read more about native lazy loading [here](https://web.dev/browser-level-image-lazy-loading))

Angular displays a warning during development if the LCP element is an image that does not have the `priority` attribute. A page’s LCP element can vary based on a number of factors - such as the dimensions of a user's screen. A page may have multiple images that should be marked `priority`. See [CSS for Web Vitals](https://web.dev/css-web-vitals/#images-and-largest-contentful-paint-lcp) for more details.

### Adding resource hints

You can add a [`preconnect` resource hint](https://web.dev/preconnect-and-dns-prefetch) for your image origin to ensure that the LCP image loads as quickly as possible. Always put resource hints in the `<head>` of the document.

<code-example format="html" language="html">

&lt;link rel="preconnect" href="https://my.cdn.origin" /&gt;

</code-example>

By default, if you use a loader for a third-party image service, the `NgOptimizedImage` directive will warn during development if it detects that there is no `preconnect` resource hint for the origin that serves the LCP image.

To disable these warnings, add `{ensurePreconnect: false}` to the arguments passed to the provider factory for your chosen image service:

<code-example format="typescript" language="typescript">

providers: [
  provideImgixLoader('https://my.base.url', {ensurePreconnect: false})
],

</code-example>

### Using `fill` mode

In cases where you want to have an image fill a containing element, you can use the `fill` attribute. This is often useful when you want to achieve a "background image" behavior, or when you don't know the exact width and height of your image.

When you add the `fill` attribute to your image, you do not need and should not include a `width` and `height`, as in this example:

<code-example format="typescript" language="typescript">

&lt;img ngSrc="cat.jpg" fill&gt;

</code-example> 

### Adjusting image styling

Depending on the image's styling, adding `width` and `height` attributes may cause the image to render differently. `NgOptimizedImage` warns you if your image styling renders the image at a distorted aspect ratio.

You can typically fix this by adding `height: auto` or `width: auto` to your image styles. For more information, see the [web.dev article on the `<img>` tag](https://web.dev/patterns/web-vitals-patterns/images/img-tag).

### Handling `srcset` attributes

Defining a [`srcset` attribute](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/srcset) ensures that the browser requests an image at the right size for your user's viewport, so it doesn't waste time downloading an image that's too large. 'NgOptimizedImage' generates an appropriate `srcset` for the image, based on the presence and value of the [`sizes` attribute](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/sizes) on the image tag.

#### Fixed-size images

If your image should be "fixed" in size  (i.e. the same size across devices, except for [pixel density](https://web.dev/codelab-density-descriptors/)), there is no need to set a `sizes` attribute. A `srcset` can be generated automatically from the image's width and height attributes with no further input required. 

Example srcset generated: `<img ... srcset="image-400w.jpg 1x, image-800w.jpg 2x">`

#### Responsive images

If your image should be responsive (i.e. grow and shrink according to viewport size), then you will need to define a [`sizes` attribute](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/sizes) to generate the `srcset`.

If you haven't used `sizes` before, a good place to start is to set it based on viewport width. For example, if your CSS causes the image to fill 100% of viewport width, set `sizes` to `100vw` and the browser will select the image in the `srcset` that is closest to the viewport width (after accounting for pixel density). If your image is only likely to take up half the screen (ex: in a sidebar), set `sizes` to `50vw` to ensure the browser selects a smaller image. And so on.

If you find that the above does not cover your desired image behavior, see the documentation on [advanced sizes values](#advanced-sizes-values).

By default, the responsive breakpoints are:

`[16, 32, 48, 64, 96, 128, 256, 384, 640, 750, 828, 1080, 1200, 1920, 2048, 3840]`

If you would like to customize these breakpoints, you can do so using the `IMAGE_CONFIG` provider:

<code-example format="typescript" language="typescript">
providers: [
  {
    provide: IMAGE_CONFIG,
    useValue: {
      breakpoints: [16, 48, 96, 128, 384, 640, 750, 828, 1080, 1200, 1920]
    }
  },
],
</code-example>

If you would like to manually define a `srcset` attribute, you can provide your own directly, or use the `ngSrcset` attribute:

<code-example format="html" language="html">

&lt;img ngSrc="hero.jpg" ngSrcset="100w, 200w, 300w"&gt;

</code-example>

If the `ngSrcset` attribute is present, `NgOptimizedImage` generates and sets the `srcset` using the configured image loader. Do not include image file names in `ngSrcset` - the directive infers this information from `ngSrc`. The directive supports both width descriptors (e.g. `100w`) and density descriptors (e.g. `1x`) are supported.

<code-example format="html" language="html">

&lt;img ngSrc="hero.jpg" ngSrcset="100w, 200w, 300w" sizes="50vw"&gt;

</code-example>

### Disabling automatic srcset generation

To disable srcset generation for a single image, you can add the `disableOptimizedSrcset` attribute on the image:

<code-example format="html" language="html">

&lt;img ngSrc="about.jpg" disableOptimizedSrcset&gt;

</code-example>

### Disabling image lazy loading

By default, `NgOptimizedImage` sets `loading=lazy` for all images that are not marked `priority`. You can disable this behavior for non-priority images by setting the `loading` attribute. This attribute accepts values: `eager`, `auto`, and `lazy`. [See the documentation for the standard image `loading` attribute for details](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/loading#value).

<code-example format="html" language="html">

&lt;img ngSrc="cat.jpg" width="400" height="200" loading="eager"&gt;

</code-example>

### Advanced 'sizes' values

You may want to have images displayed at varying widths on differently-sized screens. A common example of this pattern is a grid- or column-based layout that renders a single column on mobile devices, and two columns on larger devices. You can capture this behavior in the `sizes` attribute, using a "media query" syntax, such as the following:

<code-example format="html" language="html">

&lt;img ngSrc="cat.jpg" width="400" height="200" sizes="(max-width: 768px) 100vw, 50vw"&gt;

</code-example>

The `sizes` attribute in the above example says "I expect this image to be 100 percent of the screen width on devices under 768px wide. Otherwise, I expect it to be 50 percent of the screen width.

For additional information about the `sizes` attribute, see [web.dev](https://web.dev/learn/design/responsive-images/#sizes) or [mdn](https://developer.mozilla.org/en-US/docs/Web/API/HTMLImageElement/sizes).

<!-- links -->

<!-- external links -->

<!--end links -->

@reviewed 2022-08-25

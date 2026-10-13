@gmb/bitmark-playground
================

![Deploy](https://github.com/getMoreBrain/bitmark-playground/actions/workflows/deploy-pages.yml/badge.svg)

A web playground for parsing and generating bitmark

[Try out bitmark - visit the bitmark Playground](https://getmorebrain.github.io/bitmark-playground/)

Features:
- Convert bitmark to JSON, and vice-versa.
- Editing help from the parser: diagnostics, hover, and completion — choosing a bit type after `[.` inserts the bit's template (its usual tags, body and card structure) as a snippet.
- Search the whole playground with Ctrl+F (Cmd+F on macOS): every pane on screen is searched in full, with a match count per pane; Enter / Shift+Enter step through the active pane's matches, and the linked panes follow to the same bit. Match case, whole word, regular expressions, and (optionally) the hidden tabs too. Ctrl+F again in the search box opens the browser's own find. Each pane also keeps its own find/replace (Ctrl+H, F3).

## The editors as a package

The playground's bitmark and JSON editors are also a framework-agnostic
package, developed in
[getMoreBrain/bitmark-editor](https://github.com/getMoreBrain/bitmark-editor):

- [`@gmb/bitmark-editor`](https://www.npmjs.com/package/@gmb/bitmark-editor): the core,
  custom elements, a React adapter, and a CDN-ready `/bundled` build;
- `@gmb/bitmark-editor-angular`: Angular components.

The playground uses the published `@gmb/bitmark-editor` from npm.

> Send changes to [getMoreBrain/bitmark-editor](https://github.com/getMoreBrain/bitmark-editor).



## Available Scripts

In the project directory, you can run:

### `bun start`

Runs the app in the development mode.\
Open [http://localhost:3010](http://localhost:3010) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `bun test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `bun run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.



## Basic Usage





## License

This open source software is licenced under the [ISC licence](https://opensource.org/license/isc-license-txt).



## Available Scripts

In the project directory, you can run:

### `bun start`

Runs the app in the development mode.\
Open [http://localhost:3010](http://localhost:3010) to view it in the browser.

The page will reload if you make edits.\
You will also see any lint errors in the console.

### `bun test`

Launches the test runner in the interactive watch mode.\
See the section about [running tests](https://facebook.github.io/create-react-app/docs/running-tests) for more information.

### `bun run build`

Builds the app for production to the `build` folder.\
It correctly bundles React in production mode and optimizes the build for the best performance.

The build is minified and the filenames include the hashes.\
Your app is ready to be deployed!

See the section about [deployment](https://facebook.github.io/create-react-app/docs/deployment) for more information.

### `bun run eject`

**Note: this is a one-way operation. Once you `eject`, you can’t go back!**

If you aren’t satisfied with the build tool and configuration choices, you can `eject` at any time. This command will remove the single build dependency from your project.

Instead, it will copy all the configuration files and the transitive dependencies (webpack, Babel, ESLint, etc) right into your project so you have full control over them. All of the commands except `eject` will still work, but they will point to the copied scripts so you can tweak them. At this point you’re on your own.

You don’t have to ever use `eject`. The curated feature set is suitable for small and middle deployments, and you shouldn’t feel obligated to use this feature. However we understand that this tool wouldn’t be useful if you couldn’t customize it when you are ready for it.

## Learn More

You can learn more in the [Create React App documentation](https://facebook.github.io/create-react-app/docs/getting-started).

To learn React, check out the [React documentation](https://reactjs.org/).

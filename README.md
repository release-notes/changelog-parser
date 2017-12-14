# Release Notes Changelog Parser

[![Subscribe to Release Notes](https://release-notes.com/badges/v1.svg)](https://release-notes.com/@release-notes/changelog-parser)

## About

The changelog parser reads changelog.md files and derivatives and converts them to
release notes objects with a standardized schema.
This allows further processing of changelog files and provides an unified access to information
on version and even atomic modification level.

## Installation

```bash
$ yarn add @release-notes/changelog-parser
$ npm i --save @release-notes/changelog-parser
```

## Usage

```js
const changelogParser = require('@release-notes/changelog-parser');
const fs = require('fs');

const changelog = fs.readFileSync('./CHANGELOG.md');
const releaseNotes = changelogParser.parse(changelog);
const json = releaseNotes.toJSON();
```

The changelog parser returns an instance of [ReleaseNotes](https://github.com/release-notes/release-notes-node/lib/models/ReleaseNotes.js).

---

### LICENSE

The files in this archive are released under MIT license.
You can find a copy of this license in [LICENSE](LICENSE).

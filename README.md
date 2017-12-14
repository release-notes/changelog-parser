# Release Notes Changelog Parser

[![Subscribe to Release Notes](https://release-notes.com/badges/v1.svg)](https://release-notes.com/@release-notes/changelog-parser)

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


```

---

### LICENSE

The files in this archive are released under MIT license.
You can find a copy of this license in [LICENSE](LICENSE).

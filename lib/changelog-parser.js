const Release = require('@release-notes/node/lib/models/Release');
const ReleaseNotes = require('@release-notes/node/lib/models/ReleaseNotes');

const MODIFICATION_TYPE_MAP = {
  security: 'secured',
  updated: 'changed',
  improvements: 'improved',
  'new features': 'added',
  'bug fixes': 'fixed',
  new: 'added',
  'new!!!': 'added',
};
const LINK_REGEX = /^\[([^\]]+)]:\s*(.+)$/;
const RELEASE_HEADER_REGEX = /^\[?([\w\d.-]+\.[\w\d.-]+[a-zA-Z0-9]|Unreleased|Upcoming|Next)]?(?:\s*[^\w(]+\s*(?:\((.+)\)|(.+)))?$/;
const MODIFICATION_LIST_SPLIT_REGEX = /^-\s|^\*\s|\n+-\s|\n+\*\s/m;

function getParentContext(context, section) {
  if (context.isRoot || context.level < section.level) {
    return context;
  }

  // context h1 section h2 -> return h1
  // context h2 section h1 -> root
  // contect h1 section h3 -> return h1
  // context h3 section h1 -> h

  let ctx = context;
  while (ctx.level && ctx.level >= section.level) {
    ctx = ctx.parent;
  }

  return ctx;
}

function parseModificationType(modification) {
  let modificationType = 'changed';

  if (modification.match(/^add/i)) {
    modificationType = 'added';
  } else if (modification.match(/^fix/i)) {
    modificationType = 'fixed';
  } else if (modification.match(/^improve/i)) {
    modificationType = 'improved';
  }

  return modificationType;
}

function buildTree(markdown) {
  const lines = markdown.split('\n');
  const tree = {
    isRoot: true,
    level: 0,
    children: [],
    content: '',
    links: {},
  };
  let context = tree.children;
  context.parent = tree;
  context.root = tree;
  context.content = '';
  context.children = [];

  lines.forEach((line) => {
    const trimmedLine = line.trim();

    if (trimmedLine[0] === '#') {
      if (trimmedLine.startsWith('# ')) {
        const section = {
          title: trimmedLine.substr(2),
          level: 1,
          children: [],
          content: '',
          parent: tree,
        };
        tree.children.push(section);
        context = section;
      } else if (trimmedLine.startsWith('## ')) {
        const section = {
          title: trimmedLine.substr(3),
          level: 2,
          content: '',
          children: [],
        };
        section.parent = getParentContext(context, section);
        section.parent.children.push(section);
        context = section;
      } else if (trimmedLine.startsWith('### ')) {
        const section = {
          title: trimmedLine.substr(4),
          level: 3,
          content: '',
          children: [],
        };
        section.parent = getParentContext(context, section);
        section.parent.children.push(section);
        context = section;
      } else if (trimmedLine.startsWith('#### ')) {
        const section = {
          title: trimmedLine.substr(5),
          level: 3,
          content: '',
          children: [],
        };
        section.parent = getParentContext(context, section);
        section.parent.children.push(section);

        context = section;
      } else {
        console.warn('Cannot handle title line. Treat it as normal content.', line);
        context.content += `${trimmedLine}\n`;
      }
    } else if (trimmedLine[0] === '[') {
      const link = trimmedLine.match(LINK_REGEX);

      if (link) {
        tree.links[link[1]] = link[2];
      }
    } else {
      context.content += `${line}\n`;
    }
  });

  return tree;
}

function parseModifications(nodes) {
  const parsedModifications = [];

  nodes.forEach((modificationNode) => {
    let modificationType = (modificationNode.title || '').toLowerCase();
    if (modificationType in MODIFICATION_TYPE_MAP) {
      modificationType = MODIFICATION_TYPE_MAP[modificationType];
    }
    const isKnownModificationType = Release.MODIFICATION_TYPES.includes(modificationType);
    const modifications = (modificationNode.content || '').split(MODIFICATION_LIST_SPLIT_REGEX);

    modifications.forEach((modification) => {
      const trimmedModification = modification.trim();

      if (trimmedModification) {
        if (isKnownModificationType) {
          parsedModifications.push({ type: modificationType, modification: {
            title: trimmedModification,
          }});
        } else {
          const tag = modificationType;

          const parsedModificationType = parseModificationType(trimmedModification);
          parsedModifications.push({ type: parsedModificationType, modification: {
            title: trimmedModification,
            tags: [tag],
          }});
        }
      }
    });
  });

  return parsedModifications;
}

function parseReleases(nodes) {
  const releases = [];

  nodes.forEach((releaseNode) => {
    const parsedTitle = releaseNode.title && releaseNode.title.match(RELEASE_HEADER_REGEX);

    if (parsedTitle) {
      const parsedVersion = parsedTitle[1];
      const parsedDate = parsedTitle[2] || parsedTitle[3] || null;
      const releaseDate = new Date(parsedDate);
      let releaseDescription = (releaseNode.content || '').trim();
      let releaseTitle = '';
      const releaseDescriptionLines = releaseDescription.split('\n');

      if (releaseDescriptionLines[0].startsWith('**') && releaseDescriptionLines[0].endsWith('**')) {
        releaseTitle = releaseDescriptionLines.shift().replace(/\*/g, '');
      }

      const release = new Release({
        version: parsedVersion,
        description: releaseDescriptionLines.join('\n').trim(),
        title: releaseTitle,
      });

      if (releaseDate && !['Unreleased', 'Upcoming', 'Next'].includes(parsedVersion)) {
        release.date = releaseDate === 'Invalid Date' ? (new Date(0)).toISOString() : releaseDate.toISOString();
      }

      const modifications = parseModifications(releaseNode.children || []);
      modifications.forEach(modification => release.addModification(modification.type, modification.modification));

      releases.push(release);
    } else {
      console.warn('Unable to parse version and date from release', releaseNode.title);
    }
  });

  return releases;
}

function parse(markdown) {
  if (/^# |^## /gm.test(markdown) === false && /^=+$|^-+$/gm.test(markdown)) {
    markdown = markdown.replace(/^(.+)\s+(^=+$|^-+$)/mg, '## $1');
  }

  const tree = buildTree(markdown);
  const releaseNotesNode = tree.children[0] || tree.children || {};

  const releaseNotes = new ReleaseNotes({
    title: releaseNotesNode.title,
    description: (releaseNotesNode.content || '').trim(),
    releases: parseReleases((releaseNotesNode.children || [])),
  });

  return releaseNotes;
}

module.exports = { parse };

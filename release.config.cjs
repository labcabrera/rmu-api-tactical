// Semantic-release configuration used by `make create-release` (see Makefile).
//
// The next version is derived from Conventional Commits since the last tag:
// BREAKING CHANGE -> major, feat -> minor, anything else -> patch.
// Set RELEASE_BUMP=patch|minor|major to force a specific bump.

const bump = process.env.RELEASE_BUMP;

if (bump && !['patch', 'minor', 'major'].includes(bump)) {
  throw new Error(`Invalid RELEASE_BUMP '${bump}', expected patch, minor or major`);
}

const releaseRules = bump
  ? [{ release: bump }]
  : [{ breaking: true, release: 'major' }, { type: 'feat', release: 'minor' }, { release: 'patch' }];

module.exports = {
  branches: ['master'],
  tagFormat: '${version}',
  plugins: [
    ['@semantic-release/commit-analyzer', { releaseRules }],
    '@semantic-release/release-notes-generator',
    ['@semantic-release/changelog', { changelogFile: 'CHANGELOG.md' }],
    ['@semantic-release/npm', { npmPublish: false }],
    [
      '@semantic-release/git',
      {
        assets: ['package.json', 'CHANGELOG.md'],
        message: 'chore(release): ${nextRelease.version} [skip ci]',
      },
    ],
  ],
};

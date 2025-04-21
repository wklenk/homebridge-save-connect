export default {
  branches: ['main'],
  plugins: [
    '@semantic-release/commit-analyzer', // analyze commits
    '@semantic-release/release-notes-generator', // generate changelog
    '@semantic-release/changelog', // update CHANGELOG.md
    '@semantic-release/npm', // bump version and publish to npm
    '@semantic-release/github', // create GitHub release
    '@semantic-release/git', // commit package.json and changelog changes
  ],
};
  
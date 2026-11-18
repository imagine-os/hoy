// The version a build reports (/health via dist/release.json, the Hub's badge). Owner decision Q1 (2026-11-18): the
// annotated release tag is the one source of the version, so package.json's "version" no longer has to be bumped.
// The release workflows set RELEASE_TAG to the tag (vX.Y.Z) on the build; without it (local, pull requests, a branch
// deployed to test) the build reports package.json's version. A RELEASE_TAG that is set but not vX.Y.Z stops the build.
export function releaseVersion(env = process.env, packageVersion) {
  const tag = env.RELEASE_TAG;
  if (tag === undefined || tag === '') return packageVersion;
  const m = /^v(\d+\.\d+\.\d+)$/.exec(tag);
  if (!m) throw new Error('RELEASE_TAG must be a release tag vMAJOR.MINOR.PATCH');
  return m[1];
}

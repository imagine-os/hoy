import assert from 'node:assert/strict';
export function localReviewBase(value){
 const url=new URL(value||'');
 assert(url.protocol==='http:'&&['127.0.0.1','localhost','[::1]'].includes(url.hostname)&&url.pathname==='/'&&!url.search&&!url.hash&&!url.username&&!url.password,'review_probe_requires_loopback_origin');
 return url;
}
export function verifyReviewProof(proof,release,expected,project){
 assert(/^[a-f0-9]{40}$/.test(expected||''),'exact_review_commit_required');
 assert(proof?.kind==='review'&&proof.project===project,'review_build_proof_required');
 assert.equal(proof.sourceCommit,expected,'review_build_commit_mismatch');assert.equal(release?.sourceCommit,expected,'review_manifest_commit_mismatch');
}
export function verifyReviewBundle(javascript,project){
 assert(['hoy','petrock'].includes(project),'known_review_project_required');
 const prefix=project==='hoy'?'hoyos':'petrock';
 assert(javascript.includes(prefix+'.session')&&javascript.includes('usr_super'),'review_demo_bundle_required');
}
export function verifyReleaseProof(health,release,expected){
 assert(/^[a-f0-9]{40}$/.test(expected||''),'exact_production_commit_required');
 assert(health?.ok===true&&/^[0-9]+\.[0-9]+\.[0-9]+$/.test(health.version||''),'healthy_release_required');
 assert.equal(health.commit,expected,'production_health_commit_mismatch');assert.equal(release?.sourceCommit,expected,'production_manifest_commit_mismatch');assert.equal(release.version,health.version,'production_release_version_mismatch');
}
export function publishedSite(config,now=Date.now()){
 assert(config?.environment==='production','production_site_required');
 const launch=config.launch||{};
 assert(launch.siteLive===true||(typeof launch.siteLiveAt==='string'&&Number.isFinite(Date.parse(launch.siteLiveAt))&&Date.parse(launch.siteLiveAt)<=now),'published_site_required');
 return true;
}
/** Exact authored metadata; studio contacts/hours stay CMS-owned and are not compared to fallback values. */
export function verifyMeta(actual,expected){
 for(const field of ['title','description','canonical','image','imageAlt'])assert.equal(actual[field],expected[field],'metadata_'+field);
 const values={ogTitle:expected.title,ogDescription:expected.description,ogUrl:expected.canonical,ogType:'website',ogLocale:'es_CO',ogSiteName:'HOY Human Club',twitterCard:'summary_large_image',twitterTitle:expected.title,twitterDescription:expected.description,twitterImage:expected.image,ogWidth:'1200',ogHeight:'630',lang:'es-CO',jsonLdType:'HealthClub'};
 for(const [field,value]of Object.entries(values))assert.equal(actual[field],value,'metadata_'+field);
}

/** Current ring-portrait art contract, mirroring test-finale-imagery-ui rather than the retired arch layout. */
export function verifyFinale(g){
 assert(Math.abs(g.natural-1374/1145)<.002,'current_source_portrait_ratio');assert(Math.abs(g.ratio-g.natural)<.002,'full_artwork_proportions');assert(g.gutter<1,'artwork_fills_frame');assert(g.clear,'CTA_clears_faces_and_rings');assert.equal(g.overlay,'0.2','requested_twenty_percent_blue_wash');assert(typeof g.sectionColor==='string'&&g.sectionColor!=='rgba(0, 0, 0, 0)','source_blue_section_color_required');assert.equal(g.overlayColor,g.sectionColor,'overlay_uses_source_brand_deep_blue');assert.equal(g.overlayPointer,'none','overlay_does_not_block_interaction');assert.equal(g.href,'/horario','canonical_booking_destination');assert.equal(g.fits,true,'CTA_text_fits');
}

const assert=require('node:assert/strict');
const {SECTORS,GEOMETRY:g,scoreAt,randomHit,Match}=require('./game.js');
for(let i=0;i<20;i++){
 const a=i*18*Math.PI/180;
 for(const [radius,multiple] of [[80,1],[200,1],[(g.tripleIn+g.tripleOut)/2,3],[(g.doubleIn+g.doubleOut)/2,2]])assert.equal(scoreAt(Math.sin(a)*radius,-Math.cos(a)*radius).points,SECTORS[i]*multiple);
}
assert.equal(scoreAt(0,0).points,50);assert.equal(scoreAt(0,15).points,25);assert.equal(scoreAt(0,251).points,0);
assert.equal(scoreAt(0,-g.bull).points,50);assert.equal(scoreAt(0,-g.bull-.001).points,25);
assert.equal(scoreAt(0,-g.outerBull-.001).points,20);assert.equal(scoreAt(0,-g.tripleIn).points,60);assert.equal(scoreAt(0,-g.tripleOut-.001).points,20);assert.equal(scoreAt(0,-g.doubleIn).points,40);
for(const kind of [0,.05,.12,.5]){let j=0;const values=[kind,.25,.5];const hit=randomHit(()=>values[j++]);assert.ok(Number.isFinite(hit.x)&&Number.isFinite(hit.y));assert.equal(scoreAt(hit.x,hit.y).points,kind===0?50:kind===.05?25:kind===.12?0:6);}
const match=new Match();for(let i=0;i<20;i++){assert.equal(match.player,i%2);assert.equal(match.round,Math.floor(i/2)+1);assert.equal(match.begin(),true);assert.equal(match.begin(),false);const r=match.land({x:0,y:0});assert.equal(r.points,50);assert.equal(match.land({x:0,y:0}),null);assert.equal(match.begin(),false);assert.equal(match.next(),true);}
assert.deepEqual(match.scores,[500,500]);assert.equal(match.phase,'finished');assert.equal(match.begin(),false);assert.equal(match.next(),false);
const fresh=new Match();assert.deepEqual(fresh.scores,[0,0]);assert.equal(fresh.round,1);
console.log('PASS: all 20 sectors, singles/doubles/triples, bull boundaries, miss, random landing categories, 20 turns, double-click guards, reset.');

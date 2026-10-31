const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function run(file, url, body, argument = '') {
  const calls = [];
  vm.runInNewContext(fs.readFileSync(`${__dirname}/${file}`, 'utf8'), {
    $request: { url }, $response: { body }, $argument: argument,
    $done: value => calls.push(JSON.parse(JSON.stringify(value))),
    $httpClient: { get: (_, callback) => callback('failed https://example.invalid/?token=secret', null) },
  }, { timeout: 1000 });
  assert.equal(calls.length, 1, `${file}: exactly one completion`);
  return calls[0];
}
const amap = 'https://m5.amap.com/ws/valueadded/alimama/splash_screen';
for (const body of ['', '<html>error</html>', '{', '{"data":{"ad":[{}]}}']) run('amap-adblock.js', amap, body);
const ad = {data:{ad:[{set:{setting:{display_time:5}},creative:[{start_time:0,end_time:9}]}]}};
assert.equal(JSON.parse(run('amap-adblock.js', amap, JSON.stringify(ad)).body).data.ad[0].set.setting.display_time, 0);
const order = {order:{promotion:{discount:10}},items:[{sku:'normal',adId:0}]};
assert.deepEqual(run('jd-adblock.js', 'https://api.m.jd.com/client.action?functionId=myOrderInfo', JSON.stringify(order)), {});
const home = {data:{splashAd:[1],normal:[{adId:0}],promotion:{discount:10}}};
const cleaned = JSON.parse(run('jd-adblock.js', 'https://api.m.jd.com/client.action?functionId=getTabHomeInfo', JSON.stringify(home)).body);
assert.equal(cleaned.data.splashAd, undefined);
assert.deepEqual(cleaned.data.normal, home.data.normal);
assert.deepEqual(cleaned.data.promotion, home.data.promotion);
console.log('Response regression checks passed');

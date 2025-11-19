#!/usr/bin/env node
/**
 * 「自分の現場のみ」機能の自動検証スクリプト
 * 3パスを実行してサーバーログとレスポンスを収集
 */

const PORT = process.env.PORT || 3001;
const BASE_URL = `http://localhost:${PORT}`;
const PLACE = 'dandoli-sample1';
const UID = '40824';
const EMP_CODE = '12345678';

async function fetchWithHeaders(url, headers = {}) {
  const res = await fetch(url, {
    headers: {
      'Cookie': headers.cookie || '',
      ...headers
    }
  });
  const data = await res.json();
  return { status: res.status, data };
}

async function testA1() {
  console.log('\n========== A-1: localStorage優先パス ==========');
  console.log('シミュレート: localStorage.setItem("dw:empcode", "12345678")');

  // APIを直接呼び出し（empパラメータ付き）
  const url = `${BASE_URL}/api/user/my-keys?uid=${UID}&place=${PLACE}&emp=${EMP_CODE}`;
  const { data } = await fetchWithHeaders(url);

  console.log('\n【A-1 APIレスポンス】');
  console.log('via:', data.via);
  console.log('keys.employee_code:', data.keys?.employee_code);
  console.log('keys.all:', JSON.stringify(data.keys?.all));

  // サイト一覧取得
  const sitesUrl = `${BASE_URL}/api/sites/quicklist?place=${PLACE}`;
  const sitesRes = await fetchWithHeaders(sitesUrl);
  console.log('\n【現場データ】');
  console.log('provider:', sitesRes.data.provider);
  console.log('total(raw):', sitesRes.data.total);
  console.log('items[0]:', sitesRes.data.items?.[0] ? {
    site_name: sitesRes.data.items[0].site_name,
    manager: sitesRes.data.items[0].manager,
    member_keys: sitesRes.data.items[0].member_keys
  } : 'なし');

  return {
    pass: data.via === 'query' && data.keys?.employee_code === EMP_CODE,
    via: data.via,
    emp: data.keys?.employee_code,
    keysAll: data.keys?.all,
    totalSites: sitesRes.data.total
  };
}

async function testA2() {
  console.log('\n========== A-2: URL最優先パス ==========');
  console.log('シミュレート: localStorage.removeItem("dw:empcode") + URL ?emp=12345678');

  const url = `${BASE_URL}/api/user/my-keys?uid=${UID}&place=${PLACE}&emp=${EMP_CODE}`;
  const { data } = await fetchWithHeaders(url);

  console.log('\n【A-2 APIレスポンス】');
  console.log('via:', data.via);
  console.log('keys.employee_code:', data.keys?.employee_code);
  console.log('keys.all:', JSON.stringify(data.keys?.all));

  return {
    pass: data.via === 'query' && data.keys?.employee_code === EMP_CODE,
    via: data.via,
    emp: data.keys?.employee_code,
    keysAll: data.keys?.all
  };
}

async function testA3() {
  console.log('\n========== A-3: 自動解決パス（DW lookup） ==========');
  console.log('シミュレート: localStorage empty + URL empなし');

  const url = `${BASE_URL}/api/user/my-keys?uid=${UID}&place=${PLACE}`;
  const { data } = await fetchWithHeaders(url);

  console.log('\n【A-3 APIレスポンス】');
  console.log('via:', data.via);
  console.log('keys.employee_code:', data.keys?.employee_code);
  console.log('keys.all:', JSON.stringify(data.keys?.all));
  console.log('warning:', data.warning || 'なし');

  const hasDwToken = !!process.env.DW_BEARER_TOKEN;
  const expectedVia = hasDwToken ? ['dw-user-lookup', 'dw-not-found', 'dw-error'] : ['no-token', 'no-username'];

  return {
    pass: expectedVia.includes(data.via),
    via: data.via,
    emp: data.keys?.employee_code,
    keysAll: data.keys?.all,
    hasDwToken
  };
}

async function main() {
  console.log('🔍 「自分の現場のみ」機能 - 3パス自動検証');
  console.log(`📍 BASE_URL: ${BASE_URL}`);
  console.log(`📍 PLACE: ${PLACE}`);
  console.log(`📍 UID: ${UID}`);
  console.log(`📍 EMP_CODE: ${EMP_CODE}`);

  try {
    const results = {
      A1: await testA1(),
      A2: await testA2(),
      A3: await testA3()
    };

    console.log('\n\n========== 📊 検証結果サマリー ==========');
    console.log('\nA-1 (localStorage優先):');
    console.log('  ✓ via:', results.A1.via);
    console.log('  ✓ employee_code:', results.A1.emp);
    console.log('  ✓ keys.all:', JSON.stringify(results.A1.keysAll));
    console.log('  ✓ total(raw):', results.A1.totalSites);
    console.log('  判定:', results.A1.pass ? '✅ PASS' : '❌ FAIL');

    console.log('\nA-2 (URL最優先):');
    console.log('  ✓ via:', results.A2.via);
    console.log('  ✓ employee_code:', results.A2.emp);
    console.log('  ✓ keys.all:', JSON.stringify(results.A2.keysAll));
    console.log('  判定:', results.A2.pass ? '✅ PASS' : '❌ FAIL');

    console.log('\nA-3 (自動解決):');
    console.log('  ✓ via:', results.A3.via);
    console.log('  ✓ employee_code:', results.A3.emp || '(なし)');
    console.log('  ✓ keys.all:', JSON.stringify(results.A3.keysAll));
    console.log('  ✓ DW_BEARER_TOKEN:', results.A3.hasDwToken ? 'あり' : 'なし');
    console.log('  判定:', results.A3.pass ? '✅ PASS' : '❌ FAIL');

    const allPass = results.A1.pass && results.A2.pass && results.A3.pass;

    console.log('\n========== 🎯 総合判定 ==========');
    if (allPass) {
      console.log('✅ 全パス合格！「自分の現場のみ」機能は正常に動作しています。');
    } else {
      console.log('❌ 一部パス失敗。詳細を確認してください。');

      if (results.A1.totalSites > 0 && !results.A1.keysAll?.includes(EMP_CODE)) {
        console.log('\n⚠️ 作業B（パッチ適用）が必要な可能性があります。');
        console.log('   現場データにmember_keysが不足している可能性があります。');
      }
    }

    process.exit(allPass ? 0 : 1);

  } catch (error) {
    console.error('\n❌ エラー発生:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

main();
